import type { StateGraphData, D3TreeNode, Action } from '@/types';

export interface TreeNodeWithPosition extends D3TreeNode {
  x: number;
  y: number;
  depth: number;
}

export interface TreeLink {
  source: TreeNodeWithPosition;
  target: TreeNodeWithPosition;
  actions: Action[];
}

/**
 * Build a D3-compatible tree hierarchy from StateGraphData
 * Uses BFS to build tree from entry state, handling cycles by marking visited nodes
 */
export function buildTreeHierarchy(
  graphData: StateGraphData,
  currentStateId: string | null
): D3TreeNode | null {
  const { states, transitions, entryStateId } = graphData;

  if (!entryStateId || !states[entryStateId]) {
    return null;
  }

  // Build adjacency list from transitions (parent -> children)
  const childrenMap = new Map<string, Set<string>>();
  transitions.forEach((t) => {
    if (t.fromStateId !== t.toStateId) {
      if (!childrenMap.has(t.fromStateId)) {
        childrenMap.set(t.fromStateId, new Set());
      }
      childrenMap.get(t.fromStateId)!.add(t.toStateId);
    }
  });

  // BFS to build tree, avoiding cycles
  const visited = new Set<string>();

  function buildNode(stateId: string): D3TreeNode | null {
    if (visited.has(stateId) || !states[stateId]) {
      return null;
    }
    visited.add(stateId);

    const childStateIds = childrenMap.get(stateId) || new Set();
    const childNodes = Array.from(childStateIds)
      .map((id) => buildNode(id))
      .filter((n): n is D3TreeNode => n !== null);

    return {
      id: stateId,
      state: states[stateId],
      children: childNodes,
      isEntry: stateId === entryStateId,
      isCurrent: stateId === currentStateId,
    };
  }

  return buildNode(entryStateId);
}

/**
 * Get all transitions (edges) from the graph, grouped by source-target pair
 */
export function getTransitionsByEdge(
  graphData: StateGraphData
): Map<string, Action[]> {
  const edgeMap = new Map<string, Action[]>();

  graphData.transitions.forEach((t) => {
    const edgeKey = `${t.fromStateId}->${t.toStateId}`;
    if (!edgeMap.has(edgeKey)) {
      edgeMap.set(edgeKey, []);
    }
    edgeMap.get(edgeKey)!.push(t.action);
  });

  return edgeMap;
}

/**
 * Flatten tree to array of nodes (for D3 rendering)
 */
export function flattenTree(root: D3TreeNode): D3TreeNode[] {
  const nodes: D3TreeNode[] = [];

  function traverse(node: D3TreeNode) {
    nodes.push(node);
    node.children.forEach(traverse);
  }

  traverse(root);
  return nodes;
}

/**
 * Get links (edges) from tree structure
 */
export function getTreeLinks(
  root: D3TreeNode,
  edgeActions: Map<string, Action[]>
): Array<{ source: D3TreeNode; target: D3TreeNode; actions: Action[] }> {
  const links: Array<{ source: D3TreeNode; target: D3TreeNode; actions: Action[] }> = [];

  function traverse(node: D3TreeNode) {
    node.children.forEach((child) => {
      const edgeKey = `${node.id}->${child.id}`;
      links.push({
        source: node,
        target: child,
        actions: edgeActions.get(edgeKey) || [],
      });
      traverse(child);
    });
  }

  traverse(root);
  return links;
}

/**
 * Calculate tree layout positions using a simple algorithm
 * This is a simplified version - the actual D3TreeGraph will use d3.tree()
 */
export function calculateTreeLayout(
  root: D3TreeNode,
  width: number,
  _height: number
): { nodes: TreeNodeWithPosition[]; links: TreeLink[] } {
  const nodeWidth = 80;
  const levelHeight = 120;

  // Calculate depth for each node
  const nodesWithDepth: Array<D3TreeNode & { depth: number }> = [];

  function assignDepth(node: D3TreeNode, depth: number) {
    nodesWithDepth.push({ ...node, depth });
    node.children.forEach((child) => assignDepth(child, depth + 1));
  }

  assignDepth(root, 0);

  // Group nodes by depth level
  const levelGroups = new Map<number, Array<D3TreeNode & { depth: number }>>();
  nodesWithDepth.forEach((node) => {
    if (!levelGroups.has(node.depth)) {
      levelGroups.set(node.depth, []);
    }
    levelGroups.get(node.depth)!.push(node);
  });

  // Assign x positions within each level
  const positionedNodes: TreeNodeWithPosition[] = [];
  levelGroups.forEach((nodes, depth) => {
    const levelWidth = nodes.length * nodeWidth + (nodes.length - 1) * 40;
    const startX = (width - levelWidth) / 2;

    nodes.forEach((node, index) => {
      positionedNodes.push({
        ...node,
        x: startX + index * (nodeWidth + 40) + nodeWidth / 2,
        y: 60 + depth * levelHeight,
      });
    });
  });

  // Create positioned node lookup
  const nodePositions = new Map<string, TreeNodeWithPosition>();
  positionedNodes.forEach((node) => {
    nodePositions.set(node.id, node);
  });

  // Build links with positions
  const links: TreeLink[] = [];
  function buildLinks(node: D3TreeNode) {
    const sourcePos = nodePositions.get(node.id)!;
    node.children.forEach((child) => {
      const targetPos = nodePositions.get(child.id)!;
      links.push({
        source: sourcePos,
        target: targetPos,
        actions: [], // Actions will be added separately
      });
      buildLinks(child);
    });
  }
  buildLinks(root);

  return { nodes: positionedNodes, links };
}
