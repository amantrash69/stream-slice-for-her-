# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Install system dependencies: ffmpeg (required for audio/video processing)
# and nodejs (required for yt-dlp JavaScript challenge solver)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    nodejs \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Cloud platforms assign a dynamic PORT environment variable (default 8000)
ENV PORT=8000
EXPOSE 8000

CMD ["python", "main.py"]
