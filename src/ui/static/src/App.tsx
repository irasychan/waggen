import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/components/layout/Header';
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout';
import { StateTree } from '@/components/tree/StateTree';
import { D3TreeGraph } from '@/components/graph/D3TreeGraph';
import { ActionPanel } from '@/components/actions/ActionPanel';
import { CurrentStateBar } from '@/components/state/CurrentStateBar';
import { StateDetails } from '@/components/state/StateDetails';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useWebSocket } from '@/hooks/useWebSocket';

function App() {
  // Initialize WebSocket connection
  useWebSocket();

  // Setup keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen">
        <Header />
        <ThreeColumnLayout
          left={<StateTree />}
          center={
            <div className="flex flex-col flex-1 overflow-hidden">
              <CurrentStateBar />
              <D3TreeGraph />
            </div>
          }
          right={
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-hidden">
                <ActionPanel />
              </div>
              <div className="border-t">
                <StateDetails />
              </div>
            </div>
          }
        />
      </div>
    </TooltipProvider>
  );
}

export default App;
