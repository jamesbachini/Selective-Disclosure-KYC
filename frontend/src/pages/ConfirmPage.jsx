import React, { useState, useEffect } from 'react';
import { loadCredential, hasCredential, formatCredential, deleteCredential } from '../utils/credentials';
import { signRing, verifyAttribute, getLoginCount, getWalletAddressIfConnected, connectWallet } from '../utils/contract';
import ProfessionalHeader from '../components/ProfessionalHeader';

function ConfirmPage() {
  const [credential, setCredential] = useState(null);
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [challenge, setChallenge] = useState('');
  const [signature, setSignature] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loginCount, setLoginCount] = useState(0);
  const [showCredentialDetails, setShowCredentialDetails] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    loadUserCredential();
    loadLoginCount();
    checkExistingWallet();
  }, []);

  const checkExistingWallet = async () => {
    const address = await getWalletAddressIfConnected();
    if (address) {
      setWalletAddress(address);
      console.log('Wallet already connected:', address);
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

  const loadUserCredential = async () => {
    try {
      if (hasCredential()) {
        const cred = await loadCredential();
        if (cred) {
          setCredential(cred);
          // Set first attribute as default
          const attributes = Object.keys(cred.user_keys);
          if (attributes.length > 0) {
            setSelectedAttribute(attributes[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading credential:', error);
      setMessage({ text: 'Error loading credential. Please get verified first.', type: 'error' });
    }
  };

  const loadLoginCount = async () => {
    try {
      const count = await getLoginCount();
      setLoginCount(count);
    } catch (error) {
      console.error('Error loading login count:', error);
    }
  };

  const generateChallenge = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const challengeMsg = `prove_${selectedAttribute}_${timestamp}_${random}`;
    setChallenge(challengeMsg);
    setSignature(null);
    setVerificationResult(null);
    return challengeMsg;
  };

  const handleSign = async () => {
    if (!credential || !selectedAttribute) {
      setMessage({ text: 'Please select an attribute', type: 'error' });
      return;
    }

    if (!challenge) {
      const newChallenge = generateChallenge();
      setMessage({ text: `Challenge generated: ${newChallenge}`, type: 'info' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: 'Signing challenge with ring signature...', type: 'info' });

      const ring = credential.rings[selectedAttribute];
      const secretKey = credential.user_keys[selectedAttribute];

      // In a real implementation, we need to know the index of our public key in the ring
      // For demo, we'll use index 0
      const secretIdx = 0;

      // Sign the challenge
      const sig = await signRing(challenge, ring, secretIdx, secretKey);
      setSignature(sig);

      setMessage({
        text: 'Challenge signed successfully! Now verify to prove your attribute.',
        type: 'success',
      });
    } catch (error) {
      console.error('Signing error:', error);
      setMessage({ text: `Signing failed: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signature) {
      setMessage({ text: 'Please sign the challenge first', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: 'Verifying ring signature on-chain...', type: 'info' });

      // Verify the signature
      const isValid = await verifyAttribute(challenge, signature, selectedAttribute);

      setVerificationResult(isValid);

      if (isValid) {
        setMessage({
          text: `✅ Verification successful! You have proven you have the "${selectedAttribute}" attribute without revealing your identity.`,
          type: 'success',
        });
        // Reload login count
        await loadLoginCount();
      } else {
        setMessage({
          text: '❌ Verification failed. The signature could not be verified.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setMessage({ text: `Verification failed: ${error.message}`, type: 'error' });
      setVerificationResult(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setChallenge('');
    setSignature(null);
    setVerificationResult(null);
    setMessage({ text: '', type: '' });
  };

  const handleDeleteCredential = () => {
    if (window.confirm('Are you sure you want to delete your credential? This cannot be undone.')) {
      deleteCredential();
      setCredential(null);
      setMessage({ text: 'Credential deleted successfully', type: 'success' });
    }
  };

  if (!credential) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-yellow-900 mb-4">No Credential Found</h2>
            <p className="text-yellow-800 mb-6">
              You need to complete KYC verification first to receive a credential.
            </p>
            <a
              href="/verify"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Get Verified
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <ProfessionalHeader
          title="Prove Your Identity"
          subtitle="Anonymous verification using ring signatures"
          variant="primary"
        />

        {/* Wallet Connection */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Wallet Connection
            </h3>
            {!walletAddress ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Connect your wallet to sign transactions for on-chain verification.
                </p>
                <button
                  onClick={handleConnectWallet}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Connected as: <span className="font-mono text-green-700">{walletAddress}</span>
              </p>
            )}
          </div>
        </div>

        {/* Login Count Display */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Successful Verifications</h3>
              <p className="text-indigo-100 text-sm">
                Total anonymous verifications on this contract
              </p>
            </div>
            <div className="text-5xl font-bold">{loginCount}</div>
          </div>
        </div>

        {/* Credential Info */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                  Your Credential
                </h3>
                <div className="text-sm text-gray-600">
                  <p>
                    Issuer: <span className="font-mono">{credential.issuer.substring(0, 20)}...</span>
                  </p>
                  <p className="mt-1">
                    Attributes: {Object.keys(credential.user_keys).join(', ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCredentialDetails(!showCredentialDetails)}
                className="ml-4 text-sm text-indigo-600 hover:text-indigo-800"
              >
                {showCredentialDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {showCredentialDetails && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(credential, null, 2)}
                </pre>
                <button
                  onClick={handleDeleteCredential}
                  className="mt-4 text-sm text-red-600 hover:text-red-800"
                >
                  Delete Credential
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

        {/* Attribute Selection */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Select Attribute to Prove
            </h3>
            <select
              value={selectedAttribute}
              onChange={(e) => {
                setSelectedAttribute(e.target.value);
                handleReset();
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            >
              {Object.keys(credential.user_keys).map((attr) => (
                <option key={attr} value={attr}>
                  {attr.replace(/_/g, ' ').toUpperCase()} (Ring size:{' '}
                  {credential.rings[attr].length})
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              You will prove you belong to this attribute group without revealing which key is
              yours.
            </p>
          </div>
        </div>

        {/* Challenge Section */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Challenge</h3>

            {!challenge ? (
              <button
                onClick={generateChallenge}
                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Generate Challenge
              </button>
            ) : (
              <div>
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Challenge Message:</p>
                  <p className="font-mono text-sm break-all">{challenge}</p>
                </div>

                {signature && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-green-800 font-medium mb-1">
                      ✓ Challenge Signed
                    </p>
                    <p className="text-xs text-green-700">
                      Ring signature generated using your private key
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSign}
                    disabled={loading || signature}
                    className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {signature ? 'Signed ✓' : loading ? 'Signing...' : 'Sign Challenge'}
                  </button>

                  <button
                    onClick={handleVerify}
                    disabled={loading || !signature || verificationResult !== null || !walletAddress}
                    className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
                    title={!walletAddress ? 'Connect wallet first' : ''}
                  >
                    {loading ? 'Verifying...' : !walletAddress ? 'Connect Wallet First' : 'Verify On-Chain'}
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verification Result */}
        {verificationResult !== null && (
          <div
            className={`p-6 rounded-lg text-center ${
              verificationResult
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-red-50 border-2 border-red-500'
            }`}
          >
            <div className="text-6xl mb-4">{verificationResult ? '✅' : '❌'}</div>
            <h3 className="text-2xl font-bold mb-2">
              {verificationResult ? 'Verification Successful!' : 'Verification Failed'}
            </h3>
            <p className="text-gray-700">
              {verificationResult
                ? `You have successfully proven you have the "${selectedAttribute}" attribute without revealing your identity. The smart contract verified your ring signature anonymously.`
                : 'The ring signature could not be verified. Please try again with a new challenge.'}
            </p>
          </div>
        )}

        {/* How it Works */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">How Ring Signatures Work</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
            <li>
              <strong>Select an attribute</strong> - Choose which verified attribute you want to
              prove (e.g., "over_18")
            </li>
            <li>
              <strong>Generate challenge</strong> - Create a random message to sign
            </li>
            <li>
              <strong>Sign with your private key</strong> - Create a ring signature using your
              attribute's private key
            </li>
            <li>
              <strong>Verify on-chain</strong> - The smart contract verifies you're in the
              attribute ring WITHOUT revealing which key is yours
            </li>
            <li>
              <strong>Anonymous proof</strong> - The verifier knows you have the attribute but
              can't identify you within the group
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default ConfirmPage;
