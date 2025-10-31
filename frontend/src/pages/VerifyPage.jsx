import React, { useState, useEffect } from 'react';
import { generateUserId, saveCredential } from '../utils/credentials';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AVAILABLE_ATTRIBUTES = [
  { id: 'over_18', label: 'Over 18 years old', description: 'Verify age requirement' },
  { id: 'over_21', label: 'Over 21 years old', description: 'Verify legal drinking age' },
  { id: 'resident_uk', label: 'UK Resident', description: 'Verify UK residency' },
  { id: 'resident_us', label: 'US Resident', description: 'Verify US residency' },
  { id: 'no_criminal_history', label: 'No Criminal History', description: 'Background check clear' },
  { id: 'accredited_investor', label: 'Accredited Investor', description: 'Verify investment status' },
];

function VerifyPage() {
  const [userId, setUserId] = useState('');
  const [issuers, setIssuers] = useState([]);
  const [selectedIssuer, setSelectedIssuer] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    country: '',
    dob: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [checkingCredential, setCheckingCredential] = useState(false);

  useEffect(() => {
    // Generate user ID on mount
    setUserId(generateUserId());
    loadIssuers();
  }, []);

  useEffect(() => {
    // Poll for credential if request was submitted
    if (requestSubmitted && userId) {
      const interval = setInterval(checkForCredential, 3000);
      return () => clearInterval(interval);
    }
  }, [requestSubmitted, userId]);

  const loadIssuers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issuers`);
      const data = await response.json();
      setIssuers(data.issuers || []);
      if (data.issuers && data.issuers.length > 0) {
        setSelectedIssuer(data.issuers[0].publicKey);
      }
    } catch (error) {
      console.error('Error loading issuers:', error);
      setMessage({ text: 'Error loading issuers from backend', type: 'error' });
    }
  };

  const handleAttributeToggle = (attrId) => {
    setSelectedAttributes((prev) =>
      prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedIssuer) {
      setMessage({ text: 'Please select an issuer', type: 'error' });
      return;
    }

    if (selectedAttributes.length === 0) {
      setMessage({ text: 'Please select at least one attribute to verify', type: 'error' });
      return;
    }

    if (!userData.name || !userData.email || !userData.dob) {
      setMessage({ text: 'Please fill in all required fields', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/request-kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          issuerPubKey: selectedIssuer,
          attributes: selectedAttributes,
          userData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setRequestId(result.requestId);
        setRequestSubmitted(true);
        setMessage({
          text: 'KYC request submitted! Waiting for issuer approval...',
          type: 'success',
        });
      } else {
        throw new Error(result.error || 'Request failed');
      }
    } catch (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const checkForCredential = async () => {
    if (checkingCredential) return;

    try {
      setCheckingCredential(true);
      const response = await fetch(`${API_BASE_URL}/api/credential/${userId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.credential) {
          // Save credential to localStorage
          saveCredential(data.credential);

          setMessage({
            text: 'Credential received and saved! You can now prove your attributes.',
            type: 'success',
          });
          setRequestSubmitted(false);

          // Redirect to confirm page after a delay
          setTimeout(() => {
            window.location.href = '/confirm';
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error checking for credential:', error);
    } finally {
      setCheckingCredential(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Get Verified</h1>

        {/* User ID Display */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Your User ID</h3>
            <p className="text-sm text-gray-600 font-mono">{userId}</p>
            <p className="text-xs text-gray-500 mt-1">
              Save this ID to check your credential status later
            </p>
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
            {requestSubmitted && (
              <div className="mt-2">
                <div className="animate-pulse text-sm">Checking for approval...</div>
              </div>
            )}
          </div>
        )}

        {!requestSubmitted ? (
          <form onSubmit={handleSubmit}>
            {/* Issuer Selection */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Select KYC Provider
                </h3>
                {issuers.length === 0 ? (
                  <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-md">
                    No KYC providers available yet. Please contact the admin to authorize issuers.
                  </div>
                ) : (
                  <select
                    value={selectedIssuer}
                    onChange={(e) => setSelectedIssuer(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                  >
                    {issuers.map((issuer) => (
                      <option key={issuer.id} value={issuer.publicKey}>
                        {issuer.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Attribute Selection */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Select Attributes to Verify
                </h3>
                <div className="space-y-3">
                  {AVAILABLE_ATTRIBUTES.map((attr) => (
                    <div key={attr.id} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={attr.id}
                          type="checkbox"
                          checked={selectedAttributes.includes(attr.id)}
                          onChange={() => handleAttributeToggle(attr.id)}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={attr.id} className="font-medium text-gray-700">
                          {attr.label}
                        </label>
                        <p className="text-gray-500">{attr.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Information Form */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Your Information
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={userData.dob}
                      onChange={(e) => setUserData({ ...userData, dob: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country</label>
                    <input
                      type="text"
                      value={userData.country}
                      onChange={(e) => setUserData({ ...userData, country: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={userData.address}
                      onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    Note: This is a demo. In production, this would include document upload,
                    liveness check, and other verification steps.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || issuers.length === 0}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {loading ? 'Submitting...' : issuers.length === 0 ? 'No KYC Providers Available' : 'Submit KYC Request'}
            </button>
          </form>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Waiting for Issuer Approval
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Request ID: <span className="font-mono">{requestId}</span>
            </p>
            <p className="text-sm text-gray-500">
              Your KYC request has been submitted to the issuer. This page will automatically
              update when your credential is ready.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyPage;
