FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy service package.json
COPY backend/apps/api-gateway/package.json ./

# Install dependencies
RUN pnpm install --prod

# Copy shared libraries and service source
COPY backend/libs ./libs
COPY backend/apps/api-gateway ./apps/api-gateway

# Build the application
WORKDIR /app/apps/api-gateway
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]
