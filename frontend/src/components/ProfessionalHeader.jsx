import React from 'react';

const ProfessionalHeader = ({ title, subtitle, variant = 'primary' }) => {
  const gradients = {
    primary: 'from-indigo-600 via-purple-600 to-indigo-800',
    admin: 'from-gray-900 via-gray-800 to-gray-900',
    issuer: 'from-blue-600 via-cyan-600 to-blue-800',
    user: 'from-green-600 via-teal-600 to-green-800'
  };

  return (
    <div className={`bg-gradient-to-r ${gradients[variant]} text-white shadow-2xl mb-8 rounded-xl overflow-hidden`}>
      <div className="px-6 py-8 sm:px-8 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex-1">
            {/* Security Badge */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-semibold">SECURE KYC SYSTEM</span>
              </div>
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
                <span className="text-xs font-semibold">BLOCKCHAIN VERIFIED</span>
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-2 tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-lg opacity-90 font-light">{subtitle}</p>
            )}
          </div>

          {/* Logo/Icon */}
          <div className="hidden sm:block ml-6">
            <div className="w-24 h-24 bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Info Bar */}
        <div className="mt-6 pt-4 border-t border-white border-opacity-20">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="opacity-75">
                Powered by Stellar Soroban
              </span>
              <span className="opacity-75">•</span>
              <span className="opacity-75">
                Ring Signature Technology
              </span>
            </div>
            <div className="flex items-center space-x-2 opacity-75">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>Real-time Verification</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalHeader;
