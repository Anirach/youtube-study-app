'use client';

import { useState, useEffect } from 'react';
import { FiFilter, FiX, FiSearch } from 'react-icons/fi';
import { categoriesApi } from '@/lib/api';

interface AdvancedSearchProps {
  onSearch: (filters: any) => void;
  onClear: () => void;
}

export default function AdvancedSearch({ onSearch, onClear }: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    query: '',
    categoryId: '',
    watchStatus: '',
    hasTranscript: '',
    hasSummary: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    const activeFilters: any = {};
    
    if (filters.query) activeFilters.search = filters.query;
    if (filters.categoryId) activeFilters.categoryId = filters.categoryId;
    if (filters.watchStatus) activeFilters.watchStatus = filters.watchStatus;
    if (filters.hasTranscript) activeFilters.hasTranscript = filters.hasTranscript === 'true';
    if (filters.hasSummary) activeFilters.hasSummary = filters.hasSummary === 'true';
    activeFilters.sortBy = filters.sortBy;
    activeFilters.sortOrder = filters.sortOrder;

    onSearch(activeFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilters({
      query: '',
      categoryId: '',
      watchStatus: '',
      hasTranscript: '',
      hasSummary: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    onClear();
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'createdAt' && v !== 'desc').length;

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search videos by title, author, or content..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            isOpen || activeFilterCount > 0
              ? 'border-blue-600 bg-blue-50 text-blue-600'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FiFilter />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Advanced Filters</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.categoryId}
                onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.videoCount})
                  </option>
                ))}
              </select>
            </div>

            {/* Watch Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Watch Status
              </label>
              <select
                value={filters.watchStatus}
                onChange={(e) => handleFilterChange('watchStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="unwatched">Unwatched</option>
                <option value="watching">Watching</option>
                <option value="watched">Watched</option>
              </select>
            </div>

            {/* Has Transcript */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transcript
              </label>
              <select
                value={filters.hasTranscript}
                onChange={(e) => handleFilterChange('hasTranscript', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any</option>
                <option value="true">Has Transcript</option>
                <option value="false">No Transcript</option>
              </select>
            </div>

            {/* Has Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summary
              </label>
              <select
                value={filters.hasSummary}
                onChange={(e) => handleFilterChange('hasSummary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any</option>
                <option value="true">Has Summary</option>
                <option value="false">No Summary</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="createdAt">Date Added</option>
                <option value="title">Title</option>
                <option value="author">Author</option>
                <option value="uploadDate">Upload Date</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

