import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { useStore } from '@/store';
import { buildTreeHierarchy, getTransitionsByEdge } from '@/lib/graphTransform';
import type { D3TreeNode, Action } from '@/types';

interface TreeNode extends d3.HierarchyNode<D3TreeNode> {
  x: number;
  y: number;
}

interface TreeLink extends d3.HierarchyLink<D3TreeNode> {
  source: TreeNode;
  target: TreeNode;
}

export interface UseD3TreeOptions {
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}

export function useD3Tree(
  svgRef: React.RefObject<SVGSVGElement | null>,
  options: UseD3TreeOptions = {}
) {
  const { graphData, currentState, selectedNodeId, shouldFitGraph, clearFitGraph } = useStore();
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Build tree hierarchy
  const treeRoot = useMemo(() => {
    if (!graphData) return null;
    return buildTreeHierarchy(graphData, currentState?.id || null);
  }, [graphData, currentState?.id]);

  // Get edge actions
  const edgeActions = useMemo(() => {
    if (!graphData) return new Map<string, Action[]>();
    return getTransitionsByEdge(graphData);
  }, [graphData]);

  // Fit graph to view
  const fitToView = useCallback(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    const zoom = zoomRef.current;

    if (!svg || !g || !zoom) return;

    const bounds = (g.node() as SVGGElement)?.getBBox();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return;

    const svgRect = svg.getBoundingClientRect();
    const padding = 60;

    const scale = Math.min(
      (svgRect.width - padding * 2) / bounds.width,
      (svgRect.height - padding * 2) / bounds.height,
      1.5 // Max zoom
    );

    const translateX = (svgRect.width - bounds.width * scale) / 2 - bounds.x * scale;
    const translateY = (svgRect.height - bounds.height * scale) / 2 - bounds.y * scale;

    d3.select(svg)
      .transition()
      .duration(500)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(translateX, translateY).scale(scale)
      );
  }, [svgRef]);

  // Handle fit graph trigger from store
  useEffect(() => {
    if (shouldFitGraph) {
      fitToView();
      clearFitGraph();
    }
  }, [shouldFitGraph, fitToView, clearFitGraph]);

  // Render the tree
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !treeRoot) return;

    const svgSelection = d3.select(svg);
    const { width: _width } = svg.getBoundingClientRect();

    // Clear previous content
    svgSelection.selectAll('*').remove();

    // Create defs for arrow markers
    const defs = svgSelection.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 35)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'hsl(var(--muted-foreground))');

    // Create container group for zoom
    const g = svgSelection.append('g');
    gRef.current = g;

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svgSelection.call(zoom);
    zoomRef.current = zoom;

    // Create D3 hierarchy
    const hierarchy = d3.hierarchy(treeRoot);

    // Create tree layout
    const treeLayout = d3.tree<D3TreeNode>()
      .nodeSize([100, 140])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

    const treeData = treeLayout(hierarchy) as TreeNode;

    // Get nodes and links
    const nodes = treeData.descendants() as TreeNode[];
    const links = treeData.links() as TreeLink[];

    // Draw links
    const linkGroup = g.append('g').attr('class', 'links');

    const linkGenerator = d3.linkVertical<TreeLink, TreeNode>()
      .x((d) => d.x)
      .y((d) => d.y);

    linkGroup
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', linkGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--muted-foreground))')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)');

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeSelection = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        options.onNodeClick?.(d.data.id);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        options.onNodeDoubleClick?.(d.data.id);
      });

    // Node circles
    nodeSelection
      .append('circle')
      .attr('r', 30)
      .attr('fill', (d) => {
        if (d.data.isCurrent) return 'hsl(var(--warning))';
        if (d.data.isEntry) return 'hsl(var(--success))';
        return 'hsl(var(--primary))';
      })
      .attr('stroke', (d) => {
        if (d.data.id === selectedNodeId) return 'hsl(var(--destructive))';
        return 'hsl(var(--border))';
      })
      .attr('stroke-width', (d) => {
        if (d.data.id === selectedNodeId) return 4;
        if (d.data.isEntry) return 4;
        return 2;
      });

    // Node labels
    nodeSelection
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'hsl(var(--primary-foreground))')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text((d) => d.data.id.slice(0, 8));

    // State description below node
    nodeSelection
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 45)
      .attr('fill', 'hsl(var(--muted-foreground))')
      .attr('font-size', '9px')
      .text((d) => {
        const desc = d.data.state.description;
        return desc.length > 15 ? desc.slice(0, 15) + '...' : desc;
      });

    // Initial fit to view
    setTimeout(() => fitToView(), 100);

  }, [treeRoot, edgeActions, selectedNodeId, svgRef, options, fitToView]);

  return { fitToView };
}
