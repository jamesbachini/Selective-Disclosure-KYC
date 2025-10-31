# Quickstart Guide

Get the Selective Disclosure KYC demo running in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js
node --version  # Should be v18+

# Check Rust (optional for smart contract development)
rustc --version

# Check Soroban CLI (optional for deployment)
soroban --version
```

If missing, install from:
- Node.js: https://nodejs.org/
- Rust: https://rustup.rs/
- Soroban: https://soroban.stellar.org/docs/getting-started/setup

## Quick Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## Demo Walkthrough (No Smart Contract)

You can test the UI flow without deploying a smart contract:

### Step 1: Admin Dashboard
1. Go to http://localhost:3000/admin
2. Click "Generate Mock Key" to create a demo issuer key
3. Click "Register Issuer"
4. Note: Without contract deployment, this will show an error - that's OK for UI testing

### Step 2: User Verification
1. Go to http://localhost:3000/verify
2. Select "Demo KYC Provider 1"
3. Check attributes like "Over 18 years old" and "UK Resident"
4. Fill in mock user information:
   - Name: John Doe
   - Email: john@example.com
   - DOB: 1990-01-01
   - Country: United Kingdom
5. Click "Submit KYC Request"
6. Note your User ID

### Step 3: Issuer Approval
1. Go to http://localhost:3000/issuer
2. Click "Generate Mock Key" (use same key as admin step)
3. See your pending KYC request
4. Click "Approve"
5. Credential is created and sent to user

### Step 4: Prove Attribute
1. Go to http://localhost:3000/confirm
2. Your credential loads automatically
3. Select attribute "over_18"
4. Click "Generate Challenge"
5. Click "Sign Challenge"
6. Click "Verify On-Chain"
7. Note: Without contract, verification simulation shown

## Full Setup with Smart Contract

### 1. Install Soroban CLI & Setup Account

```bash
cargo install --locked soroban-cli --features opt
soroban network add testnet --rpc-url https://soroban-testnet.stellar.org --network-passphrase "Test SDF Network ; September 2015"
soroban keys generate default
soroban keys address default
stellar account fund <YOUR_ADDRESS> --network testnet
```

### 2. Deploy Contract

```bash
# From project root
./scripts/deploy.sh
```

This will:
- Build the contract
- Deploy to testnet
- Save contract ID
- Update .env files

### 3. Initialize Contract

```bash
# Get your address
ADMIN_ADDRESS=$(soroban keys address default)

# Get contract ID (from deploy script output or CONTRACT_ID.txt)
CONTRACT_ID=$(cat CONTRACT_ID.txt)

# Initialize
soroban contract invoke \
  --id $CONTRACT_ID \
  --source default \
  --network testnet \
  -- initialize \
  --admin $ADMIN_ADDRESS
```

### 4. Install a Stellar Wallet

Install one of the supported wallets:
1. **Freighter** (recommended): https://www.freighter.app/
2. **xBull**: https://xbull.app/
3. **Albedo**: https://albedo.link/

After installation:
1. Create/import wallet
2. Switch to "Testnet" network
3. Import your key or fund a new address

### 5. Complete Full Flow

Now repeat the demo walkthrough steps above, but:
- In Admin: Connect your wallet before registering issuer
- In Issuer: Connect your wallet before approving
- In Confirm: Actual on-chain verification will occur

## Troubleshooting

### "Contract not found"
- Make sure you deployed and initialized the contract
- Check CONTRACT_ID in .env files matches deployed contract

### Wallet connection issues
- Install a supported Stellar wallet (Freighter, xBull, or Albedo)
- Make sure the wallet is unlocked
- Refresh the page if the wallet modal doesn't appear

### "Backend connection failed"
- Ensure backend is running on port 3001
- Check `npm start` output for errors

### "Credential not received"
- Check backend logs
- Verify userId matches
- Try manual fetch: `curl http://localhost:3001/api/credential/<userId>`

## Architecture Overview

```
User Browser              Backend Server         Stellar Testnet
│                        │                      │
├─ React App ────────────┼─ Express API        │
│  (localhost:3000)      │  (localhost:3001)   │
│                        │                      │
├─ localStorage ◄────────┼─ In-memory Store    │
│  (credentials)         │  (KYC requests)     │
│                        │                      │
└─ Stellar Wallet ───────┴──────────────────────┼─ Soroban Contract
   (Freighter/xBull/etc)                        │  (ring signatures)
                                                │
```

## What's Happening?

1. **Admin** registers issuer public keys on-chain
2. **User** submits KYC data to backend (temporary storage)
3. **Issuer** approves, creates key pairs, adds user to attribute rings on-chain
4. **Backend** sends credential JSON to user (one-time retrieval)
5. **User** stores credential in localStorage (encrypted)
6. **User** proves attributes by signing challenges with ring signatures
7. **Contract** verifies signature without revealing which key signed

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the [smart contract code](contracts/ring-sig-kyc/src/lib.rs)
- Check out [frontend utilities](frontend/src/utils/)
- Review [backend API](backend/src/server.js)

## Quick Commands Reference

```bash
# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm run dev

# Deploy contract
./scripts/deploy.sh

# Run tests
./scripts/test.sh

# Check backend health
curl http://localhost:3001/api/health

# View stats
curl http://localhost:3001/api/stats
```

## Development Tips

### Hot Reload
Both frontend and backend support hot reload - just save files and see changes

### Mock Data
Use "Generate Mock Key" buttons throughout the UI for testing

### API Testing
Use curl or Postman to test backend endpoints:

```bash
# Submit KYC request
curl -X POST http://localhost:3001/api/request-kyc \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "issuerPubKey": "0xabc...",
    "attributes": ["over_18"],
    "userData": {"name": "Test", "email": "test@example.com", "dob": "1990-01-01"}
  }'

# Check requests
curl http://localhost:3001/api/kyc-requests
```

### Browser DevTools
- Check localStorage for credentials (F12 → Application → Local Storage)
- Monitor network requests (F12 → Network)
- View console logs (F12 → Console)

## Need Help?

- Check [README.md](README.md) for full documentation
- Review error messages in browser console and terminal
- Ensure all services are running
- Verify environment variables are set correctly

Happy coding! 🚀
