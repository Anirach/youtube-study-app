'use client';

import { useState } from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFilterChange?: (filters: any) => void;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  onFilterChange,
  placeholder = 'Search videos...',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {onFilterChange && (
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FiFilter className="w-5 h-5" />
          </button>
        )}
      </form>

      {showFilters && onFilterChange && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Filters</h3>
          {/* Add filter options here */}
          <p className="text-sm text-gray-500">Filter options coming soon...</p>
        </div>
      )}
    </div>
  );
}

