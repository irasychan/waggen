import { useRef, useMemo } from 'react';
import { useStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useD3Tree } from '@/hooks/useD3Tree';
import { GraphControls } from './GraphControls';
import { UnexploredPlaceholders } from './UnexploredPlaceholders';

export function D3TreeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { setSelectedNodeId, availableActions, currentState } = useStore();
  const { jumpToState, executeAction } = useWebSocket();

  const { fitToView } = useD3Tree(svgRef, {
    onNodeClick: (nodeId) => {
      setSelectedNodeId(nodeId);
    },
    onNodeDoubleClick: (nodeId) => {
      jumpToState(nodeId);
    },
  });

  // Get unexplored actions for current state
  const unexploredActions = useMemo(() => {
    return availableActions.filter((a) => !a.isExplored && !a.isSkipped);
  }, [availableActions]);

  return (
    <div className="relative flex-1 bg-background">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* Unexplored action placeholders overlay */}
      {currentState && unexploredActions.length > 0 && (
        <UnexploredPlaceholders
          actions={unexploredActions}
          onExecute={executeAction}
        />
      )}

      {/* Graph controls */}
      <GraphControls onFit={fitToView} />
    </div>
  );
}
