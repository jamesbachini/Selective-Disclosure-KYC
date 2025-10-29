import React, { useState, useEffect } from 'react';
import { connectWallet, registerIssuer, getIssuers, initializeContract } from '../utils/contract';

function AdminPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [issuers, setIssuers] = useState([]);
  const [newIssuerKey, setNewIssuerKey] = useState('');
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
      const issuersList = await getIssuers();
      setIssuers(issuersList);
    } catch (error) {
      console.error('Error loading issuers:', error);
      setMessage({ text: 'Note: Contract may not be initialized yet', type: 'warning' });
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

  const handleRegisterIssuer = async (e) => {
    e.preventDefault();

    if (!walletAddress) {
      setMessage({ text: 'Please connect wallet first', type: 'error' });
      return;
    }

    if (!newIssuerKey || newIssuerKey.length !== 192) {
      setMessage({ text: 'Please enter a valid 96-byte public key (192 hex characters)', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      await registerIssuer(newIssuerKey, walletAddress);
      setMessage({ text: 'Issuer registered successfully!', type: 'success' });
      setNewIssuerKey('');
      await loadIssuers();
    } catch (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const generateMockIssuerKey = () => {
    // Generate a mock 96-byte public key for testing
    const mockKey = Array.from({ length: 192 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setNewIssuerKey(mockKey);
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
                {loading ? 'Connecting...' : 'Connect Freighter Wallet'}
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

        {/* Register Issuer Form */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Register New Issuer
            </h3>
            <form onSubmit={handleRegisterIssuer}>
              <div className="mb-4">
                <label
                  htmlFor="issuerKey"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Issuer BLS Public Key (96 bytes / 192 hex characters)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="issuerKey"
                    value={newIssuerKey}
                    onChange={(e) => setNewIssuerKey(e.target.value)}
                    placeholder="Enter 192 character hex string..."
                    className="flex-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                  <button
                    type="button"
                    onClick={generateMockIssuerKey}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Generate Mock Key
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Current length: {newIssuerKey.length} / 192
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !walletAddress}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? 'Registering...' : 'Register Issuer'}
              </button>
            </form>
          </div>
        </div>

        {/* Registered Issuers List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Registered Issuers ({issuers.length})
            </h3>
            {issuers.length === 0 ? (
              <p className="text-gray-500">No issuers registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
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
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {issuer.substring(0, 20)}...{issuer.substring(issuer.length - 20)}
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
            <li>Connect your Freighter wallet to authenticate as admin</li>
            <li>If this is the first time, initialize the contract with your admin address</li>
            <li>Register trusted KYC issuers by entering their BLS public keys</li>
            <li>Only registered issuers can approve KYC requests and add users to attribute rings</li>
            <li>For testing, use the "Generate Mock Key" button to create sample issuer keys</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
