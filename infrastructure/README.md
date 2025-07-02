# YALURIDE Infrastructure & Monitoring Setup

This document provides a comprehensive guide on how to deploy and configure the monitoring and logging stack for the YALURIDE project on a Kubernetes cluster, specifically AWS EKS as defined in `main.tf`.

The guide uses [Helm](https://helm.sh/), the package manager for Kubernetes, to simplify the deployment of complex applications like Prometheus, Grafana, and the EFK stack.

---

## 1. Prerequisites

Before you begin, ensure you have the following command-line tools installed and configured:

-   **kubectl**: The Kubernetes command-line tool. You should have it configured to connect to your EKS cluster. You can configure it by running:
    ```sh
    aws eks --region <your-aws-region> update-kubeconfig --name <your-eks-cluster-name>
    ```
-   **Helm**: The package manager for Kubernetes. You can find installation instructions [here](https://helm.sh/docs/intro/install/).
-   **aws-cli**: The AWS Command Line Interface, required for configuring `kubectl`.

---

## 2. Prometheus & Grafana Deployment (Monitoring)

We will use the `kube-prometheus-stack` Helm chart, which is a community-managed, all-in-one solution that deploys Prometheus for metrics collection, Grafana for visualization, and Alertmanager for handling alerts.

### Step 1: Add the Prometheus Community Helm Repository

First, add the repository that contains the chart:

```sh
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### Step 2: Create a Namespace

It's a best practice to deploy monitoring tools in their own namespace.

```sh
kubectl create namespace monitoring
```

### Step 3: Install the kube-prometheus-stack

Now, install the chart into the `monitoring` namespace.

```sh
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring
```

This command deploys a pre-configured Prometheus instance that automatically discovers and scrapes metrics from your Kubernetes cluster nodes and pods, an Alertmanager instance, and a Grafana instance with pre-built dashboards.

---

## 3. Grafana Configuration & Access

### Step 1: Get the Grafana Admin Password

The default admin password is created as a Kubernetes secret. Retrieve it with the following command:

```sh
kubectl get secret prometheus-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
```

### Step 2: Access the Grafana Dashboard

To access the Grafana UI, you can use `kubectl port-forward` to forward a local port to the Grafana service running in the cluster.

```sh
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
```

Now, open your web browser and navigate to `http://localhost:3000`.

-   **Username**: `admin`
-   **Password**: The password you retrieved in the previous step.

You will be prompted to change the password upon your first login.

### Step 3: Explore Dashboards

The `kube-prometheus-stack` automatically includes several pre-built dashboards for monitoring cluster health, nodes, pods, and deployments. You can find them in the "Dashboards" section.

---

## 4. Logging with EFK Stack (Elasticsearch, Fluentd, Kibana)

For centralized logging, we will deploy the EFK stack. This will allow us to collect, store, and visualize logs from all microservices and the frontend application running in our cluster.

### Step 1: Add the Elastic Helm Repository

```sh
helm repo add elastic https://helm.elastic.co
helm repo update
```

### Step 2: Deploy Elasticsearch

Deploy a single-node Elasticsearch cluster suitable for a staging or development environment. For production, you would need a more resilient configuration.

```sh
# Deploy into the same 'monitoring' namespace or a dedicated 'logging' namespace
helm install elasticsearch elastic/elasticsearch --namespace monitoring \
  --set replicas=1 \
  --set minimumMasterNodes=1
```

### Step 3: Deploy Kibana

Kibana is the visualization tool for Elasticsearch.

```sh
helm install kibana elastic/kibana --namespace monitoring
```

### Step 4: Deploy Fluentd

We will use Fluentd to collect logs. It will be deployed as a `DaemonSet`, meaning one Fluentd pod will run on every node in the cluster to collect logs from all other pods on that node.

```sh
helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

# Install Fluentd
helm install fluentd fluent/fluentd --namespace monitoring \
  --set fluentd.service.type=LoadBalancer \
  --set fluentd.forward.enabled=false \
  --set elasticsearch.enabled=true \
  --set elasticsearch.host=elasticsearch-master \
  --set elasticsearch.port=9200
```

---

## 5. Fluentd/Fluent-bit Configuration

The default Helm chart for Fluentd is configured to collect container logs from `/var/log/containers/*.log` on each node. It automatically parses these logs as JSON and forwards them to the Elasticsearch service (`elasticsearch-master`) we deployed earlier.

For production, you would typically provide a custom `values.yaml` file to the `helm install` command to:
-   Define custom parsing rules for your application's specific log formats.
-   Configure log retention policies in Elasticsearch.
-   Set up secure communication between Fluentd and Elasticsearch.

---

## 6. Kibana Access

### Step 1: Access the Kibana Dashboard

Similar to Grafana, use `kubectl port-forward` to access the Kibana UI.

```sh
kubectl port-forward svc/kibana-kibana 5601:5601 -n monitoring
```

Open your browser and navigate to `http://localhost:5601`.

### Step 2: View Your Logs

To see your application logs in Kibana for the first time, you need to create an "index pattern".

1.  Navigate to **Stack Management > Kibana > Index Patterns**.
2.  Click **Create index pattern**.
3.  Fluentd typically sends logs with an index name like `logstash-*` or `fluentd-*`. Enter `logstash-*` (or the appropriate pattern) and Kibana should find the log data.
4.  Select a time field (e.g., `@timestamp`) and create the index pattern.
5.  Navigate to the **Discover** tab to view, search, and filter your application logs.

---

## 7. Next Steps

With the monitoring and logging stack deployed, you can now:

-   **Instrument Your Applications**: Add custom application metrics (e.g., number of rides booked, API request latency) to your microservices and visualize them in custom Grafana dashboards.
-   **Configure Alerts**: Set up alerting rules in Alertmanager (which is part of the stack) to get notified of critical issues (e.g., high error rates, services down) via Slack, PagerDuty, or email.
-   **Secure Endpoints**: For production, expose Grafana and Kibana via a secure Ingress with authentication (e.g., OAuth2 Proxy).
-   **Configure Persistent Storage**: The default Helm charts may use `emptyDir` volumes. For production, configure persistent storage (e.g., using AWS EBS via PersistentVolumeClaims) for Prometheus and Elasticsearch to ensure data survives pod restarts.
