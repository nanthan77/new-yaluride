#!/bin/bash

# ==============================================================================
# YALURIDE Database Migration Deployment Script
#
# This script automates the deployment of database migrations to a Supabase project.
#
# It is designed to be used in a CI/CD pipeline (e.g., GitLab CI).
# It requires two pieces of information:
# 1. The Supabase Project ID, passed as the first command-line argument.
# 2. The Supabase Access Token, provided as an environment variable `SUPABASE_ACCESS_TOKEN`.
#
# Usage:
#   ./scripts/deploy-database.sh <your-supabase-project-id>
#
# Prerequisites:
#   - Supabase CLI installed (`npm install supabase --save-dev`).
#   - The script must be run from the repository root.
#   - Ensure you have execute permissions: `chmod +x scripts/deploy-database.sh`
# ==============================================================================

# --- Configuration ---
# Exit immediately if a command exits with a non-zero status.
# This ensures that the script will fail fast if any step has an error.
set -e

# Color codes for better output in CI logs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting YALURIDE database migration deployment...${NC}"

# --- 1. Validate Input ---
# Check if the Supabase project ID was provided as the first argument.
if [ -z "$1" ]; then
  echo -e "${RED}Error: Supabase project ID is required.${NC}" >&2
  echo "Usage: $0 <supabase-project-id>" >&2
  exit 1
fi
PROJECT_ID=$1

# Check if the Supabase access token is set as an environment variable.
# The `supabase login` command relies on this variable being set.
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo -e "${RED}Error: SUPABASE_ACCESS_TOKEN environment variable is not set.${NC}" >&2
  exit 1
fi

# --- 2. Login to Supabase CLI ---
echo -e "\n${YELLOW}--> Logging into Supabase CLI...${NC}"
# The CLI automatically detects and uses the SUPABASE_ACCESS_TOKEN environment variable.
# There is no need to pass the token directly to the command.
supabase login
echo -e "${GREEN}Successfully logged into Supabase CLI.${NC}"

# --- 3. Link Project ---
# Although not strictly necessary if --project-ref is used, linking ensures
# the local project state is correctly associated, which can be useful for some commands.
echo -e "\n${YELLOW}--> Linking to Supabase project: ${GREEN}$PROJECT_ID${NC}..."
supabase link --project-ref "$PROJECT_ID"
echo -e "${GREEN}Successfully linked to project.${NC}"

# --- 4. Deploy Database Migrations ---
echo -e "\n${YELLOW}--> Deploying all new database migrations to project ${GREEN}$PROJECT_ID${NC}..."
# The `db push` command applies all local migration files that have not yet been
# applied to the remote database. The `--project-ref` flag is an explicit safeguard.
supabase db push --project-ref "$PROJECT_ID"

# --- 5. Final Success Message ---
echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}Database migrations deployed successfully! ✅"
echo -e "${GREEN}=====================================================${NC}"

exit 0
