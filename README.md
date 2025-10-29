# Selective Disclosure KYC Demo

A privacy-preserving KYC system using **BLS ring signatures** and **Soroban smart contracts** on the Stellar blockchain. Users can selectively prove attributes (like "over 18") without revealing their identity or full credentials.

![Architecture Diagram](https://via.placeholder.com/800x400?text=Selective+Disclosure+KYC+Architecture)

## Features

- **Privacy-Preserving**: Users prove attributes without revealing identity
- **Ring Signatures**: Anonymous proof within attribute groups using BLS12-381
- **Selective Disclosure**: Choose which attributes to prove
- **On-Chain Verification**: Smart contract validates proofs without storing user data
- **No Blockchain Storage**: User credentials stored locally (localStorage)
- **Multiple Attributes**: Support for various KYC attributes (age, residency, etc.)

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Admin     │────▶│   Soroban    │◀────│    Issuer       │
│  Dashboard  │     │   Contract   │     │   Dashboard     │
└─────────────┘     └──────────────┘     └─────────────────┘
                           ▲                      │
                           │                      │
                           │                      ▼
                    ┌──────┴──────┐      ┌──────────────┐
                    │    User     │◀─────│   Backend    │
                    │  Interface  │      │    Server    │
                    └─────────────┘      └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  localStorage│
                  │  (encrypted) │
                  └──────────────┘
```

### Components

1. **Smart Contract (Soroban/Rust)**
   - Manages issuer registration
   - Creates and stores attribute rings
   - Verifies ring signatures
   - Tracks verification count

2. **Backend (Node.js/Express)**
   - Relays KYC requests between users and issuers
   - Temporary storage (no persistent DB)
   - API endpoints for KYC workflow

3. **Frontend (React/Vite/Tailwind)**
   - Admin dashboard for issuer management
   - Issuer dashboard for KYC approval
   - User verification form
   - Anonymous proof interface

## Prerequisites

- **Node.js** v18+ and npm
- **Rust** and Cargo
- **Soroban CLI** ([installation guide](https://soroban.stellar.org/docs/getting-started/setup))
- **Freighter Wallet** browser extension
- **Stellar testnet** account with XLM

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Selective-Disclosure-KYC
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Build and Deploy Smart Contract

```bash
# From project root
./scripts/deploy.sh
```

This script will:
- Build the Rust smart contract
- Optimize the WASM binary
- Deploy to Stellar testnet
- Save the contract ID
- Update environment files

Alternatively, manually deploy:

```bash
cd contracts/ring-sig-kyc

# Build
cargo build --target wasm32-unknown-unknown --release

# Deploy
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ring_sig_kyc.wasm \
  --source default \
  --network testnet
```

### 4. Initialize the Contract

After deployment, initialize with your admin address:

```bash
# Get your address
soroban config identity address default

# Initialize contract
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source default \
  --network testnet \
  -- initialize \
  --admin <YOUR_ADDRESS>
```

### 5. Configure Environment

Create `.env` files from examples:

```bash
# Backend
cp backend/.env.example backend/.env
# Edit and add your CONTRACT_ID

# Frontend
cp frontend/.env.example frontend/.env
# Edit and add your CONTRACT_ID
```

## Running the Demo

### Start Backend Server

```bash
cd backend
npm start
```

Server runs on `http://localhost:3001`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:3000`

## User Flow

### 1. Admin: Register Issuer

1. Navigate to `/admin`
2. Connect Freighter wallet
3. Initialize contract (first time only)
4. Register trusted KYC issuer public keys

### 2. User: Submit KYC Request

1. Navigate to `/verify`
2. Select a KYC provider (issuer)
3. Choose attributes to verify (e.g., "over_18", "resident_uk")
4. Fill in mock KYC information
5. Submit request
6. Wait for issuer approval

### 3. Issuer: Approve KYC

1. Navigate to `/issuer`
2. Connect Freighter wallet
3. Enter your registered issuer key
4. Review pending KYC requests
5. Approve qualified users
6. System creates keys and adds user to attribute rings
7. Credential sent to user

### 4. User: Prove Attribute

1. Navigate to `/confirm`
2. Credential loaded from localStorage
3. Select attribute to prove
4. Generate challenge
5. Sign challenge with ring signature
6. Verify on-chain
7. ✅ Proof successful without revealing identity!

## Smart Contract API

### Admin Functions

```rust
// Initialize contract with admin
fn initialize(env: Env, admin: Address)

// Register a KYC issuer
fn register_issuer(env: Env, issuer_pub: BytesN<96>)

// Get all registered issuers
fn get_issuers(env: Env) -> Vec<BytesN<96>>
```

### Issuer Functions

```rust
// Create ring for an attribute
fn create_ring_for_attribute(
    env: Env,
    issuer: Address,
    attribute: Symbol,
    users: Vec<BytesN<96>>
)

// Get ring for attribute
fn get_ring_for_attribute(env: Env, attribute: Symbol) -> Option<Vec<BytesN<96>>>
```

### User Functions

```rust
// Create keypairs
fn create_keys(env: Env, ring_size: u32) -> KeyRingResult

// Sign message with ring signature
fn sign(
    env: Env,
    msg: Bytes,
    ring: Vec<BytesN<96>>,
    secret_idx: u32,
    sk: BytesN<32>
) -> RingSignature

// Verify ring signature for attribute
fn verify_attribute(
    env: Env,
    msg: Bytes,
    sig: RingSignature,
    attribute: Symbol
) -> bool

// Get total verification count
fn get_login_count(env: Env) -> u64
```

## Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/issuers` | GET | Get registered issuers |
| `/api/request-kyc` | POST | Submit KYC request |
| `/api/kyc-requests` | GET | Get pending requests |
| `/api/approve-kyc` | POST | Approve KYC request |
| `/api/reject-kyc` | POST | Reject KYC request |
| `/api/credential/:userId` | GET | Retrieve credential |
| `/api/cleanup` | POST | Clean old data |
| `/api/stats` | GET | System statistics |

## Credential Format

Credentials are stored as JSON in `localStorage`:

```json
{
  "issuer": "0xabc123...",
  "user_keys": {
    "over_18": "0xPRIVATEKEY1",
    "resident_uk": "0xPRIVATEKEY2"
  },
  "rings": {
    "over_18": ["0xPUBKEY1", "0xPUBKEY2", "0xPUBKEY3"],
    "resident_uk": ["0xPUBKEY4", "0xPUBKEY5"]
  },
  "issued_at": "2025-01-15T10:30:00Z"
}
```

## Security Features

1. **Ring Anonymity**: Verification doesn't reveal which key signed
2. **Local Storage**: No user data stored on blockchain
3. **Encryption Ready**: Credential encryption utilities included
4. **Admin Control**: Only approved issuers can create rings
5. **Challenge-Response**: Prevents replay attacks

## Supported Attributes

- `over_18` - Age verification (18+)
- `over_21` - Age verification (21+)
- `resident_uk` - UK residency
- `resident_us` - US residency
- `no_criminal_history` - Background check
- `accredited_investor` - Investment qualification

Add more in `/frontend/src/pages/VerifyPage.jsx`

## Testing

### Run Smart Contract Tests

```bash
./scripts/test.sh
```

Or manually:

```bash
cd contracts/ring-sig-kyc
cargo test --release
```

### Manual Testing Flow

1. **Admin Setup**
   - Initialize contract
   - Register issuer with mock key

2. **Complete KYC**
   - Submit request as user
   - Approve as issuer
   - Verify credential received

3. **Prove Attribute**
   - Generate challenge
   - Sign with ring signature
   - Verify on-chain
   - Check login count incremented

## Development

### Project Structure

```
Selective-Disclosure-KYC/
├── contracts/
│   └── ring-sig-kyc/      # Soroban smart contract (Rust)
│       ├── src/
│       │   ├── lib.rs     # Main contract code
│       │   └── test.rs    # Contract tests
│       └── Cargo.toml
├── backend/
│   └── src/
│       └── server.js      # Express API server
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── utils/         # Utilities (credentials, contract)
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   └── package.json
├── scripts/
│   ├── deploy.sh          # Deployment script
│   └── test.sh            # Testing script
└── README.md
```

### Technology Stack

- **Smart Contract**: Rust, Soroban SDK
- **Backend**: Node.js, Express
- **Frontend**: React, Vite, Tailwind CSS
- **Blockchain**: Stellar (Soroban)
- **Cryptography**: BLS12-381, Ring Signatures
- **Wallet**: Freighter

## Limitations & Future Work

### Current Limitations

1. **Demo-grade crypto**: Uses simplified key generation
2. **No revocation**: Credentials can't be revoked once issued
3. **No expiry**: Credentials valid indefinitely
4. **Limited attributes**: Fixed attribute set
5. **No document verification**: Mock KYC process
6. **In-memory backend**: Data lost on restart

### Future Enhancements

- [ ] Production-grade BLS key generation
- [ ] Credential expiration and revocation
- [ ] Document upload and OCR verification
- [ ] Liveness detection (video KYC)
- [ ] Persistent database for backend
- [ ] Multiple issuer support per attribute
- [ ] Cross-chain verification
- [ ] Mobile app with biometric auth
- [ ] Zero-knowledge proofs (ZKP) integration
- [ ] Credential marketplace

## Troubleshooting

### Contract Deployment Fails

```bash
# Check Soroban CLI version
soroban --version

# Ensure you have testnet XLM
stellar account fund <YOUR_ADDRESS> --network testnet
```

### Freighter Connection Issues

1. Ensure Freighter extension is installed
2. Switch to Stellar Testnet in Freighter
3. Fund your account with testnet XLM

### Backend Can't Connect to Contract

1. Verify `CONTRACT_ID` in `.env` files
2. Check contract is initialized
3. Ensure correct network (testnet)

### Credential Not Received

1. Check issuer approved the request
2. Verify userId matches
3. Check backend logs
4. Try manual fetch: `GET /api/credential/<userId>`

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file

## Resources

- [Soroban Documentation](https://soroban.stellar.org/)
- [BLS12-381 Cryptography](https://hackmd.io/@benjaminion/bls12-381)
- [Ring Signatures Explained](https://en.wikipedia.org/wiki/Ring_signature)
- [Stellar Developer Docs](https://developers.stellar.org/)
- [Freighter Wallet](https://www.freighter.app/)

## Contact

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ for privacy-preserving identity verification**
