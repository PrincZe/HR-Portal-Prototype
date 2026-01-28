'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Link from 'next/link';

const quickLinks = [
  { label: 'Circulars', href: '/circulars' },
  { label: 'Resources', href: '/resources' },
  { label: 'FAQs', href: '/faqs' },
  { label: 'HRL Meetings', href: '/hrl-meetings' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on page load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        {/* Logo/Title */}
        <h1
          className="text-4xl md:text-5xl font-bold mb-10 tracking-tight"
          style={{ color: '#17A2B8' }}
        >
          HR Portal
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-8">
          <div className="relative group">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search circulars, resources, and more..."
              className="w-full px-6 py-4 text-lg rounded-full border border-gray-200
                         shadow-sm hover:shadow-md focus:shadow-md
                         outline-none transition-all duration-200
                         focus:border-[#17A2B8] focus:ring-2 focus:ring-[#17A2B8]/20
                         pr-14"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3
                         text-gray-400 hover:text-[#17A2B8]
                         transition-colors duration-200
                         rounded-full hover:bg-gray-100"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>

        {/* Quick Links */}
        <nav className="flex flex-wrap justify-center gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-5 py-2.5 rounded-full text-sm font-medium
                         bg-gray-100 text-gray-700
                         hover:bg-gray-200 hover:text-gray-900
                         transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </main>

      {/* Footer - Minimal */}
      <footer className="py-6 text-center text-sm text-gray-400">
        <p>Public Service Division, Singapore</p>
      </footer>
    </div>
  );
}
