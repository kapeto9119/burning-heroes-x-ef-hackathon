#!/bin/bash

# Quick deploy script for Railway
# Usage: ./deploy.sh "commit message"

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting deployment...${NC}"

# Check if commit message provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide a commit message${NC}"
    echo "Usage: ./deploy.sh \"your commit message\""
    exit 1
fi

COMMIT_MSG="$1"

# Build backend
echo -e "${BLUE}📦 Building backend...${NC}"
cd back
npm run build
cd ..

# Build frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
cd front
npm run build
cd ..

# Git operations
echo -e "${BLUE}📝 Committing changes...${NC}"
git add .
git commit -m "$COMMIT_MSG" || echo "Nothing to commit"

echo -e "${BLUE}🔄 Pulling latest changes...${NC}"
git pull origin main --rebase

echo -e "${BLUE}🔄 Pushing to main...${NC}"
git push origin main

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🎉 Railway will auto-deploy from main branch${NC}"
