import { useEffect } from 'react';
import { useStore } from '@/store';

interface KeyboardShortcutsOptions {
  onFit?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { setSelectedNodeId, triggerFitGraph } = useStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'f':
          // Fit graph to view
          if (options.onFit) {
            options.onFit();
          } else {
            triggerFitGraph();
          }
          break;
        case 'escape':
          // Deselect current node
          setSelectedNodeId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [options, setSelectedNodeId, triggerFitGraph]);
}
