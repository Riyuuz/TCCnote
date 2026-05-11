FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY server.js ./

# Port yang dipakai Cloud Run
EXPOSE 8080

# Jalankan server
CMD ["node", "server.js"]
