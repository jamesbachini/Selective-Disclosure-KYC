import React, { useState, useEffect } from 'react';
import { connectWallet, createKeys, createRingForAttribute } from '../utils/contract';

const API_BASE_URL = '/api';

function IssuerPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [issuerKey, setIssuerKey] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    if (issuerKey) {
      loadKYCRequests();
      const interval = setInterval(loadKYCRequests, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [issuerKey]);

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
    try {
      const response = await fetch(`${API_BASE_URL}/kyc-requests?issuerPubKey=${issuerKey}&status=pending`);
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

    try {
      setLoading(true);
      setMessage({ text: 'Creating keys and credential...', type: 'info' });

      // Generate keys for each attribute the user qualifies for
      const userKeys = {};
      const rings = {};

      for (const attribute of request.attributes) {
        // Create a key for this user
        const keyResult = await createKeys(1);
        // In a real implementation, parse the keyResult properly
        const mockSecretKey = Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        const mockPublicKey = Array.from({ length: 192 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('');

        userKeys[attribute] = mockSecretKey;

        // Get existing ring for this attribute or create new one
        // For demo purposes, we'll create a mock ring
        const mockRing = [
          mockPublicKey,
          // Add some other mock keys for anonymity
          ...Array.from({ length: 4 }, () =>
            Array.from({ length: 192 }, () =>
              Math.floor(Math.random() * 16).toString(16)
            ).join('')
          ),
        ];

        rings[attribute] = mockRing;

        // Update the ring on-chain
        try {
          await createRingForAttribute(walletAddress, attribute, mockRing);
        } catch (error) {
          console.error(`Error creating ring for ${attribute}:`, error);
          // Continue anyway for demo
        }
      }

      // Create credential JSON
      const credential = {
        issuer: issuerKey,
        user_keys: userKeys,
        rings: rings,
        issued_at: new Date().toISOString(),
      };

      // Send approval to backend
      const response = await fetch(`${API_BASE_URL}/approve-kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.requestId,
          issuerPubKey: issuerKey,
          credential,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          text: `KYC approved for user ${request.userId}! Credential issued.`,
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
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/reject-kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.requestId,
          issuerPubKey: issuerKey,
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

  const generateMockIssuerKey = () => {
    const mockKey = Array.from({ length: 192 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setIssuerKey(mockKey);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Issuer Dashboard</h1>

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
              <p className="text-sm text-gray-600">
                Connected as: <span className="font-mono">{walletAddress}</span>
              </p>
            )}
          </div>
        </div>

        {/* Issuer Key Setup */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Issuer Identity
            </h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your BLS Public Key (must be registered by admin)
                </label>
                <input
                  type="text"
                  value={issuerKey}
                  onChange={(e) => setIssuerKey(e.target.value)}
                  placeholder="Enter your 192 character hex public key..."
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
              <button
                type="button"
                onClick={generateMockIssuerKey}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Generate Mock Key
              </button>
            </div>
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

            {!issuerKey ? (
              <p className="text-gray-500">Please enter your issuer key to view requests.</p>
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
            <li>Connect your Freighter wallet to sign transactions</li>
            <li>Enter your registered issuer public key to view pending KYC requests</li>
            <li>Review user information and approve or reject requests</li>
            <li>
              Approving creates key pairs for each attribute and adds the user to corresponding
              rings
            </li>
            <li>The credential JSON is sent to the user for local storage</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default IssuerPage;
