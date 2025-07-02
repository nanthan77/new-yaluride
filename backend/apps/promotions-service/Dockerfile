FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy service package.json
COPY backend/apps/promotions-service/package.json ./

# Install dependencies
RUN pnpm install --prod

# Copy shared libraries and service source
COPY backend/libs ./libs
COPY backend/apps/promotions-service ./apps/promotions-service

# Build the application
WORKDIR /app/apps/promotions-service
RUN pnpm run build

EXPOSE 3008

CMD ["pnpm", "run", "start:prod"]
