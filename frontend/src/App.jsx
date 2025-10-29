import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import IssuerPage from './pages/IssuerPage';
import VerifyPage from './pages/VerifyPage';
import ConfirmPage from './pages/ConfirmPage';
import HomePage from './pages/HomePage';

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-indigo-600">
                  Selective Disclosure KYC
                </span>
              </Link>
            </div>
            <div className="flex space-x-4 items-center">
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/admin'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Admin
              </Link>
              <Link
                to="/issuer"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/issuer'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Issuer
              </Link>
              <Link
                to="/verify"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/verify'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Get Verified
              </Link>
              <Link
                to="/confirm"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/confirm'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Prove Identity
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/issuer" element={<IssuerPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/confirm" element={<ConfirmPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
