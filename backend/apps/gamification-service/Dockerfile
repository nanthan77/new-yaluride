FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy service package.json
COPY backend/apps/gamification-service/package.json ./

# Install dependencies
RUN pnpm install --prod

# Copy shared libraries and service source
COPY backend/libs ./libs
COPY backend/apps/gamification-service ./apps/gamification-service

# Build the application
WORKDIR /app/apps/gamification-service
RUN pnpm run build

EXPOSE 3005

CMD ["pnpm", "run", "start:prod"]
