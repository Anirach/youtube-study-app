'use client';

import { useState } from 'react';
import { FiSearch, FiRefreshCw, FiDownload, FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';

interface GraphControlsProps {
  onSearch: (query: string) => void;
  onRebuild: () => void;
  onExport: () => void;
  onLayoutChange: (layout: string) => void;
  onGraphTypeChange?: (type: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  currentLayout: string;
  currentGraphType?: string;
  isLoading?: boolean;
}

export default function GraphControls({
  onSearch,
  onRebuild,
  onExport,
  onLayoutChange,
  onGraphTypeChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  currentLayout,
  currentGraphType = 'knowledge',
  isLoading = false
}: GraphControlsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const graphTypes = [
    { value: 'knowledge', label: 'Knowledge Graph' },
    { value: 'cooccurrence', label: 'Co-occurrence Graph' },
    { value: 'sequence', label: 'Sequence Graph' }
  ];

  const layouts = [
    { value: 'force', label: 'Force Directed' },
    { value: 'circular', label: 'Circular' },
    { value: 'hierarchical', label: 'Hierarchical' },
    { value: 'grid', label: 'Grid' }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Middle: Graph Type & Layout Selectors */}
        <div className="flex items-center gap-4">
          {/* Graph Type Selector */}
          {onGraphTypeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Type:</span>
              <select
                value={currentGraphType}
                onChange={(e) => onGraphTypeChange(e.target.value)}
                className="px-3 py-2 border-2 border-purple-300 bg-purple-50 text-purple-900 font-medium rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer hover:bg-purple-100 transition-colors"
              >
                {graphTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500 italic">
                (saved)
              </span>
            </div>
          )}

          {/* Layout Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Layout:</span>
            <select
              value={currentLayout}
              onChange={(e) => onLayoutChange(e.target.value)}
              className="px-3 py-2 border-2 border-indigo-300 bg-indigo-50 text-indigo-900 font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-indigo-100 transition-colors"
            >
              {layouts.map((layout) => (
                <option key={layout.value} value={layout.value}>
                  {layout.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500 italic">
              (saved)
            </span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
            <button
              onClick={onZoomOut}
              className="p-2 hover:bg-gray-100 transition-colors"
              title="Zoom Out"
            >
              <FiZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-px h-6 bg-gray-300" />
            <button
              onClick={onZoomIn}
              className="p-2 hover:bg-gray-100 transition-colors"
              title="Zoom In"
            >
              <FiZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-px h-6 bg-gray-300" />
            <button
              onClick={onFitView}
              className="p-2 hover:bg-gray-100 transition-colors rounded-r-lg"
              title="Fit View"
            >
              <FiMaximize2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Rebuild */}
          <button
            onClick={onRebuild}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Rebuild Graph
          </button>

          {/* Export */}
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

