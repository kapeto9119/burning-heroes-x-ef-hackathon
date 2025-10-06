#!/bin/bash

# Database Setup Script for Workflow Builder
# This script creates the database and runs the schema

set -e

echo "🗄️  Setting up Workflow Builder Database..."

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Default values
DB_NAME=${DB_NAME:-workflow_builder}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "📊 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "🌐 Host: $DB_HOST:$DB_PORT"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on $DB_HOST:$DB_PORT"
    echo "Please start PostgreSQL and try again."
    exit 1
fi

echo "✅ PostgreSQL is running"

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "⚠️  Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping database..."
        dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
        echo "✅ Database dropped"
    else
        echo "Skipping database creation..."
        echo ""
        read -p "Do you want to run migrations anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Exiting..."
            exit 0
        fi
    fi
fi

# Create database if it doesn't exist
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "📦 Creating database '$DB_NAME'..."
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    echo "✅ Database created"
fi

# Run schema
echo "🔨 Running schema migrations..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f ../db/schema.sql

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your .env file with database credentials"
echo "2. Run 'npm run dev' to start the backend"
echo "3. Visit http://localhost:3001/health to verify"
echo ""
echo "🎉 Happy coding!"
