'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiVideo, FiGrid, FiMessageSquare } from 'react-icons/fi';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: FiHome },
    { href: '/videos', label: 'Videos', icon: FiVideo },
    { href: '/graph', label: 'Knowledge Graph', icon: FiGrid },
    { href: '/chat', label: 'Chat', icon: FiMessageSquare },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <FiVideo className="w-8 h-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">
              YouTube Study
            </span>
          </Link>

          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

