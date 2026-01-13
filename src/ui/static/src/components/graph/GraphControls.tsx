import { Button } from '@/components/ui/button';
import { Maximize } from 'lucide-react';

interface GraphControlsProps {
  onFit: () => void;
}

export function GraphControls({ onFit }: GraphControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
      <Button variant="outline" size="icon" onClick={onFit} title="Fit to view (F)">
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}
