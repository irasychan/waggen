import { useMemo } from 'react';
import { useStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Navigation } from 'lucide-react';

export function StateDetails() {
  const { selectedNodeId, graphData } = useStore();
  const { jumpToState } = useWebSocket();

  const selectedState = useMemo(() => {
    if (!selectedNodeId || !graphData) return null;
    return graphData.states[selectedNodeId];
  }, [selectedNodeId, graphData]);

  if (!selectedState) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Click a node to view details
      </div>
    );
  }

  const isEntry = graphData?.entryStateId === selectedState.id;

  return (
    <ScrollArea className="h-64">
      <Card className="m-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            State Details
            {isEntry && (
              <Badge variant="success" className="text-xs">
                Entry
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">ID</label>
            <p className="text-sm font-mono">{selectedState.id}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <p className="text-sm">{selectedState.description}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">URL</label>
            <p className="text-sm font-mono truncate" title={selectedState.url}>
              {selectedState.url}
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">DOM Hash</label>
            <p className="text-sm font-mono">{selectedState.domHash}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Elements</label>
            <p className="text-sm">{selectedState.elements.length} interactive elements</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => jumpToState(selectedState.id)}
          >
            <Navigation className="h-3 w-3 mr-1" />
            Jump to this state
          </Button>
        </CardContent>
      </Card>
    </ScrollArea>
  );
}
