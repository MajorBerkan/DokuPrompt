# Node Image - using slim instead of alpine to avoid musl/glibc issues with native modules
FROM node:latest AS builder

# Arbeitsverzeichnis
WORKDIR /app

# Systemabhängigkeiten für Watch / git
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    git \
    && rm -rf /var/lib/apt/lists/*

# package.json kopieren und Dependencies installieren
COPY package*.json ./

# Clean install without optional dependencies to avoid Rollup native binding issues
# npm ci is more deterministic than npm install
RUN npm install

# Restlichen Code kopieren
COPY . .

# Hot Reload in Docker zuverlässig machen
ENV CHOKIDAR_USEPOLLING=true

# Expose Vite Port
EXPOSE 5173

# Startbefehl für Development Server
CMD ["npm", "run", "dev", "--", "--host"]
