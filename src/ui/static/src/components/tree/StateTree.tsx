import { useMemo } from 'react';
import { useStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TreeNode } from './TreeNode';
import { buildTreeHierarchy } from '@/lib/graphTransform';

export function StateTree() {
  const { graphData, currentState } = useStore();
  const { jumpToState } = useWebSocket();

  const treeRoot = useMemo(() => {
    if (!graphData) return null;
    return buildTreeHierarchy(graphData, currentState?.id || null);
  }, [graphData, currentState?.id]);

  if (!treeRoot) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No states discovered yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <h2 className="text-sm font-semibold mb-2 px-2">State Tree</h2>
        <TreeNode
          node={treeRoot}
          onSelect={jumpToState}
          depth={0}
        />
      </div>
    </ScrollArea>
  );
}
