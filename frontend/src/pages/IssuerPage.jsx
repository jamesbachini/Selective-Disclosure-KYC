import React, { useState, useEffect } from 'react';
import { connectWallet, createKeys, createRingForAttribute, getWalletAddressIfConnected } from '../utils/contract';
import ProfessionalHeader from '../components/ProfessionalHeader';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function IssuerPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [issuers, setIssuers] = useState([]);
  const [selectedIssuerId, setSelectedIssuerId] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [credentialsInput, setCredentialsInput] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    loadIssuers();
    checkExistingWallet();
  }, []);

  const checkExistingWallet = async () => {
    const address = await getWalletAddressIfConnected();
    if (address) {
      setWalletAddress(address);
      console.log('Wallet already connected:', address);
    }
  };

  useEffect(() => {
    if (credentials && credentials.publicKey) {
      loadKYCRequests();
      const interval = setInterval(loadKYCRequests, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [credentials]);

  const loadIssuers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issuers`);
      const data = await response.json();
      setIssuers(data.issuers || []);
    } catch (error) {
      console.error('Error loading issuers:', error);
    }
  };

  const handleLoadCredentials = () => {
    try {
      const parsed = JSON.parse(credentialsInput);
      if (!parsed.publicKey || !parsed.secretKey || !parsed.name) {
        throw new Error('Invalid credentials format. Must include name, publicKey, and secretKey.');
      }
      setCredentials(parsed);
      setMessage({ text: `Loaded credentials for ${parsed.name}`, type: 'success' });
    } catch (error) {
      setMessage({ text: `Error parsing credentials: ${error.message}`, type: 'error' });
    }
  };

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

  const loadKYCRequests = async () => {
    if (!credentials || !credentials.publicKey) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/kyc-requests?issuerPubKey=${credentials.publicKey}&status=pending`);
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const handleApprove = async (request) => {
    if (!walletAddress) {
      setMessage({ text: 'Please connect wallet first', type: 'error' });
      return;
    }

    if (!credentials) {
      setMessage({ text: 'Please load your credentials first', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: 'Generating keys via smart contract...', type: 'info' });

      // Generate keys for each attribute the user qualifies for
      const userKeys = {};
      const rings = {};

      for (const attribute of request.attributes) {
        // Create a key for this user via smart contract
        const keyResult = await createKeys(1);

        if (!keyResult.secretKeys || !keyResult.publicKeys ||
            keyResult.secretKeys.length === 0 || keyResult.publicKeys.length === 0) {
          throw new Error(`Failed to generate keys for attribute ${attribute}`);
        }

        const userSecretKey = keyResult.secretKeys[0];
        const userPublicKey = keyResult.publicKeys[0];

        userKeys[attribute] = userSecretKey;

        // Create ring with user's public key and some decoy keys
        setMessage({ text: `Generating ring for ${attribute}...`, type: 'info' });
        const decoyKeys = await createKeys(4); // Generate 4 decoy keys

        const ring = [
          userPublicKey,
          ...decoyKeys.publicKeys
        ];

        rings[attribute] = ring;

        // Update the ring on-chain
        setMessage({ text: `Registering ring for ${attribute} on blockchain (this may take a moment)...`, type: 'info' });
        try {
          await createRingForAttribute(walletAddress, attribute, ring);
          setMessage({ text: `✓ Ring for ${attribute} registered and confirmed on blockchain`, type: 'success' });
        } catch (error) {
          console.error(`Error creating ring for ${attribute}:`, error);
          throw new Error(`Failed to register ring for ${attribute} on blockchain: ${error.message}. The credential cannot be issued without on-chain ring registration.`);
        }
      }

      // All rings registered successfully
      setMessage({ text: 'All rings registered, finalizing credential...', type: 'info' });

      // Create credential JSON
      const credential = {
        issuer: credentials.publicKey,
        user_keys: userKeys,
        rings: rings,
        issued_at: new Date().toISOString(),
      };

      setMessage({ text: 'Sending credential to backend...', type: 'info' });

      // Send approval to backend
      const response = await fetch(`${API_BASE_URL}/api/approve-kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.requestId,
          issuerPubKey: credentials.publicKey,
          credential,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          text: `KYC approved for user ${request.userId}! Credential issued with real keys.`,
          type: 'success',
        });
        await loadKYCRequests();
        setSelectedRequest(null);
      } else {
        throw new Error(result.error || 'Approval failed');
      }
    } catch (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (request, reason) => {
    if (!credentials) {
      setMessage({ text: 'Please load your credentials first', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/reject-kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.requestId,
          issuerPubKey: credentials.publicKey,
          reason: reason || 'KYC verification failed',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ text: `KYC rejected for user ${request.userId}`, type: 'success' });
        await loadKYCRequests();
        setSelectedRequest(null);
      } else {
        throw new Error(result.error || 'Rejection failed');
      }
    } catch (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <ProfessionalHeader
          title="Issuer Dashboard"
          subtitle="Review and approve KYC verification requests"
          variant="issuer"
        />

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
              <p className="text-sm text-gray-600">
                Connected as: <span className="font-mono">{walletAddress}</span>
              </p>
            )}
          </div>
        </div>

        {/* Issuer Credentials Setup */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Load Issuer Credentials
            </h3>
            {!credentials ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Issuer (Optional)
                  </label>
                  <select
                    value={selectedIssuerId}
                    onChange={(e) => setSelectedIssuerId(e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  >
                    <option value="">-- Select an issuer --</option>
                    {issuers.map((issuer) => (
                      <option key={issuer.id} value={issuer.id}>
                        {issuer.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {issuers.length === 0 ? 'No issuers registered yet. Contact admin.' : 'Select your issuer from the list'}
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Your JSON Credentials
                  </label>
                  <textarea
                    value={credentialsInput}
                    onChange={(e) => setCredentialsInput(e.target.value)}
                    placeholder={'{\n  "name": "Your Issuer Name",\n  "publicKey": "...",\n  "secretKey": "..."\n}'}
                    rows={6}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono text-xs"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Paste the JSON credentials provided by the admin
                  </p>
                </div>
                <button
                  onClick={handleLoadCredentials}
                  disabled={!credentialsInput.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  Load Credentials
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Credentials Loaded</h4>
                <dl className="space-y-1">
                  <div>
                    <dt className="text-xs text-green-700">Issuer Name:</dt>
                    <dd className="text-sm font-medium text-green-900">{credentials.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-green-700">Public Key:</dt>
                    <dd className="text-sm font-mono text-green-900 break-all">
                      {credentials.publicKey.substring(0, 40)}...{credentials.publicKey.substring(credentials.publicKey.length - 40)}
                    </dd>
                  </div>
                </dl>
                <button
                  onClick={() => {
                    setCredentials(null);
                    setCredentialsInput('');
                  }}
                  className="mt-3 text-sm text-green-700 hover:text-green-900 underline"
                >
                  Clear and load different credentials
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : message.type === 'error'
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Pending Requests */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Pending KYC Requests ({requests.length})
            </h3>

            {!credentials ? (
              <p className="text-gray-500">Please load your credentials to view requests.</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-500">No pending requests.</p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.requestId}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">
                          User: {request.userId}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Submitted: {new Date(request.timestamp).toLocaleString()}
                        </p>
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700">User Data:</h5>
                          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                            {Object.entries(request.userData).map(([key, value]) => (
                              <div key={key}>
                                <dt className="text-xs text-gray-500 capitalize">{key}:</dt>
                                <dd className="text-sm text-gray-900">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>

                        {/* Document Photo */}
                        {request.documentPhoto && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">
                              Identity Document:
                            </h5>
                            <div className="relative group">
                              <div
                                className="border-2 border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors"
                                onClick={() => setViewingDocument(request.documentPhoto)}
                              >
                                <img
                                  src={request.documentPhoto}
                                  alt="User document"
                                  className="w-full max-w-md h-48 object-cover"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                                  <span className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-900 shadow-lg">
                                    Click to enlarge
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700">
                            Requested Attributes:
                          </h5>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {request.attributes.map((attr) => (
                              <span
                                key={attr}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                              >
                                {attr}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => handleApprove(request)}
                          disabled={loading}
                          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request)}
                          disabled={loading}
                          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Instructions</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>Connect your Stellar wallet to sign blockchain transactions</li>
            <li>Paste the JSON credentials provided by the admin to load your issuer identity</li>
            <li>Review user information and identity document photo</li>
            <li>Click on document photos to view in full size</li>
            <li>Approve or reject KYC requests based on verification</li>
            <li>
              Approving generates real cryptographic key pairs via the smart contract for each attribute
            </li>
            <li>Ring signatures are created with user's key plus decoy keys for anonymity</li>
            <li>The credential JSON is sent to the user for secure local storage</li>
          </ul>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingDocument(null)}
        >
          <div className="relative max-w-5xl max-h-full">
            <button
              onClick={() => setViewingDocument(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600">
                <h3 className="text-lg font-semibold text-white">Identity Document Verification</h3>
                <p className="text-sm text-indigo-100 mt-1">
                  Please verify the document details match the provided user information
                </p>
              </div>
              <div className="p-6 bg-gray-50">
                <img
                  src={viewingDocument}
                  alt="Document full view"
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="p-4 bg-white border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setViewingDocument(null)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IssuerPage;
