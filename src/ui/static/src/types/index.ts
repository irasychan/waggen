// Core types (mirrored from backend src/types/index.ts)
export type ElementType = 'button' | 'link' | 'input' | 'checkbox' | 'select';
export type ActionType = 'click' | 'input' | 'submit' | 'select' | 'check';

export interface InteractiveElement {
  selector: string;
  type: ElementType;
  label: string;
  tagName: string;
  attributes: Record<string, string>;
}

export interface Action {
  type: ActionType;
  elementSelector: string;
  elementLabel: string;
  value?: string;
}

export interface AppState {
  id: string;
  url: string;
  domHash: string;
  description: string;
  elements: InteractiveElement[];
  timestamp: number;
}

export interface StateTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  action: Action;
}

export interface StateGraphData {
  metadata: {
    appUrl: string;
    generatedAt: string;
    totalStates: number;
    totalTransitions: number;
    explorationDurationMs: number;
  };
  states: Record<string, AppState>;
  transitions: StateTransition[];
  paths: Record<string, string[][]>;
  entryStateId: string;
}

// Interactive types (mirrored from backend src/types/interactive.ts)
export interface AvailableAction {
  id: string;
  action: Action;
  isExplored: boolean;
  isSkipped: boolean;
  resultStateId?: string;
}

export interface ExplorationStep {
  timestamp: number;
  fromStateId: string;
  toStateId: string;
  action: Action;
}

export interface ExplorationSession {
  version: number;
  id: string;
  appUrl: string;
  createdAt: string;
  lastUpdatedAt: string;
  currentStateId: string;
  entryStateId: string;
  stateGraph: StateGraphData;
  skippedActions: Record<string, string[]>;
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

// Message payloads
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

// Cytoscape format (still used by backend, we convert to D3)
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

// D3 tree types
export interface D3TreeNode {
  id: string;
  state: AppState;
  children: D3TreeNode[];
  isEntry: boolean;
  isCurrent: boolean;
}

export interface D3Link {
  source: string;
  target: string;
  actions: Action[];
}
