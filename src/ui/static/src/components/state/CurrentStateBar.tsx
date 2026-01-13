import { useStore } from '@/store';
import { Badge } from '@/components/ui/badge';

export function CurrentStateBar() {
  const { currentState, pathFromRoot, graphData } = useStore();

  if (!currentState) {
    return (
      <div className="px-4 py-2 border-b bg-card text-sm text-muted-foreground">
        No current state
      </div>
    );
  }

  const isEntry = graphData?.entryStateId === currentState.id;

  return (
    <div className="px-4 py-2 border-b bg-card flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Current State:</span>
        <code className="text-sm bg-muted px-2 py-0.5 rounded">
          {currentState.id.slice(0, 12)}
        </code>
        {isEntry && (
          <Badge variant="success" className="text-xs">
            Entry
          </Badge>
        )}
      </div>
      <div className="flex-1 text-sm text-muted-foreground truncate">
        {currentState.description}
      </div>
      <div className="text-xs text-muted-foreground">
        Depth: {pathFromRoot.length}
      </div>
    </div>
  );
}
