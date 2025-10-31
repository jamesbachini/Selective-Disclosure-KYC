#!/bin/bash

# Selective Disclosure KYC - Deployment Script
# This script builds and deploys the smart contract to Stellar testnet

set -e

echo "🚀 Selective Disclosure KYC Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo -e "${RED}Error: stellar CLI is not installed${NC}"
    echo "Install it from: https://developers.stellar.org/docs/tools/developer-tools"
    exit 1
fi

echo ""
echo "Step 1: Building the smart contract..."
echo "--------------------------------------"

cd contracts/ring-sig-kyc

# Build the contract
cargo build --target wasm32-unknown-unknown --release

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Contract built successfully${NC}"
else
    echo -e "${RED}✗ Contract build failed${NC}"
    exit 1
fi

# Optimize the wasm
echo ""
echo "Step 2: Optimizing WASM..."
stellar contract optimize \
    --wasm target/wasm32-unknown-unknown/release/ring_sig_kyc.wasm

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ WASM optimized successfully${NC}"
else
    echo -e "${RED}✗ WASM optimization failed${NC}"
    exit 1
fi

# Deploy to testnet
echo ""
echo "Step 3: Deploying to Stellar Testnet..."
echo "---------------------------------------"

# Check if identity exists
if ! stellar keys ls | grep -q "default"; then
    echo "Creating default identity..."
    stellar keys generate default
fi

# Get the identity address //$(stellar keys address default)
ADMIN_ADDRESS=GBQ7FCMEP3Q455HVHI74XELBTEYSECT7QO2VYIBC6WCW7VVB6WXZ6KL4
echo "Admin address: $ADMIN_ADDRESS"

# Deploy the contract
echo "Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/ring_sig_kyc.wasm \
    --source default \
    --network testnet)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Contract deployed successfully${NC}"
    echo ""
    echo "================================================"
    echo -e "${GREEN}Contract ID: $CONTRACT_ID${NC}"
    echo "================================================"
    echo ""

    # Save contract ID to file
    cd ../..
    echo "$CONTRACT_ID" > CONTRACT_ID.txt
    echo "Contract ID saved to CONTRACT_ID.txt"
    # Update environment files
    echo ""
    echo "Step 4: Updating environment files..."
    echo "------------------------------------"
    # Update frontend .env
    if [ -f "frontend/.env" ]; then
        sed -i "s/VITE_CONTRACT_ID=.*/VITE_CONTRACT_ID=$CONTRACT_ID/" frontend/.env
    else
        echo "VITE_CONTRACT_ID=$CONTRACT_ID" > frontend/.env
        echo "VITE_API_URL=http://localhost:3001" >> frontend/.env
    fi
    echo -e "${GREEN}✓ Updated frontend/.env${NC}"
    # Update backend .env
    if [ -f "backend/.env" ]; then
        sed -i "s/CONTRACT_ID=.*/CONTRACT_ID=$CONTRACT_ID/" backend/.env
    else
        echo "PORT=3001" > backend/.env
        echo "NODE_ENV=development" >> backend/.env
        echo "CONTRACT_ID=$CONTRACT_ID" >> backend/.env
        echo "STELLAR_NETWORK=TESTNET" >> backend/.env
    fi
    echo -e "${GREEN}✓ Updated backend/.env${NC}"
    echo ""

    # Initialize Contract With Admin Address
    stellar contract invoke --id $CONTRACT_ID --source default --network testnet -- initialize --admin $ADMIN_ADDRESS
    echo ""
    echo "Initialized Contract. Admin ID: $ADMIN_ADDRESS"
    echo ""
    echo "   Next Steps:"
    echo "1. Start the backend server:"
    echo "   cd backend && npm install && npm start"
    echo ""
    echo "2. Start the frontend:"
    echo "   cd frontend && npm install && npm run dev"
    echo ""

else
    echo -e "${RED}✗ Contract deployment failed${NC}"
    exit 1
fi
