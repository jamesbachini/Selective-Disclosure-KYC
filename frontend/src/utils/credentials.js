// Credential storage and encryption utilities

const STORAGE_KEY = 'kyc_credential';

/**
 * Encrypt credential data using Web Crypto API
 * @param {Object} credential - The credential object to encrypt
 * @param {string} password - Password for encryption
 * @returns {Promise<string>} Base64 encoded encrypted data
 */
export async function encryptCredential(credential, password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(credential));

  // Derive key from password
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine salt, iv, and encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt credential data
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} password - Password for decryption
 * @returns {Promise<Object>} Decrypted credential object
 */
export async function decryptCredential(encryptedData, password) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Decode base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);

  // Derive key from password
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return JSON.parse(decoder.decode(decrypted));
}

/**
 * Save credential to localStorage
 * @param {Object} credential - The credential object
 * @param {string} password - Optional password for encryption
 */
export function saveCredential(credential, password = null) {
  if (password) {
    // Store with encryption promise
    encryptCredential(credential, password).then(encrypted => {
      localStorage.setItem(STORAGE_KEY, encrypted);
      localStorage.setItem(`${STORAGE_KEY}_encrypted`, 'true');
    });
  } else {
    // Store in plaintext (not recommended for production)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
    localStorage.setItem(`${STORAGE_KEY}_encrypted`, 'false');
  }
}

/**
 * Load credential from localStorage
 * @param {string} password - Password if credential is encrypted
 * @returns {Promise<Object|null>} The credential object or null
 */
export async function loadCredential(password = null) {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;

  const isEncrypted = localStorage.getItem(`${STORAGE_KEY}_encrypted`) === 'true';

  if (isEncrypted && password) {
    try {
      return await decryptCredential(data, password);
    } catch (error) {
      console.error('Failed to decrypt credential:', error);
      return null;
    }
  } else if (!isEncrypted) {
    return JSON.parse(data);
  }

  return null;
}

/**
 * Delete credential from localStorage
 */
export function deleteCredential() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(`${STORAGE_KEY}_encrypted`);
}

/**
 * Check if credential exists
 * @returns {boolean}
 */
export function hasCredential() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Generate a unique user ID
 * @returns {string}
 */
export function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format credential for display
 * @param {Object} credential
 * @returns {Object}
 */
export function formatCredential(credential) {
  return {
    issuer: credential.issuer.substring(0, 10) + '...',
    attributes: Object.keys(credential.user_keys),
    rings: Object.entries(credential.rings).map(([attr, ring]) => ({
      attribute: attr,
      size: ring.length,
    })),
  };
}
