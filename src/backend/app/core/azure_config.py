import os

# Load Azure Entra ID configuration from environment variables
AZ_TENANT_ID = "c4a314e1-4621-4689-bda2-6d86a7b535ce"  # os.getenv("AZURE_TENANT_ID", "X")
AZ_CLIENT_ID = "8c0a4ed6-c830-49ee-8cb1-05113397a04e"  # os.getenv("AZURE_CLIENT_ID", "X")  # Backend-App Client ID (Audience!)
AZ_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")  # Optional: For server-to-server authentication
AZ_ISSUER = f"https://login.microsoftonline.com/{AZ_TENANT_ID}/v2.0"
AZ_JWKS_URL = f"https://login.microsoftonline.com/{AZ_TENANT_ID}/discovery/v2.0/keys"
