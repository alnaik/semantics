// components/LivingGraph.tsx
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SemanticTag, GraphNode } from '@/types';
import { RefreshCw } from 'lucide-react';

interface Props {
  semanticTags: SemanticTag[];
  onBoostTag: (id: string) => void;
  onSelectTag: (id: string) => void;
  onReanalyze?: () => void;
  selectedTag?: string | null;
}

export default function LivingGraph({ semanticTags, onBoostTag, onSelectTag, onReanalyze, selectedTag }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!svgRef.current || semanticTags.length === 0) return;

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

    // Create links data from semantic tag connections
    const links: any[] = [];
    semanticTags.forEach(tag => {
      if (tag.connections && tag.connections.length > 0) {
        tag.connections.forEach(connection => {
          const target = semanticTags.find(t => t.id === connection.tagId);
          if (target) {
            links.push({
              source: tag.id,
              target: connection.tagId,
              strength: connection.strength,
              coMentions: connection.coMentions
            });
          }
        });
      }
    });

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(semanticTags.map(t => ({...t} as GraphNode)))
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
      .attr('stroke', d => `rgba(139, 92, 246, ${Math.min(1, d.strength / 5)})`)
      .attr('stroke-width', d => Math.max(1, Math.min(6, d.strength)));

    // Add node groups (circles + labels)
    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(simulation.nodes())
      .enter().append('g')
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        onSelectTag(d.id);
        onBoostTag(d.id);
      })
      .call(d3.drag<SVGGElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles to node groups
    const node = nodeGroup.append('circle')
      .attr('r', (d: any) => getNodeRadius(d.atp))
      .attr('fill', (d: any) => getNodeColor(d.atp))
      .attr('stroke', (d: any) => selectedTag === d.id ? '#8b5cf6' : '#fff')
      .attr('stroke-width', (d: any) => selectedTag === d.id ? 4 : 2);

    // Add primary tag labels
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        return d.name.length > 8 ? d.name.substring(0, 8) + '...' : d.name;
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
      
      // Thought count line
      tooltipGroup.append('text')
        .attr('x', d.x || 0)
        .attr('y', (d.y || 0) - getNodeRadius(d.atp) - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text(`Thoughts: ${d.thoughtIds?.length || 0} | Freq: ${d.frequency}`);
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
  }, [semanticTags, onBoostTag, selectedTag, onSelectTag]);

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
    <div className="h-full bg-gray-800 relative">
      <div className="absolute top-4 left-4 bg-gray-900 border border-gray-700 rounded-lg shadow-md p-4 z-10">
        <h3 className="font-bold text-sm mb-2 text-white">Semantic Knowledge Graph</h3>
        <div className="space-y-1 text-xs text-gray-300">
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
        <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
          <div>Click tag: Filter thoughts & boost ATP</div>
          {selectedTag && (
            <div className="mt-1 text-purple-400 font-medium">
              Tag selected
            </div>
          )}
        </div>
        {onReanalyze && (
          <button
            onClick={handleReanalyze}
            disabled={isAnalyzing || semanticTags.length < 2}
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
