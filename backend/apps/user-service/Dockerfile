FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy service package.json
COPY backend/apps/user-service/package.json ./

# Install dependencies
RUN pnpm install --prod

# Copy shared libraries and service source
COPY backend/libs ./libs
COPY backend/apps/user-service ./apps/user-service

# Build the application
WORKDIR /app/apps/user-service
RUN pnpm run build

EXPOSE 3012

CMD ["pnpm", "run", "start:prod"]
