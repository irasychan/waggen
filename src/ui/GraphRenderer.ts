import { StateGraphData, AppState, StateTransition } from '../types';

export interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    description: string;
    url: string;
    domHash: string;
    elementCount: number;
    isEntry: boolean;
    elements: AppState['elements'];
  };
}

export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    actions: Array<{
      type: string;
      selector: string;
      elementLabel: string;
      value?: string;
    }>;
  };
}

export interface CytoscapeData {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

export class GraphRenderer {
  static toCytoscapeFormat(graph: StateGraphData): CytoscapeData {
    const nodes: CytoscapeNode[] = [];
    const edges: CytoscapeEdge[] = [];

    // Convert states to nodes
    for (const [id, state] of Object.entries(graph.states)) {
      nodes.push({
        data: {
          id: state.id,
          label: state.description.slice(0, 25) + (state.description.length > 25 ? '...' : ''),
          description: state.description,
          url: state.url,
          domHash: state.domHash,
          elementCount: state.elements.length,
          isEntry: state.id === graph.entryStateId,
          elements: state.elements,
        },
      });
    }

    // Aggregate transitions between same source/target pairs
    const edgeMap = new Map<string, StateTransition[]>();
    for (const transition of graph.transitions) {
      const key = `${transition.fromStateId}->${transition.toStateId}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, []);
      }
      edgeMap.get(key)!.push(transition);
    }

    // Convert aggregated transitions to edges
    let edgeIndex = 0;
    for (const [key, transitions] of edgeMap) {
      const [source, target] = key.split('->');
      const actions = transitions.map(t => ({
        type: t.action.type,
        selector: t.action.elementSelector,
        elementLabel: t.action.elementLabel,
        value: t.action.value,
      }));

      // Create label from first 2 actions
      const labels = transitions.slice(0, 2).map(t => t.action.elementLabel);
      const label = labels.join(', ') + (transitions.length > 2 ? ` (+${transitions.length - 2})` : '');

      edges.push({
        data: {
          id: `edge_${edgeIndex++}`,
          source,
          target,
          label,
          actions,
        },
      });
    }

    return { nodes, edges };
  }
}
