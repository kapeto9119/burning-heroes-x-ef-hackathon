#!/bin/bash

# Database Setup Script
# Run this to set up PostgreSQL for the workflow builder

set -e

echo "🚀 Setting up PostgreSQL database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install postgresql@15
        brew services start postgresql@15
    else
        echo "Please install PostgreSQL manually for your OS"
        exit 1
    fi
fi

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo "⚠️  PostgreSQL is not running. Starting..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql@15
    else
        sudo systemctl start postgresql
    fi
    sleep 2
fi

# Create database
echo "📦 Creating database 'workflow_builder'..."
psql postgres -c "CREATE DATABASE workflow_builder;" 2>/dev/null || echo "Database already exists"

# Run schema
echo "📋 Running schema..."
psql workflow_builder < db/schema.sql

# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Add database config
    echo "" >> .env
    echo "# Database Configuration (auto-generated)" >> .env
    echo "DB_HOST=localhost" >> .env
    echo "DB_PORT=5432" >> .env
    echo "DB_NAME=workflow_builder" >> .env
    echo "DB_USER=postgres" >> .env
    echo "DB_PASSWORD=" >> .env
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
    
    echo "⚠️  Please update DB_PASSWORD in .env file!"
else
    echo "⚠️  .env already exists. Please add these manually:"
    echo ""
    echo "DB_HOST=localhost"
    echo "DB_PORT=5432"
    echo "DB_NAME=workflow_builder"
    echo "DB_USER=postgres"
    echo "DB_PASSWORD=your_password"
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Update DB_PASSWORD in .env"
echo "2. Run: npm run dev"
echo "3. You should see: [Database] ✅ Connected successfully"
echo ""
