# Base Image: Python 3.11 (for OCR)
FROM python:3.11-slim

# Install system dependencies and Curl
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    libgl1 \
    libglib2.0-0 \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
ENV BUN_INSTALL=/root/.bun
ENV PATH=$BUN_INSTALL/bin:$PATH
RUN curl -fsSL https://bun.sh/install | bash

# Set working directory
WORKDIR /app

# --- Setup Vision Service (Python) ---
COPY vision_service/requirements.txt ./vision_service/requirements.txt
RUN pip install --no-cache-dir -r vision_service/requirements.txt

# Copy Vision Service Code
COPY vision_service ./vision_service

# --- Setup Backend (Node/Bun) ---
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN bun install --production

# Copy Backend Code
COPY backend ./

# --- Final Setup ---
WORKDIR /app

# Copy Supervisord Configuration
COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Environment Variables
ENV PORT=3000
ENV VISION_SERVICE_URL=http://localhost:8008

# Expose Render's Port (Default is usually 10000, but we use $PORT)
EXPOSE 3000

# Start Supervisor (runs both services)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
