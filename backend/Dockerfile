FROM node:20

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Expose the API port
EXPOSE 5000

# Start the application
CMD ["npm", "run", "start"]