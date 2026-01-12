import { Action, AppState, StateGraphData } from './index';

// Available action with UI metadata
export interface AvailableAction {
  id: string;                    // Unique ID for this action instance
  action: Action;                // Original action
  isExplored: boolean;           // Already executed in this session
  isSkipped: boolean;            // User marked as skip
  resultStateId?: string;        // Known result state if explored
}

// Exploration step for history tracking
export interface ExplorationStep {
  timestamp: number;
  fromStateId: string;
  toStateId: string;
  action: Action;
}

// Session state for persistence
export interface ExplorationSession {
  version: number;
  id: string;
  appUrl: string;
  createdAt: string;
  lastUpdatedAt: string;
  currentStateId: string;
  entryStateId: string;
  stateGraph: StateGraphData;
  skippedActions: Record<string, string[]>; // stateId -> actionKeys[]
  explorationHistory: ExplorationStep[];
}

// WebSocket message types
export type WSMessageType =
  | 'connection_init'
  | 'state_update'
  | 'actions_list'
  | 'execute_action'
  | 'skip_action'
  | 'unskip_action'
  | 'jump_to_state'
  | 'go_to_root'
  | 'action_result'
  | 'graph_update'
  | 'error'
  | 'save_session'
  | 'session_saved'
  | 'load_session'
  | 'request_state';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  timestamp: number;
  payload: T;
}

// Specific message payloads
export interface ConnectionInitPayload {
  session: ExplorationSession;
  currentState: AppState;
  availableActions: AvailableAction[];
}

export interface StateUpdatePayload {
  currentState: AppState;
  availableActions: AvailableAction[];
  pathFromRoot: string[];
}

export interface ActionResultPayload {
  success: boolean;
  previousStateId: string;
  newStateId: string;
  isNewState: boolean;
  error?: string;
}

export interface GraphUpdatePayload {
  graphData: StateGraphData;
  cytoscapeData: CytoscapeData;
}

export interface JumpToStatePayload {
  targetStateId: string;
}

export interface ExecuteActionPayload {
  actionId: string;
}

export interface SkipActionPayload {
  actionId: string;
  stateId: string;
}

export interface SaveSessionPayload {
  filePath?: string;
}

export interface SessionSavedPayload {
  filePath: string;
}

export interface ErrorPayload {
  message: string;
  code: string;
}

// Cytoscape format for frontend
export interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    description: string;
    url: string;
    domHash: string;
    elementCount: number;
    isEntry: boolean;
    elements: Array<{
      type: string;
      label: string;
      selector: string;
    }>;
  };
}

export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    actions: Array<{
      type: string;
      selector: string;
      elementLabel: string;
      value?: string;
    }>;
  };
}

export interface CytoscapeData {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

// Interactive explorer config
export interface InteractiveExplorerConfig {
  url: string;
  timeout: number;
  inputValues: Record<string, string>;
  slowMo?: number;
}

// Server config
export interface InteractiveServerConfig {
  port: number;
  url: string;
  sessionFile?: string;
  outputPath: string;
  openBrowser: boolean;
}
