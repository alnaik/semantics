// components/LivingGraph.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Thought } from '@/types';

interface LivingGraphProps {
  thoughts: Thought[];
  onNodeClick: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
}

interface GraphNode extends Thought {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export default function LivingGraph({ thoughts, onNodeClick, onSelectionChange }: LivingGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || thoughts.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create container for zoom
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Prepare nodes and links
    const nodes: GraphNode[] = thoughts.map(t => ({ ...t }));
    const links = thoughts.flatMap(thought =>
      thought.connections.map(targetId => ({
        source: thought.id,
        target: targetId
      }))
    ).filter(link => 
      thoughts.find(t => t.id === link.source) && 
      thoughts.find(t => t.id === link.target)
    );

    // Create simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => getNodeRadius(d.atp) + 5));

    // Add links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#4a5568')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Add nodes group
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => getNodeRadius(d.atp))
      .attr('fill', d => getNodeColor(d.atp))
      .attr('stroke', d => d.id === selectedNode ? '#fff' : 'none')
      .attr('stroke-width', 3)
      .attr('opacity', d => d.status === 'fossil' ? 0.3 : 0.8);

    // Add status indicator
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -20)
      .attr('font-size', '16px')
      .text(d => getStatusEmoji(d));

    // Add labels
    node.append('text')
      .text(d => d.tags[0] || 'Thought')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .attr('pointer-events', 'none');

    // Add ATP display on hover
    const atpLabel = g.append('text')
      .attr('font-size', '14px')
      .attr('fill', 'white')
      .attr('display', 'none');

    // Node interactions
    node.on('click', (event, d) => {
      event.stopPropagation();
      onNodeClick(d.id);
      setSelectedNode(d.id);
      onSelectionChange([d.id]);
    })
    .on('mouseenter', (event, d) => {
      setHoveredNode(d.id);
      atpLabel
        .attr('display', 'block')
        .attr('x', d.x!)
        .attr('y', d.y! - 30)
        .text(`ATP: ${d.atp.toFixed(0)}`);
    })
    .on('mouseleave', () => {
      setHoveredNode(null);
      atpLabel.attr('display', 'none');
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      
      if (hoveredNode) {
        const hovered = nodes.find(n => n.id === hoveredNode);
        if (hovered && hovered.x && hovered.y) {
          atpLabel
            .attr('x', hovered.x)
            .attr('y', hovered.y - 30);
        }
      }
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
  }, [thoughts, onNodeClick, onSelectionChange, selectedNode]);

  // Helper functions
  const getNodeRadius = (atp: number) => {
    return Math.max(15, Math.min(30, atp / 3));
  };

  const getNodeColor = (atp: number) => {
    if (atp > 70) return '#10b981'; // green
    if (atp > 30) return '#f59e0b'; // yellow
    if (atp > 10) return '#ef4444'; // red
    return '#6b7280'; // gray
  };

  const getStatusEmoji = (thought: Thought) => {
    if (thought.status === 'fossil') return '🦴';
    if (thought.status === 'dying') return '⚠️';
    if (thought.atp > 80) return '✨';
    return '';
  };

  return (
    <div className="relative h-full bg-gray-800 rounded-lg border border-gray-700">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-90 p-3 rounded-lg text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Healthy (ATP 70-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Declining (ATP 30-70)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Dying (ATP 10-30)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Fossil (ATP &lt;10)</span>
          </div>
        </div>
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="absolute top-4 right-4 bg-gray-900 bg-opacity-90 p-3 rounded-lg max-w-xs">
          <div className="text-sm">
            {thoughts.find(t => t.id === selectedNode)?.text}
          </div>
        </div>
      )}
    </div>
  );
}