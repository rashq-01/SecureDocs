FROM node:20 AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Pass environment variables for the build process
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Build the React application
RUN npm run build

# Use Nginx to serve the built static files
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
