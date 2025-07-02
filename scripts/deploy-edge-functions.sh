#!/bin/bash
# This script automates the deployment of Supabase Edge Functions
# to a specified environment (staging or production).
#
# It requires the following environment variables to be set in the CI/CD environment:
# - SUPABASE_ACCESS_TOKEN: Your Supabase personal access token.
# - SUPABASE_PROJECT_ID_STAGING: The project ID for the staging environment.
# - SUPABASE_PROJECT_ID_PRODUCTION: The project ID for the production environment.
#
# Usage:
# ./scripts/deploy-edge-functions.sh [staging|production]

# Exit immediately if a command exits with a non-zero status.
set -e

# --- 1. Validate Environment Argument ---
ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
  echo "Error: Deployment environment not specified."
  echo "Usage: $0 [staging|production]"
  exit 1
fi

# --- 2. Set Supabase Project ID based on Environment ---
echo "--- Preparing Edge Function deployment for '$ENVIRONMENT' environment ---"

if [ "$ENVIRONMENT" == "staging" ]; then
  if [ -z "$SUPABASE_PROJECT_ID_STAGING" ]; then
    echo "Error: SUPABASE_PROJECT_ID_STAGING environment variable is not set."
    exit 1
  fi
  SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID_STAGING
elif [ "$ENVIRONMENT" == "production" ]; then
  if [ -z "$SUPABASE_PROJECT_ID_PRODUCTION" ]; then
    echo "Error: SUPABASE_PROJECT_ID_PRODUCTION environment variable is not set."
    exit 1
  fi
  SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID_PRODUCTION
else
  echo "Error: Invalid environment '$ENVIRONMENT'. Must be 'staging' or 'production'."
  exit 1
fi

# Verify that the access token is available
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN environment variable is not set."
  exit 1
fi

echo "Target Supabase Project ID: $SUPABASE_PROJECT_ID"

# --- 3. Deploy Edge Functions ---
# The Supabase CLI automatically uses the SUPABASE_ACCESS_TOKEN from the environment.
echo "--- Deploying Edge Functions ---"
# The --project-ref flag explicitly specifies the target project, which is a good safeguard.
# The command deploys all functions found in the `supabase/functions` directory.
supabase functions deploy --project-ref "$SUPABASE_PROJECT_ID"

echo "--- Edge Function deployment to '$ENVIRONMENT' environment completed successfully! ---"
