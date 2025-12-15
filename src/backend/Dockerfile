# Basis-Image
FROM python:3.12-slim

WORKDIR /app

# Systemabhängigkeiten inkl. git & SSL-Zertifikate
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    libpq-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# pip updaten
RUN pip install --upgrade pip

# Requirements kopieren
COPY requirements.txt .

# Abhängigkeiten installieren (inkl. pgvector aus GitHub)
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt

# Backend-Code kopieren
COPY . .

# Standardport für FastAPI
EXPOSE 8000

# Startbefehl
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
