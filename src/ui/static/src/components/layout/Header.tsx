import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Save, Home, Maximize } from 'lucide-react';

export function Header() {
  const { connectionStatus, executionStatus, session, triggerFitGraph } = useStore();
  const { goToRoot, saveSession } = useWebSocket();

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Waggen Explorer</h1>
        <Badge
          variant={connectionStatus === 'connected' ? 'success' : 'destructive'}
        >
          {connectionStatus === 'connected'
            ? 'Connected'
            : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Disconnected'}
        </Badge>
        {session && (
          <span className="text-sm text-muted-foreground">
            {session.appUrl}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {executionStatus && (
          <span className="text-sm text-muted-foreground mr-4">
            {executionStatus}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={() => triggerFitGraph()}>
          <Maximize className="h-4 w-4 mr-1" />
          Fit
        </Button>
        <Button variant="outline" size="sm" onClick={goToRoot}>
          <Home className="h-4 w-4 mr-1" />
          Root
        </Button>
        <Button variant="outline" size="sm" onClick={() => saveSession()}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </header>
  );
}
