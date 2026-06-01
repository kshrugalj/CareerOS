FROM python:3.11-slim

WORKDIR /app

# Install minimal system deps for pyarrow wheels
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps (no cache to save image size)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create writable cache directory for jobhive parquet files
RUN mkdir -p /tmp/jobhive_cache

# Render provides PORT env var; default to 8204 for local testing
ENV PORT=8204

EXPOSE ${PORT}

CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT}
