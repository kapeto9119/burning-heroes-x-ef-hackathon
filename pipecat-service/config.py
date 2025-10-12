import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
DAILY_API_KEY = os.getenv("DAILY_API_KEY")

# Backend
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001")

# Server
PORT = int(os.getenv("PORT", 8765))
HOST = os.getenv("HOST", "0.0.0.0")

# Validate required keys
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY is required")
if not DAILY_API_KEY:
    raise ValueError("DAILY_API_KEY is required")
