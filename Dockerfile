# Use lightweight Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies (only production for smaller image, but we need all for now to be safe with this setup)
RUN npm install

# Copy application source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
