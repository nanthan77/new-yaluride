FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy service package.json
COPY backend/apps/matching-service/package.json ./

# Install dependencies
RUN pnpm install --prod

# Copy shared libraries and service source
COPY backend/libs ./libs
COPY backend/apps/matching-service ./apps/matching-service

# Build the application
WORKDIR /app/apps/matching-service
RUN pnpm run build

EXPOSE 3006

CMD ["pnpm", "run", "start:prod"]
