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

export interface ExplorationQueueItem {
  stateId: string;
  action: Action;
  pathFromRoot: string[];
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

export interface ExplorerConfig {
  url: string;
  maxStates: number;
  maxDepth: number;
  headless: boolean;
  timeout: number;
  inputValues: Record<string, string>;
  outputPath: string;
}

export const DEFAULT_CONFIG: ExplorerConfig = {
  url: 'http://localhost:3000',
  maxStates: 100,
  maxDepth: 10,
  headless: true,
  timeout: 30000,
  inputValues: {
    text: 'Test item',
    email: 'test@example.com',
    password: 'password123',
    number: '42',
  },
  outputPath: './output/graph.json',
};
