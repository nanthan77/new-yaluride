# Guide: Setting Up a Custom Domain for YALURIDE

This document provides a step-by-step guide for configuring a custom domain for the YALURIDE application running on a Kubernetes cluster (e.g., AWS EKS). It covers DNS configuration, automated SSL/TLS certificate provisioning with Let's Encrypt, and updating the Kubernetes Ingress resource.

---

## 1. Prerequisites

Before you begin, ensure you have the following:

-   **A Registered Domain Name**: You must own the domain you wish to use (e.g., `yaluride.lk`).
-   **Access to Your DNS Provider**: You need to be able to add or modify DNS records for your domain (e.g., GoDaddy, Namecheap, AWS Route 53).
-   **Kubernetes Cluster Access**: You must have `kubectl` access configured for your production Kubernetes cluster.
-   **Helm Installed**: Helm is used to install `cert-manager`. If you don't have it, follow the [official installation guide](https://helm.sh/docs/intro/install/).
-   **An Ingress Controller**: An Ingress controller (like Nginx, Traefik, or AWS Load Balancer Controller) must be running in your cluster. This guide assumes one is already set up and has provisioned an external load balancer.
-   **Load Balancer Address**: You need the external IP address or the DNS name (CNAME) of the load balancer created by your Ingress controller. You can get this by running:
    ```sh
    kubectl get service -n <your-ingress-namespace>
    ```
    Look for the `EXTERNAL-IP` or `HOSTNAME` value of your Ingress controller's service.

---

## 2. DNS Configuration

The first step is to point your custom domain to the Kubernetes cluster's Ingress load balancer.

1.  **Log in to your Domain Registrar's Dashboard**.
2.  Navigate to the DNS management section for your domain.
3.  Create a new DNS record. You will create either an `A` record or a `CNAME` record, depending on what your load balancer provides:

    -   **If you have an External IP Address (A Record)**:
        -   **Type**: `A`
        -   **Host/Name**: `@` (for the root domain `yaluride.lk`) or `www` (for `www.yaluride.lk`)
        -   **Value/Points to**: The external IP address of your load balancer.
        -   **TTL**: Leave as default (usually 1 hour).

    -   **If you have a DNS Hostname (CNAME Record)**:
        -   **Type**: `CNAME`
        -   **Host/Name**: `www` (for `www.yaluride.lk`)
        -   **Value/Points to**: The DNS hostname of your load balancer (e.g., `ab123cde456.ap-south-1.elb.amazonaws.com`).
        -   **TTL**: Leave as default.

    > **Note**: It is generally recommended to use a `www` subdomain with a `CNAME` record if your load balancer has a DNS name, as its IP address can change. For root domains, an `A` record is typically required.

4.  **Save the record**. DNS changes can take some time to propagate globally (from a few minutes to several hours).

---

## 3. SSL/TLS Certificate with Cert-Manager & Let's Encrypt

We will use `cert-manager` to automatically provision and renew free SSL/TLS certificates from Let's Encrypt.

### Step 3.1: Install Cert-Manager

1.  **Add the Jetstack Helm repository**:
    ```sh
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    ```

2.  **Install `cert-manager` into your cluster**:
    It's crucial to install the Custom Resource Definitions (CRDs) first.
    ```sh
    helm install \
      cert-manager jetstack/cert-manager \
      --namespace cert-manager \
      --create-namespace \
      --version v1.14.5 \
      --set installCRDs=true
    ```
    Verify the installation:
    ```sh
    kubectl get pods --namespace cert-manager
    # You should see pods for cert-manager, cainjector, and webhook running.
    ```

### Step 3.2: Create a ClusterIssuer

A `ClusterIssuer` is a Kubernetes resource that tells `cert-manager` how to obtain certificates. We will create one for Let's Encrypt. It's best practice to start with the staging issuer to avoid hitting rate limits, then switch to the production issuer.

1.  **Create a YAML file for the staging issuer (`staging-issuer.yaml`)**:
    ```yaml
    apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    metadata:
      name: letsencrypt-staging
    spec:
      acme:
        # The ACME server URL for Let's Encrypt's staging environment.
        server: https://acme-staging-v02.api.letsencrypt.org/directory
        email: your-email@example.com # IMPORTANT: Replace with your email address
        privateKeySecretRef:
          # Secret resource that will be used to store the ACME account's private key.
          name: letsencrypt-staging-private-key
        # Enable the HTTP-01 challenge provider
        solvers:
        - http01:
            ingress:
              class: nginx # Or your ingress controller class (e.g., 'alb')
    ```

2.  **Apply the staging issuer**:
    ```sh
    kubectl apply -f staging-issuer.yaml
    ```

3.  **Create a YAML file for the production issuer (`production-issuer.yaml`)**:
    ```yaml
    apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    metadata:
      name: letsencrypt-production
    spec:
      acme:
        server: https://acme-v02.api.letsencrypt.org/directory
        email: your-email@example.com # IMPORTANT: Replace with your email address
        privateKeySecretRef:
          name: letsencrypt-production-private-key
        solvers:
        - http01:
            ingress:
              class: nginx # Or your ingress controller class
    ```

4.  **Apply the production issuer**:
    ```sh
    kubectl apply -f production-issuer.yaml
    ```

---

## 4. Ingress Configuration

Now, update your Kubernetes `Ingress` resource to use your custom domain and request a certificate from `cert-manager`.

1.  **Locate your Ingress manifest file** (e.g., `k8s/base/ingress.yaml` or within an overlay).

2.  **Update the Ingress resource**:
    Modify the file to include the `tls` section and the `cert-manager.io/cluster-issuer` annotation.

    -   **Start with the staging issuer for testing.**

    ```yaml
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata:
      name: yaluride-ingress
      namespace: yaluride-production # Or your target namespace
      annotations:
        # IMPORTANT: Use the staging issuer first to avoid rate limits
        cert-manager.io/cluster-issuer: "letsencrypt-staging"
        # For Nginx Ingress Controller, you might need this:
        # nginx.ingress.kubernetes.io/ssl-redirect: "true"
    spec:
      ingressClassName: nginx # Or your ingress class
      tls:
      - hosts:
          - yaluride.lk # Your custom domain
          - www.yaluride.lk # Add any other subdomains
        secretName: yaluride-tls-secret # cert-manager will create this secret with the certificate
      rules:
      - host: yaluride.lk
        http:
          paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                # This should point to your API Gateway or frontend service
                name: api-gateway-service
                port:
                  number: 80
      - host: www.yaluride.lk
        http:
          paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway-service
                port:
                  number: 80
    ```

3.  **Apply the updated Ingress manifest**:
    ```sh
    kubectl apply -f your-ingress-manifest.yaml
    ```

---

## 5. Verification

1.  **Check the Certificate Status**:
    `cert-manager` will now attempt to create a `Certificate` resource and solve the ACME challenge. You can monitor its progress:
    ```sh
    kubectl describe certificate yaluride-tls-secret -n yaluride-production
    ```
    Look at the `Events` section at the bottom. You should see events indicating that the certificate was successfully issued. This can take a few minutes. If it fails, the events will provide clues as to why (e.g., DNS not propagated, Ingress misconfiguration).

2.  **Switch to Production Issuer**:
    Once you have successfully obtained a staging certificate, edit your Ingress manifest and change the `cluster-issuer` annotation to the production one:
    ```yaml
    # In your Ingress metadata.annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-production"
    ```
    Then, re-apply the manifest:
    ```sh
    kubectl apply -f your-ingress-manifest.yaml
    ```
    `cert-manager` will automatically replace the staging certificate with a valid production certificate.

3.  **Test in Browser**:
    Navigate to `https://yaluride.lk` in your browser. You should see a secure connection (a padlock icon) and your application should load correctly.

Your YALURIDE application is now successfully deployed and accessible via a custom domain with a valid SSL/TLS certificate.
