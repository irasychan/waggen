import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Play, SkipForward, Undo2 } from 'lucide-react';
import type { AvailableAction } from '@/types';

interface ActionItemProps {
  action: AvailableAction;
  onExecute: (actionId: string) => void;
  onSkip?: (actionId: string) => void;
  onUnskip?: (actionId: string) => void;
  variant?: 'default' | 'explored' | 'skipped';
}

const actionTypeColors: Record<string, string> = {
  click: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  input: 'bg-green-500/20 text-green-400 border-green-500/30',
  submit: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  select: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  check: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

export function ActionItem({
  action,
  onExecute,
  onSkip,
  onUnskip,
  variant = 'default',
}: ActionItemProps) {
  const isSkipped = variant === 'skipped';
  const isExplored = variant === 'explored';

  return (
    <Card
      className={cn(
        'transition-colors',
        isSkipped && 'opacity-50',
        isExplored && 'border-muted'
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Badge
            variant="outline"
            className={cn('text-xs shrink-0', actionTypeColors[action.action.type])}
          >
            {action.action.type}
          </Badge>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm font-medium truncate',
                isSkipped && 'line-through'
              )}
              title={action.action.elementLabel}
            >
              {action.action.elementLabel}
            </p>
            <p
              className="text-xs text-muted-foreground font-mono truncate"
              title={action.action.elementSelector}
            >
              {action.action.elementSelector}
            </p>
            {action.action.value && (
              <p className="text-xs text-muted-foreground mt-1">
                Value: {action.action.value}
              </p>
            )}
            {isExplored && action.resultStateId && (
              <p className="text-xs text-muted-foreground mt-1">
                → {action.resultStateId.slice(0, 12)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onExecute(action.id)}
          >
            <Play className="h-3 w-3 mr-1" />
            Execute
          </Button>
          {isSkipped && onUnskip ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUnskip(action.id)}
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Unskip
            </Button>
          ) : onSkip ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSkip(action.id)}
            >
              <SkipForward className="h-3 w-3 mr-1" />
              Skip
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
