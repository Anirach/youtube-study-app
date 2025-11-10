'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  title: string;
  author: string;
  category: string;
  categoryColor: string;
  thumbnail: string;
  watchStatus: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  similarity: number;
  type: string;
  reason?: string;
  commonThemes?: string[];
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (node: Node) => void;
  layout?: string;
  onZoomChange?: (scale: number) => void;
}

export default function GraphCanvas({ data, onNodeClick, layout = 'force', onZoomChange }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const zoomBehaviorRef = useRef<any>(null);
  const simulationRef = useRef<any>(null);

  // Update dimensions on window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Expose zoom controls
  useEffect(() => {
    if (zoomBehaviorRef.current && svgRef.current && data) {
      const svg = d3.select(svgRef.current);
      const zoom = zoomBehaviorRef.current;
      
      (window as any).graphZoomIn = () => {
        svg.transition().call(zoom.scaleBy, 1.3);
      };
      
      (window as any).graphZoomOut = () => {
        svg.transition().call(zoom.scaleBy, 0.7);
      };
      
      (window as any).graphFitView = () => {
        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        data.nodes.forEach((node: any) => {
          if (node.x < minX) minX = node.x;
          if (node.x > maxX) maxX = node.x;
          if (node.y < minY) minY = node.y;
          if (node.y > maxY) maxY = node.y;
        });

        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;
        const graphCenterX = minX + graphWidth / 2;
        const graphCenterY = minY + graphHeight / 2;
        
        const scale = Math.min(
          dimensions.width / (graphWidth + 200),
          dimensions.height / (graphHeight + 200),
          1
        );
        
        const centerX = dimensions.width / 2 - graphCenterX * scale;
        const centerY = dimensions.height / 2 - graphCenterY * scale;
        
        const transform = d3.zoomIdentity
          .translate(centerX, centerY)
          .scale(scale);
        
        svg.transition()
          .duration(750)
          .call(zoom.transform, transform);
      };
    }
  }, [zoomBehaviorRef.current, data, dimensions]);

  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes || data.nodes.length === 0) return;

    const width = dimensions.width;
    const height = dimensions.height;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Add zoom behavior
    const g = svg.append('g');
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        if (event && event.transform) {
          g.attr('transform', event.transform);
          if (onZoomChange) {
            onZoomChange(event.transform.k);
          }
        }
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);
    
    // Prevent default click behavior on SVG
    svg.on('click', (event: any) => {
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
    });

    // Apply layout
    let simulation: any;
    
    if (layout === 'circular') {
      // Circular layout
      const radius = Math.min(width, height) / 3;
      data.nodes.forEach((node: any, i: number) => {
        const angle = (i / data.nodes.length) * 2 * Math.PI;
        node.x = width / 2 + radius * Math.cos(angle);
        node.y = height / 2 + radius * Math.sin(angle);
      });
      
      simulation = d3.forceSimulation(data.nodes as any)
        .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(100))
        .force('collision', d3.forceCollide().radius(40))
        .alpha(0.3)
        .alphaDecay(0.05);
        
    } else if (layout === 'hierarchical') {
      // Hierarchical layout
      const levels = Math.ceil(Math.sqrt(data.nodes.length));
      const nodesPerLevel = Math.ceil(data.nodes.length / levels);
      
      data.nodes.forEach((node: any, i: number) => {
        const level = Math.floor(i / nodesPerLevel);
        const posInLevel = i % nodesPerLevel;
        node.x = (posInLevel + 1) * (width / (nodesPerLevel + 1));
        node.y = (level + 1) * (height / (levels + 1));
      });
      
      simulation = d3.forceSimulation(data.nodes as any)
        .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(80))
        .force('collision', d3.forceCollide().radius(40))
        .alpha(0.3)
        .alphaDecay(0.05);
        
    } else if (layout === 'grid') {
      // Grid layout
      const cols = Math.ceil(Math.sqrt(data.nodes.length));
      const cellWidth = width / (cols + 1);
      const cellHeight = height / (Math.ceil(data.nodes.length / cols) + 1);
      
      data.nodes.forEach((node: any, i: number) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        node.x = (col + 1) * cellWidth;
        node.y = (row + 1) * cellHeight;
      });
      
      simulation = d3.forceSimulation(data.nodes as any)
        .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(80))
        .force('collision', d3.forceCollide().radius(40))
        .alpha(0.2)
        .alphaDecay(0.1);
        
    } else {
      // Force-directed layout (default)
      simulation = d3.forceSimulation(data.nodes as any)
        .force('link', d3.forceLink(data.edges)
          .id((d: any) => d.id)
          .distance(100)
          .strength(0.5))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40));
    }
    
    simulationRef.current = simulation;

    // Create edges
    const link = g.append('g')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', (d: any) => d.similarity || 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt((d.similarity || 0.5) * 5));

    // Add tooltip for edges (show common themes)
    link.append('title')
      .text((d: any) => {
        let tooltip = `Similarity: ${(d.similarity * 100).toFixed(1)}%`;
        if (d.reason) {
          tooltip += `\n${d.reason}`;
        }
        if (d.commonThemes && d.commonThemes.length > 0) {
          tooltip += `\nCommon themes: ${d.commonThemes.join(', ')}`;
        }
        return tooltip;
      });

    // Create node groups
    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(d3.drag<any, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Add circles for nodes
    node.append('circle')
      .attr('r', (d: any) => {
        // Larger circles for video nodes
        return d.type === 'video' ? 25 : 15;
      })
      .attr('fill', (d: any) => {
        // Different colors based on node type
        if (d.type === 'video') {
          const colors: Record<string, string> = {
            'unwatched': '#94a3b8',
            'watching': '#fbbf24',
            'watched': '#10b981'
          };
          return colors[d.watchStatus] || '#94a3b8';
        } else {
          // Entity nodes - color by entity type
          const entityColors: Record<string, string> = {
            'concept': '#8b5cf6',      // Purple
            'technology': '#3b82f6',   // Blue
            'feature': '#10b981',      // Green
            'tool': '#f59e0b',         // Orange
            'person': '#ef4444',       // Red
            'organization': '#ec4899'  // Pink
          };
          return entityColors[d.type] || '#6366f1';
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Add labels
    node.append('text')
      .text((d: any) => {
        const label = d.label || d.title || d.id;
        return label.length > 20 ? label.substring(0, 20) + '...' : label;
      })
      .attr('x', 0)
      .attr('y', (d: any) => d.type === 'video' ? 35 : 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d: any) => d.type === 'video' ? '12px' : '10px')
      .attr('font-weight', (d: any) => d.type === 'video' ? 'bold' : 'normal')
      .attr('fill', '#1f2937')
      .style('pointer-events', 'none');

    // Add type badge for entity nodes
    node.append('text')
      .text((d: any) => {
        if (d.type === 'video') {
          return d.category || '';
        } else {
          return d.type || '';
        }
      })
      .attr('x', 0)
      .attr('y', (d: any) => d.type === 'video' ? 50 : 38)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#6b7280')
      .style('pointer-events', 'none');

    // Add click handler
    node.on('click', (event: any, d: Node) => {
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
      if (onNodeClick) {
        onNodeClick(d);
      }
    });

    // Add hover effects
    node.on('mouseenter', function(this: SVGGElement) {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', 25)
        .attr('stroke-width', 3);
    });

    node.on('mouseleave', function(this: SVGGElement) {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', 20)
        .attr('stroke-width', 2);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Center the graph after initial layout
    simulation.on('end', () => {
      // Calculate bounding box of all nodes
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      data.nodes.forEach((node: any) => {
        if (node.x < minX) minX = node.x;
        if (node.x > maxX) maxX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.y > maxY) maxY = node.y;
      });

      // Calculate center offset
      const graphWidth = maxX - minX;
      const graphHeight = maxY - minY;
      const graphCenterX = minX + graphWidth / 2;
      const graphCenterY = minY + graphHeight / 2;
      
      // Calculate scale to fit
      const scale = Math.min(
        width / (graphWidth + 200),
        height / (graphHeight + 200),
        1
      );
      
      // Center transform
      const centerX = width / 2 - graphCenterX * scale;
      const centerY = height / 2 - graphCenterY * scale;
      
      const transform = d3.zoomIdentity
        .translate(centerX, centerY)
        .scale(scale);
      
      svg.transition()
        .duration(750)
        .call(zoom.transform, transform);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, dimensions, onNodeClick, layout, onZoomChange]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full bg-white"
      />
    </div>
  );
}

