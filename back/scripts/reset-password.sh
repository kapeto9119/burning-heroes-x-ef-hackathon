#!/bin/bash

# Script to reset a user's password securely
# Usage: ./scripts/reset-password.sh <email> <new-password>

if [ "$#" -ne 2 ]; then
    echo "Usage: ./scripts/reset-password.sh <email> <new-password>"
    echo "Example: ./scripts/reset-password.sh user@example.com MyNewPassword123"
    exit 1
fi

EMAIL="$1"
PASSWORD="$2"

# Run the TypeScript script (it will load .env automatically)
npx ts-node scripts/reset-password.ts "$EMAIL" "$PASSWORD"
