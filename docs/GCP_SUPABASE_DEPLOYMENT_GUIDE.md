# Guide: Deploying YALURIDE with a Hybrid Supabase & Google Cloud Architecture

## 1. Architecture Overview

This guide details how to deploy the YALURIDE application using a powerful hybrid architecture. We leverage Supabase for its excellent Backend-as-a-Service (BaaS) capabilities for rapid development and Google Cloud Platform (GCP) for its robust, scalable infrastructure for our custom microservices.

### Responsibility Breakdown:

-   **Supabase will manage:**
    -   **Primary Database**: The core PostgreSQL database, including tables for users, rides, profiles, etc.
    -   **Authentication**: Manages all user and driver sign-ups, logins, and JWT-based session management.
    -   **Storage**: Securely stores all user-uploaded files, such as driver license photos, profile pictures, and verification documents.
    -   **Simple Edge Functions**: Ideal for lightweight, stateless logic (e.g., a function to create a user profile entry after sign-up).
    -   **Basic Real-time**: Can be used for simple real-time events like ride status updates (`PENDING` -> `ACCEPTED`).

-   **Google Cloud Platform (GCP) will host:**
    -   **Custom Microservices**: The core business logic resides in our NestJS microservices, which will be containerized and deployed on **Google Kubernetes Engine (GKE)** for maximum scalability and control. This includes:
        -   `api-gateway`
        -   `matching-service`
        -   `pricing-service`
        -   `location-service` (handles high-frequency GPS updates)
        -   `voice-service`
        -   And all other custom services.
    -   **High-Performance Caching**: A managed **Memorystore for Redis** instance will provide a high-speed cache for sessions, driver locations, and API responses.
    -   **Asynchronous Messaging**: **Google Cloud Pub/Sub** will serve as the message broker for reliable, event-driven communication between microservices.

This hybrid model gives us the best of both worlds: Supabase's speed and convenience for standard backend tasks, and GCP's power and flexibility for our custom, high-traffic services.

---

## 2. Supabase Project Setup

First, we'll set up the Supabase project which will serve as the foundational data and auth layer.

1.  **Create a New Supabase Project**:
    -   Go to the [Supabase Dashboard](https://supabase.com/dashboard).
    -   Click "New project" and choose an organization.
    -   Give your project a name (e.g., `yaluride-production`), generate a secure database password, and choose the region closest to your user base (e.g., `ap-south-1` for Mumbai).
    -   Click "Create new project". Wait for the project to be provisioned.

2.  **Enable the PostGIS Extension**:
    YALURIDE heavily relies on geospatial queries. You must enable the PostGIS extension.
    -   In your Supabase project dashboard, navigate to the **SQL Editor**.
    -   Click "+ New query".
    -   Enter and run the following command:
        ```sql
        CREATE EXTENSION IF NOT EXISTS postgis;
        ```
    -   You should see a "Success. No rows returned" message.

3.  **Get Your Project Credentials**:
    You will need these to configure your backend services.
    -   Navigate to **Project Settings > API**.
    -   You will find your **Project URL** and your `anon` and `service_role` **API Keys**.
    -   Navigate to **Project Settings > Database**.
    -   Under **Connection string**, find the URI. This is your database connection string that your NestJS services will use to connect directly to the database. It will look like `postgres://postgres:[YOUR-PASSWORD]@[...].supabase.co:5432/postgres`.

---

## 3. Google Cloud Platform (GCP) Setup

Next, prepare your Google Cloud environment.

1.  **Create a GCP Project**:
    -   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    -   Create a new project (e.g., `yaluride-prod`).
    -   Ensure you have a **Billing Account** linked to your project.

2.  **Enable Required APIs**:
    You must enable the APIs for the services we'll be using.
    -   Navigate to **APIs & Services > Library**.
    -   Search for and enable the following APIs:
        -   `Kubernetes Engine API`
        -   `Cloud Run API` (useful for serverless containers)
        -   `Memorystore for Redis API`
        -   `Cloud Pub/Sub API`
        -   `Artifact Registry API` (to store your Docker images)

3.  **Configure the `gcloud` CLI**:
    -   Install the Google Cloud SDK on your local machine by following the [official guide](https://cloud.google.com/sdk/docs/install).
    -   Initialize the SDK and authenticate with your account:
        ```sh
        gcloud init
        ```
    -   Follow the prompts to log in, select your new project (`yaluride-prod`), and configure a default region (e.g., `asia-south1`).

---

## 4. Kubernetes (GKE) Cluster Setup

We will create a GKE cluster to run our containerized microservices.

1.  **Create the GKE Cluster**:
    Run the following command in your terminal. This creates a cost-effective, regional cluster suitable for a production start.

    ```sh
    gcloud container clusters create yaluride-production-cluster \
      --project=yaluride-prod \
      --region=asia-south1 \
      --machine-type=e2-medium \
      --num-nodes=2 \
      --enable-autoscaling --min-nodes=2 --max-nodes=5 \
      --release-channel=regular \
      --network=default
    ```
    -   `--region`: Creates a multi-zone cluster for high availability.
    -   `--machine-type`: `e2-medium` is a good starting point. You can adjust as needed.
    -   `--enable-autoscaling`: Allows the cluster to automatically add or remove nodes based on load.

2.  **Connect `kubectl` to Your New GKE Cluster**:
    After the cluster is created, this command will configure `kubectl` automatically.
    ```sh
    gcloud container clusters get-credentials yaluride-production-cluster --region=asia-south1
    ```

3.  **Verify the Connection**:
    ```sh
    kubectl get nodes
    ```
    You should see the nodes of your new cluster listed.

---

## 5. Service Configuration

Your NestJS microservices need to be configured with the correct environment variables to connect to Supabase and GCP services.

Update your `.env` file (or your Kubernetes `ConfigMap`/`Secret` manifests) with the following:

```env
# --- Supabase Configuration ---
# Get this from your Supabase project's Database settings
DATABASE_URL="postgres://postgres:[YOUR-SUPABASE-DB-PASSWORD]@[...].supabase.co:5432/postgres"

# Get these from your Supabase project's API settings
SUPABASE_URL="https://[...].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"

# --- GCP Configuration ---
# Get the internal IP after creating the Redis instance in the GCP console
REDIS_HOST="[YOUR-MEMORSTORE-REDIS-IP]"
REDIS_PORT="6379"

# Your GCP Project ID
GCP_PROJECT_ID="yaluride-prod"

# --- Other Configurations ---
NODE_ENV=production
JWT_SECRET="[USE A STRONG, RANDOMLY GENERATED SECRET]"
# ... other service-specific variables
```

---

## 6. Deployment Workflow

### Deploying Supabase Edge Functions

For simple, stateless logic, use Supabase Edge Functions. The workflow is managed by the Supabase CLI.

1.  Write your function in the `supabase/functions` directory.
2.  Deploy it using the CLI:
    ```sh
    # Link to your production project first
    supabase link --project-ref <your-supabase-project-id>
    
    # Deploy a specific function
    supabase functions deploy <function-name>
    ```

### Deploying Microservices to GCP (GKE)

For your custom NestJS microservices, the workflow involves containerizing them and deploying to your GKE cluster. This process should be automated in your CI/CD pipeline (`.gitlab-ci.yml`).

1.  **Build Docker Image**: For each microservice, a Docker image is built.
    ```sh
    docker build -t asia-south1-docker.pkg.dev/yaluride-prod/yaluride-repo/api-gateway:latest -f ./backend/apps/api-gateway/Dockerfile .
    ```

2.  **Push Image to Artifact Registry**: The image is pushed to Google's container registry.
    ```sh
    # First, configure Docker to use gcloud credentials
    gcloud auth configure-docker asia-south1-docker.pkg.dev

    # Push the image
    docker push asia-south1-docker.pkg.dev/yaluride-prod/yaluride-repo/api-gateway:latest
    ```

3.  **Deploy to GKE**: The Kubernetes deployment manifest is updated with the new image tag and applied to the cluster.
    ```sh
    # Example using kubectl
    kubectl set image deployment/api-gateway-deployment api-gateway=asia-south1-docker.pkg.dev/yaluride-prod/yaluride-repo/api-gateway:latest
    ```
    In a production setup, this is best handled via a GitOps tool like **ArgoCD**, which automatically syncs your Kubernetes manifests from a Git repository to your cluster.
