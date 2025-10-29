// Soroban contract interaction utilities
import { Contract, SorobanRpc, TransactionBuilder, Networks, BASE_FEE } from '@stellar/stellar-sdk';

// Contract configuration
export const CONTRACT_ID = process.env.VITE_CONTRACT_ID || 'YOUR_CONTRACT_ID_HERE';
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = 'https://soroban-testnet.stellar.org';

/**
 * Get Freighter wallet connection
 */
export async function connectWallet() {
  if (!window.freighter) {
    throw new Error('Freighter wallet not installed');
  }

  const isAllowed = await window.freighter.isAllowed();
  if (!isAllowed) {
    await window.freighter.setAllowed();
  }

  const publicKey = await window.freighter.getPublicKey();
  return publicKey;
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
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('initialize', adminAddress))
    .setTimeout(30)
    .build();

  // Sign with Freighter
  const signedTx = await window.freighter.signTransaction(transaction.toXDR(), {
    network: NETWORK_PASSPHRASE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

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
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('register_issuer', Buffer.from(issuerPubKey, 'hex')))
    .setTimeout(30)
    .build();

  const signedTx = await window.freighter.signTransaction(transaction.toXDR(), {
    network: NETWORK_PASSPHRASE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

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
    new SorobanRpc.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
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
 */
export async function createKeys(ringSize) {
  const server = getRpcServer();
  const contract = getContract();

  const account = await server.getAccount(await connectWallet());
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('create_keys', ringSize))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(transaction);
  if (response.results && response.results.length > 0) {
    return response.results[0]; // Will need proper XDR parsing
  }

  throw new Error('Failed to create keys');
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
  const pubKeyBuffers = userPubKeys.map(key => Buffer.from(key, 'hex'));

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('create_ring_for_attribute', issuerAddress, attribute, pubKeyBuffers)
    )
    .setTimeout(30)
    .build();

  const signedTx = await window.freighter.signTransaction(transaction.toXDR(), {
    network: NETWORK_PASSPHRASE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

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

  const transaction = new TransactionBuilder(
    new SorobanRpc.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
    {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }
  )
    .addOperation(contract.call('get_ring_for_attribute', attribute))
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

  const account = await server.getAccount(await connectWallet());
  const msgBuffer = Buffer.from(message, 'utf8');
  const ringBuffers = ring.map(key => Buffer.from(key, 'hex'));
  const skBuffer = Buffer.from(secretKey, 'hex');

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('sign', msgBuffer, ringBuffers, secretIdx, skBuffer))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(transaction);
  if (response.results && response.results.length > 0) {
    return response.results[0]; // Will need proper XDR parsing
  }

  throw new Error('Failed to sign');
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
  const msgBuffer = Buffer.from(message, 'utf8');

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('verify_attribute', msgBuffer, signature, attribute))
    .setTimeout(30)
    .build();

  const signedTx = await window.freighter.signTransaction(transaction.toXDR(), {
    network: NETWORK_PASSPHRASE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const response = await server.sendTransaction(signedTx);

  // Parse result
  if (response.status === 'SUCCESS') {
    return true;
  }

  return false;
}

/**
 * Get login count
 */
export async function getLoginCount() {
  const server = getRpcServer();
  const contract = getContract();

  const transaction = new TransactionBuilder(
    new SorobanRpc.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
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
