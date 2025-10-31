import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-3xl md:text-4xl">
            <span className="block text-indigo-600">Privacy-Preserving Identity Verification</span>
          </h1>
          <p className="mt-3 text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl">
            Prove your attributes without revealing your identity using BLS ring signatures and Soroban smart contracts.
          </p>
        </div>
        <div className="flex-shrink-0">
          <img src="/shield.png" alt="Shield" className="w-32 h-32 md:w-40 md:h-40" />
        </div>
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Admin</h3>
              <p className="mt-2 text-sm text-gray-500">
                Register and manage trusted KYC issuers
              </p>
              <Link
                to="/admin"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Go to Admin
              </Link>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Issuer</h3>
              <p className="mt-2 text-sm text-gray-500">
                Review and approve KYC requests from users
              </p>
              <Link
                to="/issuer"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Go to Issuer
              </Link>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Get Verified</h3>
              <p className="mt-2 text-sm text-gray-500">
                Complete KYC verification and receive credentials
              </p>
              <Link
                to="/verify"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Get Verified
              </Link>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Prove Identity</h3>
              <p className="mt-2 text-sm text-gray-500">
                Prove your attributes anonymously using ring signatures
              </p>
              <Link
                to="/confirm"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Prove Identity
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="space-y-4 text-gray-600">
            <div>
              <h3 className="font-semibold text-gray-900">1. Admin registers trusted issuers</h3>
              <p>The system administrator approves KYC providers who can verify user attributes.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">2. Users complete KYC verification</h3>
              <p>Users submit their information to a trusted issuer for verification.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">3. Issuers create credential rings</h3>
              <p>After verification, issuers add users to attribute-specific key rings (e.g., "over_18", "resident_UK").</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">4. Users prove attributes anonymously</h3>
              <p>Users can prove they have an attribute by signing challenges with ring signatures, maintaining anonymity within the group.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
