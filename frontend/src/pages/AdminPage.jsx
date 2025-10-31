import React, { useState, useEffect } from 'react';
import { connectWallet, registerIssuer, initializeContract, createKeys } from '../utils/contract';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function AdminPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [issuers, setIssuers] = useState([]);
  const [newIssuerName, setNewIssuerName] = useState('');
  const [generatedKeys, setGeneratedKeys] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isInitialized, setIsInitialized] = useState(true);

  useEffect(() => {
    loadIssuers();
  }, []);

  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      const address = await connectWallet();
      setWalletAddress(address);
      setMessage({ text: `Connected: ${address}`, type: 'success' });
    } catch (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadIssuers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/issuers`);
      const data = await response.json();
      setIssuers(data.issuers || []);
    } catch (error) {
      console.error('Error loading issuers:', error);
      setMessage({ text: 'Error loading issuers from backend', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!walletAddress) {
      setMessage({ text: 'Please connect wallet first', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      await initializeContract(walletAddress);
      setMessage({ text: 'Contract initialized successfully!', type: 'success' });
      setIsInitialized(true);
    } catch (error) {
      setMessage({ text: `Error initializing: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeIssuer = async (e) => {
    e.preventDefault();

    if (!walletAddress) {
      setMessage({ text: 'Please connect wallet first', type: 'error' });
      return;
    }

    if (!newIssuerName || newIssuerName.trim() === '') {
      setMessage({ text: 'Please enter an issuer name', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: 'Generating keys via smart contract...', type: 'info' });

      // Generate keys via smart contract simulation
      const keys = await createKeys(1);

      if (!keys.publicKeys || keys.publicKeys.length === 0 || !keys.secretKeys || keys.secretKeys.length === 0) {
        throw new Error('Failed to generate keys from contract');
      }

      const publicKey = keys.publicKeys[0];
      const secretKey = keys.secretKeys[0];

      setMessage({ text: 'Registering issuer on blockchain...', type: 'info' });

      // Register issuer's public key on the blockchain
      await registerIssuer(publicKey, walletAddress);

      setMessage({ text: 'Saving issuer to backend...', type: 'info' });

      // Store issuer in backend
      const response = await fetch(`${API_URL}/api/issuers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIssuerName,
          publicKey: publicKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save issuer to backend');
      }

      // Store generated keys for display
      setGeneratedKeys({
        name: newIssuerName,
        publicKey,
        secretKey
      });

      setMessage({ text: 'Issuer authorized successfully! Keys generated below.', type: 'success' });
      setNewIssuerName('');
      await loadIssuers();
    } catch (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: 'Copied to clipboard!', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Wallet Connection */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Wallet Connection
            </h3>
            {!walletAddress ? (
              <button
                onClick={handleConnectWallet}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div>
                <p className="text-sm text-gray-600">
                  Connected as: <span className="font-mono">{walletAddress}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contract Initialization */}
        {!isInitialized && walletAddress && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">
              Contract Not Initialized
            </h3>
            <p className="text-sm text-yellow-700 mb-4">
              The contract needs to be initialized with an admin address before use.
            </p>
            <button
              onClick={handleInitialize}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400"
            >
              {loading ? 'Initializing...' : 'Initialize Contract'}
            </button>
          </div>
        )}

        {/* Messages */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : message.type === 'error'
                ? 'bg-red-50 text-red-800'
                : 'bg-yellow-50 text-yellow-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Authorize Issuer Form */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Authorize New Issuer
            </h3>
            <form onSubmit={handleAuthorizeIssuer}>
              <div className="mb-4">
                <label
                  htmlFor="issuerName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Issuer Name
                </label>
                <input
                  type="text"
                  id="issuerName"
                  value={newIssuerName}
                  onChange={(e) => setNewIssuerName(e.target.value)}
                  placeholder="e.g., Government ID Verifier, Bank KYC Provider"
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will generate cryptographic keys via the smart contract
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !walletAddress}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? 'Authorizing...' : 'Authorize New Issuer'}
              </button>
            </form>
          </div>
        </div>

        {/* Generated Keys Display */}
        {generatedKeys && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-green-900 mb-4">
              Issuer Credentials Generated
            </h3>
            <p className="text-sm text-green-800 mb-4">
              <strong>IMPORTANT:</strong> Save these credentials securely and provide them to the issuer.
              The secret key cannot be recovered if lost.
            </p>
            <div className="bg-white rounded-md p-4 font-mono text-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-gray-700 font-bold">JSON Credentials:</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(generatedKeys, null, 2))}
                  className="text-indigo-600 hover:text-indigo-800 text-xs underline"
                >
                  Copy All
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-all text-gray-600">
{JSON.stringify(generatedKeys, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => setGeneratedKeys(null)}
              className="mt-4 text-sm text-green-700 hover:text-green-900 underline"
            >
              Clear credentials
            </button>
          </div>
        )}

        {/* Registered Issuers List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Authorized Issuers ({issuers.length})
            </h3>
            {issuers.length === 0 ? (
              <p className="text-gray-500">No issuers authorized yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Public Key
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {issuers.map((issuer, index) => (
                      <tr key={issuer.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {issuer.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {issuer.publicKey.substring(0, 20)}...{issuer.publicKey.substring(issuer.publicKey.length - 20)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Instructions</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>Connect your Stellar wallet (Freighter) to authenticate as admin</li>
            <li>If this is the first time, initialize the contract with your admin address</li>
            <li>Enter an issuer name and click "Authorize New Issuer" to generate real cryptographic keys via the smart contract</li>
            <li>Copy the generated JSON credentials and securely provide them to the issuer</li>
            <li>Only authorized issuers can approve KYC requests and add users to attribute rings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
