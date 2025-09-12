'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="bg-white text-blue-800 rounded-lg p-2 font-bold text-xl">
              TA
            </div>
            <div>
              <h1 className="text-xl font-bold">Turbo Asset</h1>
              <p className="text-xs text-blue-200">Enterprise IWMS Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6">
            <Link href="/asset-dashboard" className="hover:text-blue-200 transition-colors">
              Assets
            </Link>
            <Link href="/maintenance-dashboard" className="hover:text-blue-200 transition-colors">
              Maintenance
            </Link>
            <Link href="/space-utilization-service" className="hover:text-blue-200 transition-colors">
              Space Management
            </Link>
            <Link href="/business-logic-integration-dashboard" className="hover:text-blue-200 transition-colors">
              Monitoring
            </Link>
            <Link href="/audit-logging" className="hover:text-blue-200 transition-colors">
              Audit Trail
            </Link>
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">AD</span>
              </div>
              <span className="text-sm">Admin User</span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-blue-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-blue-700">
            <nav className="flex flex-col space-y-2">
              <Link href="/asset-dashboard" className="px-4 py-2 hover:bg-blue-700 rounded">
                Assets
              </Link>
              <Link href="/maintenance-dashboard" className="px-4 py-2 hover:bg-blue-700 rounded">
                Maintenance
              </Link>
              <Link href="/space-utilization-service" className="px-4 py-2 hover:bg-blue-700 rounded">
                Space Management
              </Link>
              <Link href="/business-logic-integration-dashboard" className="px-4 py-2 hover:bg-blue-700 rounded">
                Monitoring
              </Link>
              <Link href="/audit-logging" className="px-4 py-2 hover:bg-blue-700 rounded">
                Audit Trail
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}