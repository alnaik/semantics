// components/LivingGraph.tsx
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Thought, GraphNode } from '@/types';
import { RefreshCw } from 'lucide-react';

interface Props {
  thoughts: Thought[];
  onBoostThought: (id: string) => void;
  onReanalyze?: () => void;
  onSelectThought?: (id: string) => void;
}

export default function LivingGraph({ thoughts, onBoostThought, onReanalyze, onSelectThought }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!svgRef.current || thoughts.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    
    // Add zoom
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Create links data
    const links: any[] = [];
    thoughts.forEach(thought => {
      if (thought.connections && thought.connections.length > 0) {
        thought.connections.forEach(targetId => {
          const target = thoughts.find(t => t.id === targetId);
          if (target) {
            links.push({
              source: thought.id,
              target: targetId,
              strength: Math.min(thought.atp, target.atp) / 100
            });
          }
        });
      }
    });

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(thoughts.map(t => ({...t} as GraphNode)))
      .force('link', d3.forceLink<GraphNode, any>(links)
        .id((d: any) => d.id)
        .distance(100)
        .strength((d: any) => d.strength || 0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => getNodeRadius(d.atp) + 5));

    // Add links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', d => `rgba(100, 100, 100, ${d.strength})`)
      .attr('stroke-width', d => 1 + d.strength * 2);

    // Add node groups (circles + labels)
    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(simulation.nodes())
      .enter().append('g')
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        onBoostThought(d.id);
        setSelectedNodes(d.id);
        if (onSelectThought) {
          onSelectThought(d.id);
        }
      })
      .call(d3.drag<SVGGElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles to node groups
    const node = nodeGroup.append('circle')
      .attr('r', (d: any) => getNodeRadius(d.atp))
      .attr('fill', (d: any) => getNodeColor(d.atp))
      .attr('stroke', (d: any) => selectedNodes === d.id ? '#3b82f6' : '#fff')
      .attr('stroke-width', (d: any) => selectedNodes === d.id ? 4 : 2);

    // Add primary tag labels
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        if (d.tags && d.tags.length > 0) {
          return d.tags[0].length > 8 ? d.tags[0].substring(0, 8) + '...' : d.tags[0];
        }
        return '';
      });

    // Add enhanced tooltip on hover
    const tooltip = g.append('g');
    
    nodeGroup.on('mouseenter', (event: any, d: any) => {
      const tooltipGroup = tooltip.append('g');
      
      // Background rectangle
      const padding = 8;
      const lineHeight = 14;
      const maxWidth = 200;
      
      // ATP line
      tooltipGroup.append('text')
        .attr('x', d.x || 0)
        .attr('y', (d.y || 0) - getNodeRadius(d.atp) - 25)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#333')
        .attr('font-weight', 'bold')
        .text(`ATP: ${d.atp.toFixed(1)}`);
      
      // Tags line (if any)
      if (d.tags && d.tags.length > 0) {
        const tagsText = d.tags.slice(0, 3).join(', ');
        tooltipGroup.append('text')
          .attr('x', d.x || 0)
          .attr('y', (d.y || 0) - getNodeRadius(d.atp) - 10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', '#666')
          .text(`Tags: ${tagsText.length > 30 ? tagsText.substring(0, 30) + '...' : tagsText}`);
      }
    })
    .on('mouseleave', () => {
      tooltip.selectAll('*').remove();
    });

    // Update positions
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => {
          const source = simulation.nodes().find((n: any) => n.id === (d.source.id || d.source));
          return source?.x || 0;
        })
        .attr('y1', (d: any) => {
          const source = simulation.nodes().find((n: any) => n.id === (d.source.id || d.source));
          return source?.y || 0;
        })
        .attr('x2', (d: any) => {
          const target = simulation.nodes().find((n: any) => n.id === (d.target.id || d.target));
          return target?.x || 0;
        })
        .attr('y2', (d: any) => {
          const target = simulation.nodes().find((n: any) => n.id === (d.target.id || d.target));
          return target?.y || 0;
        });

      nodeGroup
        .attr('transform', (d: any) => `translate(${d.x || 0}, ${d.y || 0})`);
    });

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

    return () => {
      simulation.stop();
    };
  }, [thoughts, onBoostThought, selectedNodes, onSelectThought]);

  const getNodeRadius = (atp: number) => {
    return 10 + (atp / 100) * 20;
  };

  const getNodeColor = (atp: number) => {
    if (atp > 70) return '#10b981';
    if (atp > 30) return '#f59e0b';
    if (atp > 10) return '#ef4444';
    return '#9ca3af';
  };

  const handleReanalyze = async () => {
    if (onReanalyze && !isAnalyzing) {
      setIsAnalyzing(true);
      await onReanalyze();
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full bg-gray-100 relative">
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-4 z-10">
        <h3 className="font-bold text-sm mb-2">Living Memory Graph</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Active (ATP 70-100)</span>
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
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>Fossil (ATP &lt;10)</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-600">
          Click nodes to boost ATP (+10)
        </div>
        {onReanalyze && (
          <button
            onClick={handleReanalyze}
            disabled={isAnalyzing || thoughts.length < 2}
            className="mt-2 flex items-center gap-1 text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze Connections'}
          </button>
        )}
      </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
