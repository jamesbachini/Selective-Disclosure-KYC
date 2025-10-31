// Soroban contract interaction utilities
import { Contract, SorobanRpc, TransactionBuilder, Networks, BASE_FEE, Account, xdr, nativeToScVal, Transaction } from '@stellar/stellar-sdk';
import { StellarWalletsKit, WalletNetwork, allowAllModules, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';

// Contract configuration
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'YOUR_CONTRACT_ID_HERE';
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = 'https://soroban-testnet.stellar.org';

// Initialize Stellar Wallets Kit
let kit = null;
let connectedWalletPublicKey = null;

/**
 * Get or create Stellar Wallets Kit instance
 */
function getKit() {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kit;
}

/**
 * Connect to a Stellar wallet
 * Opens a modal for the user to select their wallet
 */
export async function connectWallet() {
  try {
    const walletKit = getKit();

    // Open the wallet selection modal
    await walletKit.openModal({
      onWalletSelected: async (option) => {
        walletKit.setWallet(option.id);
      }
    });

    // Get the public key from the connected wallet
    const { address } = await walletKit.getAddress();
    connectedWalletPublicKey = address;

    console.log('Wallet connected:', address);
    return address;
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
}

/**
 * Get the currently connected wallet address
 */
export function getConnectedWallet() {
  return connectedWalletPublicKey;
}

/**
 * Sign a transaction with the connected wallet
 * @returns {Transaction} Signed transaction object
 */
async function signTransaction(transaction) {
  const walletKit = getKit();
  const { signedTxXdr } = await walletKit.signTransaction(transaction.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // Convert the signed XDR string back to a Transaction object
  return TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
}

/**
 * Create contract instance
 */
export function getContract() {
  return new Contract(CONTRACT_ID);
}

/**
 * Get RPC server instance
 */
export function getRpcServer() {
  return new SorobanRpc.Server(RPC_URL);
}

/**
 * Initialize contract with admin
 * @param {string} adminAddress - Admin stellar address
 */
export async function initializeContract(adminAddress) {
  const server = getRpcServer();
  const contract = getContract();

  // Build transaction
  const account = await server.getAccount(adminAddress);

  // Convert admin address to Address ScVal
  const adminScVal = nativeToScVal(adminAddress, { type: 'address' });

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('initialize', adminScVal))
    .setTimeout(30)
    .build();

  // Sign with wallet
  const signedTx = await signTransaction(transaction);

  // Submit transaction
  const response = await server.sendTransaction(signedTx);
  return response;
}

/**
 * Register an issuer (admin only)
 * @param {string} issuerPubKey - Issuer's BLS public key (96 bytes hex)
 * @param {string} adminAddress - Admin stellar address
 */
export async function registerIssuer(issuerPubKey, adminAddress) {
  const server = getRpcServer();
  const contract = getContract();

  const account = await server.getAccount(adminAddress);

  // Convert hex string to Uint8Array for BytesN<96>
  const issuerBytes = Buffer.from(issuerPubKey, 'hex');
  const issuerScVal = nativeToScVal(issuerBytes, { type: 'bytes' });

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('register_issuer', issuerScVal))
    .setTimeout(30)
    .build();

  const signedTx = await signTransaction(transaction);

  const response = await server.sendTransaction(signedTx);
  return response;
}

/**
 * Get all registered issuers
 */
export async function getIssuers() {
  const server = getRpcServer();
  const contract = getContract();

  const transaction = new TransactionBuilder(
    new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
    {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }
  )
    .addOperation(contract.call('get_issuers'))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(transaction);
  if (response.results && response.results.length > 0) {
    // Parse the result
    const result = response.results[0].xdr;
    return result; // Will need proper XDR parsing
  }

  return [];
}

/**
 * Create keys for a ring
 * @param {number} ringSize - Number of keys to generate
 * @returns {Promise<{secretKeys: string[], publicKeys: string[]}>} Generated keys
 */
export async function createKeys(ringSize) {
  const server = getRpcServer();
  const contract = getContract();

  // Use a dummy account for simulation (read-only operation)
  const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

  // Convert ring size to u32 ScVal
  const ringSizeScVal = nativeToScVal(ringSize, { type: 'u32' });

  const transaction = new TransactionBuilder(dummyAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('create_keys', ringSizeScVal))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(transaction);

  console.log('createKeys simulation response:', JSON.stringify(response, null, 2));

  if (!response.result) {
    const errorMsg = response.error ? JSON.stringify(response.error) : 'no error details';
    console.error('Full simulation response:', JSON.stringify(response, null, 2));
    throw new Error(`Failed to create keys: no result returned. Error: ${errorMsg}`);
  }

  // Parse the KeyRingResult struct - response.result.retval contains the ScVal directly
  const resultScVal = response.result.retval;

  console.log('resultScVal:', JSON.stringify(resultScVal, null, 2));

  // The result is a struct with two fields: secret_keys (Vec) and ring (Vec)
  if (resultScVal._switch.name !== 'scvMap') {
    throw new Error('Unexpected result format from create_keys');
  }

  const mapEntries = resultScVal._value;
  let secretKeys = [];
  let publicKeys = [];

  for (const entry of mapEntries) {
    const key = entry._attributes.key;
    const val = entry._attributes.val;

    console.log('Processing entry - key:', JSON.stringify(key, null, 2));
    console.log('Processing entry - val:', JSON.stringify(val, null, 2));

    // Key is a Symbol, check which field this is
    if (key._switch.name === 'scvSymbol') {
      // Handle Buffer that's been serialized as {type: "Buffer", data: [...]}
      const keyData = key._value.data || key._value;
      const fieldName = Buffer.isBuffer(keyData) ? keyData.toString('utf8') : Buffer.from(keyData).toString('utf8');

      console.log('Field name:', fieldName);

      if (fieldName === 'secret_keys' && val._switch.name === 'scvVec') {
        const vecItems = val._value;
        secretKeys = vecItems.map(item => {
          if (item._switch.name === 'scvBytes') {
            const itemData = item._value.data || item._value;
            return Buffer.isBuffer(itemData) ? itemData.toString('hex') : Buffer.from(itemData).toString('hex');
          }
          return null;
        }).filter(k => k !== null);
      } else if (fieldName === 'ring' && val._switch.name === 'scvVec') {
        const vecItems = val._value;
        publicKeys = vecItems.map(item => {
          if (item._switch.name === 'scvBytes') {
            const itemData = item._value.data || item._value;
            return Buffer.isBuffer(itemData) ? itemData.toString('hex') : Buffer.from(itemData).toString('hex');
          }
          return null;
        }).filter(k => k !== null);
      }
    }
  }

  console.log('Parsed keys - secretKeys:', secretKeys, 'publicKeys:', publicKeys);

  return {
    secretKeys,
    publicKeys
  };
}

/**
 * Create ring for attribute
 * @param {string} issuerAddress - Issuer stellar address
 * @param {string} attribute - Attribute name (e.g., "over_18")
 * @param {Array<string>} userPubKeys - Array of user public keys (hex strings)
 */
export async function createRingForAttribute(issuerAddress, attribute, userPubKeys) {
  const server = getRpcServer();
  const contract = getContract();

  const account = await server.getAccount(issuerAddress);

  // Convert parameters to ScVal
  const issuerScVal = nativeToScVal(issuerAddress, { type: 'address' });
  const attributeScVal = nativeToScVal(attribute, { type: 'symbol' });

  // Convert each public key to bytes and wrap in a vector
  const pubKeyScVals = userPubKeys.map(key => {
    const keyBytes = Buffer.from(key, 'hex');
    return nativeToScVal(keyBytes, { type: 'bytes' });
  });
  const pubKeysVec = xdr.ScVal.scvVec(pubKeyScVals);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('create_ring_for_attribute', issuerScVal, attributeScVal, pubKeysVec)
    )
    .setTimeout(30)
    .build();

  const signedTx = await signTransaction(transaction);

  const response = await server.sendTransaction(signedTx);
  return response;
}

/**
 * Get ring for attribute
 * @param {string} attribute - Attribute name
 */
export async function getRingForAttribute(attribute) {
  const server = getRpcServer();
  const contract = getContract();

  // Convert attribute to Symbol ScVal
  const attributeScVal = nativeToScVal(attribute, { type: 'symbol' });

  const transaction = new TransactionBuilder(
    new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
    {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }
  )
    .addOperation(contract.call('get_ring_for_attribute', attributeScVal))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(transaction);
  if (response.results && response.results.length > 0) {
    return response.results[0]; // Will need proper XDR parsing
  }

  return null;
}

/**
 * Sign a message with ring signature
 * @param {string} message - Message to sign
 * @param {Array<string>} ring - Array of public keys in the ring
 * @param {number} secretIdx - Index of the secret key
 * @param {string} secretKey - Secret key (hex string)
 */
export async function signRing(message, ring, secretIdx, secretKey) {
  const server = getRpcServer();
  const contract = getContract();

  // Use a dummy account for simulation (signing is off-chain)
  const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

  // Convert parameters to ScVal
  const msgBytes = Buffer.from(message, 'utf8');
  const msgScVal = nativeToScVal(msgBytes, { type: 'bytes' });

  const ringScVals = ring.map(key => {
    const keyBytes = Buffer.from(key, 'hex');
    return nativeToScVal(keyBytes, { type: 'bytes' });
  });
  const ringVec = xdr.ScVal.scvVec(ringScVals);

  const secretIdxScVal = nativeToScVal(secretIdx, { type: 'u32' });

  const skBytes = Buffer.from(secretKey, 'hex');
  const skScVal = nativeToScVal(skBytes, { type: 'bytes' });

  const transaction = new TransactionBuilder(dummyAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('sign', msgScVal, ringVec, secretIdxScVal, skScVal))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(transaction);

  console.log('signRing simulation response:', JSON.stringify(response, null, 2));

  if (!response.result) {
    const errorMsg = response.error ? JSON.stringify(response.error) : 'no error details';
    console.error('Full simulation response:', JSON.stringify(response, null, 2));
    throw new Error(`Failed to sign: no result returned. Error: ${errorMsg}`);
  }

  // Return the signature ScVal from the result
  return response.result.retval;
}

/**
 * Verify ring signature for attribute
 * @param {string} message - Message that was signed
 * @param {Object} signature - Ring signature object
 * @param {string} attribute - Attribute name
 */
export async function verifyAttribute(message, signature, attribute) {
  const server = getRpcServer();
  const contract = getContract();

  const account = await server.getAccount(await connectWallet());

  // Convert parameters to ScVal
  const msgBytes = Buffer.from(message, 'utf8');
  const msgScVal = nativeToScVal(msgBytes, { type: 'bytes' });

  // Signature is already an XDR ScVal from the sign function result
  // If it's not, we'd need to convert it, but typically it comes from contract response
  const signatureScVal = signature;

  const attributeScVal = nativeToScVal(attribute, { type: 'symbol' });

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('verify_attribute', msgScVal, signatureScVal, attributeScVal))
    .setTimeout(30)
    .build();

  // First simulate to catch errors early
  console.log('Simulating verify_attribute...');
  const simResponse = await server.simulateTransaction(transaction);
  console.log('Simulation response:', JSON.stringify(simResponse, null, 2));

  if (!simResponse.result) {
    const errorMsg = simResponse.error ? JSON.stringify(simResponse.error) : 'no error details';
    console.error('Simulation failed:', errorMsg);
    throw new Error(`Verification simulation failed: ${errorMsg}`);
  }

  // Check if simulation returned false (verification failed in contract)
  if (simResponse.result.retval._value === false) {
    console.error('Contract returned false during simulation - ring may not exist or signature is invalid');
    throw new Error('Verification failed: Ring signature is invalid or attribute ring not found on-chain. The issuer may need to register the ring first.');
  }

  // Assemble transaction with simulation results (add resource fees and footprint)
  const assembledTx = SorobanRpc.assembleTransaction(transaction, simResponse).build();

  const signedTx = await signTransaction(assembledTx);

  const response = await server.sendTransaction(signedTx);
  console.log('Transaction response:', JSON.stringify(response, null, 2));

  // Parse result
  if (response.status === 'SUCCESS') {
    return true;
  }

  // If we get here, transaction failed
  const errorMsg = response.errorResultXdr || response.status || 'unknown error';
  throw new Error(`Transaction failed: ${errorMsg}`);
}

/**
 * Get login count
 */
export async function getLoginCount() {
  const server = getRpcServer();
  const contract = getContract();

  const transaction = new TransactionBuilder(
    new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
    {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }
  )
    .addOperation(contract.call('get_login_count'))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(transaction);
  if (response.results && response.results.length > 0) {
    return parseInt(response.results[0].xdr);
  }

  return 0;
}
