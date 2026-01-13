import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Play } from 'lucide-react';
import type { AvailableAction } from '@/types';

interface UnexploredPlaceholdersProps {
  actions: AvailableAction[];
  onExecute: (actionId: string) => void;
}

export function UnexploredPlaceholders({
  actions,
  onExecute,
}: UnexploredPlaceholdersProps) {
  // Only show first 5 unexplored actions as floating badges
  const displayActions = actions.slice(0, 5);

  return (
    <TooltipProvider>
      <div className="absolute bottom-16 left-4 flex flex-col gap-2 max-w-xs">
        <span className="text-xs text-muted-foreground mb-1">
          Unexplored Actions ({actions.length})
        </span>
        {displayActions.map((action) => (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 p-2 rounded border border-dashed border-muted-foreground/50 bg-card/80 backdrop-blur-sm">
                <Badge variant="outline" className="text-xs">
                  {action.action.type}
                </Badge>
                <span className="text-sm truncate flex-1">
                  {action.action.elementLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onExecute(action.id)}
                >
                  <Play className="h-3 w-3" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              <div className="space-y-1">
                <p className="font-medium">{action.action.type}</p>
                <p className="text-xs">{action.action.elementLabel}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {action.action.elementSelector}
                </p>
                {action.action.value && (
                  <p className="text-xs">Value: {action.action.value}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        {actions.length > 5 && (
          <span className="text-xs text-muted-foreground">
            +{actions.length - 5} more...
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
