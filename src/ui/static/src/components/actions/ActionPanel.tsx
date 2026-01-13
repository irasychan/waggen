import { useMemo } from 'react';
import { useStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActionItem } from './ActionItem';

export function ActionPanel() {
  const { availableActions, currentState } = useStore();
  const { executeAction, skipAction, unskipAction } = useWebSocket();

  // Group actions by status
  const { unexplored, explored, skipped } = useMemo(() => {
    const unexplored = availableActions.filter((a) => !a.isExplored && !a.isSkipped);
    const explored = availableActions.filter((a) => a.isExplored && !a.isSkipped);
    const skipped = availableActions.filter((a) => a.isSkipped);
    return { unexplored, explored, skipped };
  }, [availableActions]);

  const handleSkip = (actionId: string) => {
    if (currentState) {
      skipAction(actionId, currentState.id);
    }
  };

  const handleUnskip = (actionId: string) => {
    if (currentState) {
      unskipAction(actionId, currentState.id);
    }
  };

  if (!currentState) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No state selected
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <h2 className="text-sm font-semibold mb-4">
          Available Actions ({availableActions.length})
        </h2>

        {/* Unexplored actions */}
        {unexplored.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
              Unexplored ({unexplored.length})
            </h3>
            <div className="space-y-2">
              {unexplored.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  onExecute={executeAction}
                  onSkip={handleSkip}
                />
              ))}
            </div>
          </div>
        )}

        {/* Explored actions */}
        {explored.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
              Explored ({explored.length})
            </h3>
            <div className="space-y-2">
              {explored.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  onExecute={executeAction}
                  onSkip={handleSkip}
                  variant="explored"
                />
              ))}
            </div>
          </div>
        )}

        {/* Skipped actions */}
        {skipped.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
              Skipped ({skipped.length})
            </h3>
            <div className="space-y-2">
              {skipped.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  onExecute={executeAction}
                  onUnskip={handleUnskip}
                  variant="skipped"
                />
              ))}
            </div>
          </div>
        )}

        {availableActions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No actions available for this state
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
