import { create } from 'zustand';
import type {
  StateGraphData,
  AppState,
  AvailableAction,
  ExplorationSession
} from '@/types';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface AppStore {
  // Connection state
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Session
  session: ExplorationSession | null;
  setSession: (session: ExplorationSession) => void;

  // Graph state
  graphData: StateGraphData | null;
  setGraphData: (data: StateGraphData) => void;

  // Current state
  currentState: AppState | null;
  setCurrentState: (state: AppState) => void;

  // Path from root
  pathFromRoot: string[];
  setPathFromRoot: (path: string[]) => void;

  // Available actions
  availableActions: AvailableAction[];
  setAvailableActions: (actions: AvailableAction[]) => void;

  // UI state
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  executionStatus: string;
  setExecutionStatus: (status: string) => void;

  // Graph view controls
  shouldFitGraph: boolean;
  triggerFitGraph: () => void;
  clearFitGraph: () => void;
}

export const useStore = create<AppStore>((set) => ({
  // Connection state
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // Session
  session: null,
  setSession: (session) => set({ session }),

  // Graph state
  graphData: null,
  setGraphData: (data) => set({ graphData: data }),

  // Current state
  currentState: null,
  setCurrentState: (state) => set({ currentState: state }),

  // Path from root
  pathFromRoot: [],
  setPathFromRoot: (path) => set({ pathFromRoot: path }),

  // Available actions
  availableActions: [],
  setAvailableActions: (actions) => set({ availableActions: actions }),

  // UI state
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  executionStatus: '',
  setExecutionStatus: (status) => set({ executionStatus: status }),

  // Graph view controls
  shouldFitGraph: false,
  triggerFitGraph: () => set({ shouldFitGraph: true }),
  clearFitGraph: () => set({ shouldFitGraph: false }),
}));
