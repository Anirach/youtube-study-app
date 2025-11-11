'use client';

import { useState, useEffect } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import GraphControls from '@/components/GraphControls';
import NodeDetailsPanel from '@/components/NodeDetailsPanel';
import LoadingSpinner from '@/components/LoadingSpinner';
import { graphApi, categoriesApi } from '@/lib/api';

export default function GraphPage() {
  const [graphData, setGraphData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentLayout, setCurrentLayout] = useState<string>('');
  const [currentGraphType, setCurrentGraphType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [graphTypeLoaded, setGraphTypeLoaded] = useState(false);

  // Load saved layout preference on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('graphLayout');
    console.log('Loading saved layout:', savedLayout);
    if (savedLayout) {
      setCurrentLayout(savedLayout);
    } else {
      setCurrentLayout('force'); // default layout
    }
    setLayoutLoaded(true);
  }, []);

  // Load saved graph type preference on mount
  useEffect(() => {
    const savedGraphType = localStorage.getItem('graphType');
    console.log('Loading saved graph type:', savedGraphType);
    if (savedGraphType) {
      setCurrentGraphType(savedGraphType);
    } else {
      setCurrentGraphType('knowledge'); // default type
    }
    setGraphTypeLoaded(true);
  }, []);

  // Save layout preference when it changes
  useEffect(() => {
    if (layoutLoaded && currentLayout) {
      console.log('Saving layout:', currentLayout);
      localStorage.setItem('graphLayout', currentLayout);
    }
  }, [currentLayout, layoutLoaded]);

  // Save graph type preference when it changes
  useEffect(() => {
    if (graphTypeLoaded && currentGraphType) {
      console.log('Saving graph type:', currentGraphType);
      localStorage.setItem('graphType', currentGraphType);
    }
  }, [currentGraphType, graphTypeLoaded]);

  useEffect(() => {
    if (layoutLoaded && graphTypeLoaded && currentGraphType) {
      loadData();
    }
  }, [selectedCategory, layoutLoaded, graphTypeLoaded, currentGraphType]);

  const transformGraphData = (originalData: any, graphType: string) => {
    if (!originalData || !originalData.nodes) return originalData;

    switch (graphType) {
      case 'cooccurrence':
        return buildCooccurrenceGraph(originalData);
      case 'sequence':
        return buildSequenceGraph(originalData);
      default:
        return originalData;
    }
  };

  const buildCooccurrenceGraph = (data: any) => {
    // Co-occurrence: Show only entities and their co-occurrence relationships
    const entityNodes = data.nodes.filter((n: any) => n.type !== 'video');
    
    // Build co-occurrence edges between entities that appear in the same video
    const cooccurrenceEdges: any[] = [];
    const cooccurrenceCount = new Map<string, number>();
    const entityByVideo = new Map<string, any[]>();
    
    // Group entities by video
    data.edges.forEach((edge: any) => {
      const source = data.nodes.find((n: any) => n.id === edge.source);
      const target = data.nodes.find((n: any) => n.id === edge.target);
      
      if (source?.type === 'video' && target?.type !== 'video') {
        if (!entityByVideo.has(source.id)) {
          entityByVideo.set(source.id, []);
        }
        entityByVideo.get(source.id)!.push(target);
      }
      if (target?.type === 'video' && source?.type !== 'video') {
        if (!entityByVideo.has(target.id)) {
          entityByVideo.set(target.id, []);
        }
        entityByVideo.get(target.id)!.push(source);
      }
    });
    
    // Create co-occurrence edges with count
    entityByVideo.forEach((entities, videoId) => {
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const edgeKey = [entities[i].id, entities[j].id].sort().join('-');
          cooccurrenceCount.set(edgeKey, (cooccurrenceCount.get(edgeKey) || 0) + 1);
        }
      }
    });
    
    // Convert to edges with weight
    cooccurrenceCount.forEach((count, edgeKey) => {
      const [sourceId, targetId] = edgeKey.split('-');
      cooccurrenceEdges.push({
        source: sourceId,
        target: targetId,
        type: 'cooccurs',
        similarity: Math.min(count / 3, 1), // Normalize weight
        weight: count,
        reason: `Co-occur in ${count} video(s)`
      });
    });
    
    // Filter out isolated nodes (nodes with no edges)
    const connectedNodeIds = new Set<string>();
    cooccurrenceEdges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const connectedNodes = entityNodes.filter((n: any) => connectedNodeIds.has(n.id));
    
    return {
      nodes: connectedNodes,
      edges: cooccurrenceEdges,
      stats: {
        ...data.stats,
        nodes: connectedNodes.length,
        edges: cooccurrenceEdges.length,
        graphType: 'Co-occurrence'
      }
    };
  };

  const buildSequenceGraph = (data: any) => {
    // Sequence: Show videos and entities in temporal/sequential order
    const videoNodes = data.nodes.filter((n: any) => n.type === 'video');
    const entityNodes = data.nodes.filter((n: any) => n.type !== 'video');
    
    // Sort videos by creation date or order
    videoNodes.sort((a: any, b: any) => {
      return (a.createdAt || a.id).localeCompare(b.createdAt || b.id);
    });
    
    // Create sequential edges between videos
    const sequenceEdges: any[] = [];
    for (let i = 0; i < videoNodes.length - 1; i++) {
      sequenceEdges.push({
        source: videoNodes[i].id,
        target: videoNodes[i + 1].id,
        type: 'sequence',
        similarity: 0.5,
        reason: 'Sequential order'
      });
    }
    
    // Add entity connections to videos
    data.edges.forEach((edge: any) => {
      const source = data.nodes.find((n: any) => n.id === edge.source);
      const target = data.nodes.find((n: any) => n.id === edge.target);
      
      if ((source?.type === 'video' && target?.type !== 'video') ||
          (target?.type === 'video' && source?.type !== 'video')) {
        sequenceEdges.push(edge);
      }
    });
    
    return {
      nodes: [...videoNodes, ...entityNodes],
      edges: sequenceEdges,
      stats: {
        ...data.stats,
        graphType: 'Sequence'
      }
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [graph, cats] = await Promise.all([
        graphApi.getGraph({ categoryId: selectedCategory }),
        categoriesApi.getAll()
      ]);

      // Transform graph based on selected type
      const transformedGraph = transformGraphData(graph, currentGraphType);
      setGraphData(transformedGraph);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err: any) {
      console.error('Error loading graph:', err);
      setError(err.message || 'Failed to load graph data');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node: any) => {
    console.log('handleNodeClick called with:', node);
    setSelectedNode(node);
    console.log('selectedNode updated');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query || !graphData) return;

    // Find matching node
    const matchingNode = graphData.nodes.find((node: any) => 
      node.title?.toLowerCase().includes(query.toLowerCase()) ||
      node.label?.toLowerCase().includes(query.toLowerCase()) ||
      node.id?.toLowerCase().includes(query.toLowerCase())
    );

    if (matchingNode) {
      setSelectedNode(matchingNode);
    }
  };

  const handleGraphTypeChange = (type: string) => {
    setCurrentGraphType(type);
    // Reload data with new graph type
    if (graphData) {
      const transformedGraph = transformGraphData(graphData, type);
      setGraphData(transformedGraph);
    }
  };

  const handleRebuild = async () => {
    if (!confirm('Rebuild knowledge graph? This may take a few minutes.')) {
      return;
    }

    try {
      setLoading(true);
      await graphApi.rebuild();
      await loadData();
      alert('Knowledge graph rebuilt successfully!');
    } catch (err: any) {
      alert('Failed to rebuild graph: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(graphData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-graph.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => {
    if ((window as any).graphZoomIn) {
      (window as any).graphZoomIn();
    }
  };

  const handleZoomOut = () => {
    if ((window as any).graphZoomOut) {
      (window as any).graphZoomOut();
    }
  };

  const handleFitView = () => {
    if ((window as any).graphFitView) {
      (window as any).graphFitView();
    }
  };

  if (loading && !graphData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 w-full">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Graph</h1>
            <p className="text-sm text-gray-600 mt-1">
              {graphData?.stats?.totalNodes || 0} nodes · {graphData?.stats?.totalEdges || 0} connections
              {graphData?.stats?.provider && ` · ${graphData.stats.provider}`}
            </p>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Filter:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <GraphControls
        onSearch={handleSearch}
        onRebuild={handleRebuild}
        onExport={handleExport}
        onLayoutChange={setCurrentLayout}
        onGraphTypeChange={handleGraphTypeChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        currentLayout={currentLayout}
        currentGraphType={currentGraphType}
        isLoading={loading}
      />

      {/* Graph Canvas */}
      <div className="flex-1 relative w-full">
        {graphData && graphData.nodes && graphData.nodes.length > 0 && layoutLoaded && graphTypeLoaded && currentLayout && currentGraphType ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <GraphCanvas
                key={`${currentLayout}-${currentGraphType}`}
                data={graphData}
                onNodeClick={handleNodeClick}
                layout={currentLayout}
                onZoomChange={setZoomLevel}
              />
            </div>
            
            {/* Node Details Panel */}
            {selectedNode && (
              <NodeDetailsPanel
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
              />
            )}

            {/* Zoom Level Indicator */}
            <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
              <div className="text-xs text-gray-500">Zoom</div>
              <div className="text-sm font-semibold text-gray-900">
                {Math.round(zoomLevel * 100)}%
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Graph Data
              </h3>
              <p className="text-gray-600 mb-4">
                Add some videos and rebuild the knowledge graph to see connections
              </p>
              <button
                onClick={handleRebuild}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Rebuild Knowledge Graph
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs">
        <h4 className="font-semibold text-gray-900 mb-3">Legend</h4>
        <div className="space-y-3 text-sm">
          {/* Video Nodes */}
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Videos</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-400 border-2 border-white" />
                <span className="text-gray-700">Unwatched</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-white" />
                <span className="text-gray-700">Watching</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white" />
                <span className="text-gray-700">Watched</span>
              </div>
            </div>
          </div>

          {/* Entity Nodes */}
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-500 mb-2">Entities</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-700">Concept</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-700">Technology</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-700">Feature</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-gray-700">Tool</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Click nodes to view details<br />
              Drag to rearrange<br />
              Scroll to zoom
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
