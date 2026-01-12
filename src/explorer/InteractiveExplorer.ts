import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { EventEmitter } from 'events';
import { ActionDiscovery } from './ActionDiscovery';
import { StateManager } from './StateManager';
import { StateGraph } from '../graph/StateGraph';
import {
  Action,
  AppState,
  StateTransition,
  DEFAULT_CONFIG,
} from '../types';
import {
  AvailableAction,
  ExplorationSession,
  ExplorationStep,
  InteractiveExplorerConfig,
  ActionResultPayload,
  StateUpdatePayload,
} from '../types/interactive';

export class InteractiveExplorer extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private actionDiscovery: ActionDiscovery;
  private stateManager: StateManager;
  private stateGraph: StateGraph;
  private currentStateId: string = '';
  private entryStateId: string = '';
  private pathFromRoot: string[] = [];
  private skippedActions: Map<string, Set<string>> = new Map();
  private explorationHistory: ExplorationStep[] = [];
  private executionLock: boolean = false;
  private startTime: number = 0;
  private actionIdCounter: number = 0;

  constructor(private config: InteractiveExplorerConfig) {
    super();
    this.actionDiscovery = new ActionDiscovery({
      ...DEFAULT_CONFIG,
      url: config.url,
      timeout: config.timeout,
      inputValues: config.inputValues,
    });
    this.stateManager = new StateManager();
    this.stateGraph = new StateGraph();
  }

  async init(): Promise<AppState> {
    this.startTime = Date.now();

    console.log(`Starting interactive exploration of ${this.config.url}`);

    this.browser = await chromium.launch({
      headless: false,
      slowMo: this.config.slowMo || 50,
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout);

    // Navigate to entry point
    await this.page.goto(this.config.url, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(500);

    // Capture initial state
    const initialState = await this.captureCurrentState();
    this.stateGraph.setEntryState(initialState.id);
    this.entryStateId = initialState.id;
    this.currentStateId = initialState.id;
    this.pathFromRoot = [initialState.id];

    console.log(`Initial state: ${initialState.id} - ${initialState.description}`);

    return initialState;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  // State inspection methods
  getCurrentState(): AppState | null {
    return this.stateManager.getState(this.currentStateId) || null;
  }

  getCurrentStateId(): string {
    return this.currentStateId;
  }

  getEntryStateId(): string {
    return this.entryStateId;
  }

  getPathFromRoot(): string[] {
    return [...this.pathFromRoot];
  }

  getStateGraph(): StateGraph {
    return this.stateGraph;
  }

  getAllStates(): AppState[] {
    return this.stateManager.getAllStates();
  }

  // Generate available actions for current state
  async getAvailableActions(): Promise<AvailableAction[]> {
    const currentState = this.getCurrentState();
    if (!currentState) return [];

    const availableActions: AvailableAction[] = [];

    for (const element of currentState.elements) {
      const actions = this.actionDiscovery.generateActionsForElement(element);

      for (const action of actions) {
        const actionKey = this.getActionKey(action);
        const actionId = `${currentState.id}:${actionKey}`;

        // Check if this action has been explored
        const isExplored = this.stateManager.isActionExplored(currentState.id, action);

        // Check if user has skipped this action
        const isSkipped = this.isActionSkipped(currentState.id, actionKey);

        // Find result state if explored
        let resultStateId: string | undefined;
        if (isExplored) {
          const transitions = this.stateGraph.getTransitionsFrom(currentState.id);
          const matchingTransition = transitions.find(
            t => t.action.elementSelector === action.elementSelector && t.action.type === action.type
          );
          if (matchingTransition) {
            resultStateId = matchingTransition.toStateId;
          }
        }

        availableActions.push({
          id: actionId,
          action,
          isExplored,
          isSkipped,
          resultStateId,
        });
      }
    }

    return availableActions;
  }

  // Execute a specific action
  async executeAction(actionId: string): Promise<ActionResultPayload> {
    if (this.executionLock) {
      throw new Error('Action already in progress');
    }

    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    this.executionLock = true;
    const previousStateId = this.currentStateId;

    try {
      // Parse action ID to get the action
      const availableActions = await this.getAvailableActions();
      const actionItem = availableActions.find(a => a.id === actionId);

      if (!actionItem) {
        throw new Error(`Action not found: ${actionId}`);
      }

      const action = actionItem.action;
      console.log(`Executing: ${action.type} on "${action.elementLabel}"`);

      // Mark action as explored
      this.stateManager.markActionExplored(this.currentStateId, action);

      // Execute the action
      const success = await this.executeActionInternal(action);

      if (!success) {
        return {
          success: false,
          previousStateId,
          newStateId: previousStateId,
          isNewState: false,
          error: 'Action execution failed',
        };
      }

      // Wait for potential state changes
      await this.page.waitForTimeout(300);

      // Capture the new state
      const newState = await this.captureCurrentState();
      const isNewState = newState.id !== previousStateId &&
        !this.stateManager.getAllStates().some(s => s.id === newState.id && s.timestamp < newState.timestamp);

      // Record the transition
      const transition: StateTransition = {
        id: `trans_${this.stateGraph.getTransitions().length + 1}`,
        fromStateId: previousStateId,
        toStateId: newState.id,
        action,
      };

      this.stateGraph.addTransition(transition);

      // Record exploration step
      this.explorationHistory.push({
        timestamp: Date.now(),
        fromStateId: previousStateId,
        toStateId: newState.id,
        action,
      });

      // Update current state
      this.currentStateId = newState.id;
      if (newState.id !== previousStateId) {
        this.pathFromRoot.push(newState.id);
      }

      console.log(`  -> ${newState.id !== previousStateId ? 'New state' : 'Same state'}: ${newState.description}`);

      // Emit events
      this.emit('stateChange', this.buildStateUpdatePayload());
      if (isNewState) {
        this.emit('graphUpdate', this.stateGraph.toJSON());
      }

      return {
        success: true,
        previousStateId,
        newStateId: newState.id,
        isNewState,
      };
    } catch (error) {
      return {
        success: false,
        previousStateId,
        newStateId: previousStateId,
        isNewState: false,
        error: (error as Error).message,
      };
    } finally {
      this.executionLock = false;
    }
  }

  // Skip action management
  skipAction(stateId: string, actionKey: string): void {
    if (!this.skippedActions.has(stateId)) {
      this.skippedActions.set(stateId, new Set());
    }
    this.skippedActions.get(stateId)!.add(actionKey);
  }

  unskipAction(stateId: string, actionKey: string): void {
    const skipped = this.skippedActions.get(stateId);
    if (skipped) {
      skipped.delete(actionKey);
    }
  }

  isActionSkipped(stateId: string, actionKey: string): boolean {
    const skipped = this.skippedActions.get(stateId);
    return skipped ? skipped.has(actionKey) : false;
  }

  // Navigate to a specific state via action replay
  async jumpToState(targetStateId: string): Promise<StateUpdatePayload> {
    if (this.executionLock) {
      throw new Error('Action in progress');
    }

    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const targetState = this.stateGraph.getState(targetStateId);
    if (!targetState) {
      throw new Error(`Unknown state: ${targetStateId}`);
    }

    this.executionLock = true;

    try {
      // If jumping to entry state, just reload
      if (targetStateId === this.entryStateId) {
        await this.page.goto(this.config.url, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(300);
        this.currentStateId = this.entryStateId;
        this.pathFromRoot = [this.entryStateId];
        return this.buildStateUpdatePayload();
      }

      // Find shortest path from entry to target
      const paths = this.findPathsTo(targetStateId);
      if (paths.length === 0) {
        throw new Error(`No path found to state: ${targetStateId}`);
      }

      const shortestPath = paths[0];
      console.log(`Navigating to ${targetStateId} via path: ${shortestPath.join(' -> ')}`);

      // Reset to entry state
      await this.page.goto(this.config.url, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(300);

      // Replay actions along path
      for (let i = 0; i < shortestPath.length - 1; i++) {
        const fromStateId = shortestPath[i];
        const toStateId = shortestPath[i + 1];

        // Find transition between these states
        const transitions = this.stateGraph.getTransitionsFrom(fromStateId);
        const transition = transitions.find(t => t.toStateId === toStateId);

        if (transition) {
          console.log(`  Replaying: ${transition.action.type} on "${transition.action.elementLabel}"`);
          await this.executeActionInternal(transition.action);
          await this.page.waitForTimeout(200);
        }
      }

      // Verify we reached the target state (or close to it)
      const currentState = await this.captureCurrentState();

      if (currentState.id !== targetStateId) {
        console.warn(`State mismatch: expected ${targetStateId}, got ${currentState.id}`);
      }

      this.currentStateId = currentState.id;
      this.pathFromRoot = shortestPath;

      return this.buildStateUpdatePayload();
    } finally {
      this.executionLock = false;
    }
  }

  // Go back to root state
  async goToRoot(): Promise<StateUpdatePayload> {
    return this.jumpToState(this.entryStateId);
  }

  // Session serialization
  toSession(): ExplorationSession {
    const skippedActionsObj: Record<string, string[]> = {};
    for (const [stateId, actions] of this.skippedActions) {
      skippedActionsObj[stateId] = Array.from(actions);
    }

    return {
      version: 1,
      id: `session_${Date.now()}`,
      appUrl: this.config.url,
      createdAt: new Date(this.startTime).toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      currentStateId: this.currentStateId,
      entryStateId: this.entryStateId,
      stateGraph: this.stateGraph.toJSON(),
      skippedActions: skippedActionsObj,
      explorationHistory: this.explorationHistory,
    };
  }

  async fromSession(session: ExplorationSession): Promise<void> {
    // Restore state graph
    for (const state of Object.values(session.stateGraph.states)) {
      this.stateGraph.addState(state);
      this.stateManager.restoreState(state);
    }

    for (const transition of session.stateGraph.transitions) {
      this.stateGraph.addTransition(transition);
      // Mark actions as explored
      this.stateManager.markActionExplored(transition.fromStateId, transition.action);
    }

    this.stateGraph.setEntryState(session.entryStateId);
    this.entryStateId = session.entryStateId;

    // Restore skipped actions
    for (const [stateId, actions] of Object.entries(session.skippedActions)) {
      this.skippedActions.set(stateId, new Set(actions));
    }

    // Restore exploration history
    this.explorationHistory = session.explorationHistory;

    // Navigate to current state
    await this.jumpToState(session.currentStateId);
  }

  // Build state update payload
  buildStateUpdatePayload(): StateUpdatePayload {
    return {
      currentState: this.getCurrentState()!,
      availableActions: [], // Will be populated by caller
      pathFromRoot: this.pathFromRoot,
    };
  }

  // Private methods
  private async captureCurrentState(): Promise<AppState> {
    if (!this.page) throw new Error('Page not initialized');

    const elements = await this.actionDiscovery.discoverElements(this.page);
    const state = await this.stateManager.captureState(this.page, elements);
    this.stateGraph.addState(state);

    return state;
  }

  private async executeActionInternal(action: Action): Promise<boolean> {
    if (!this.page) return false;

    try {
      const element = this.page.locator(action.elementSelector).first();
      const isVisible = await element.isVisible().catch(() => false);

      if (!isVisible) {
        return false;
      }

      switch (action.type) {
        case 'click':
          await element.click({ timeout: 5000 });
          break;

        case 'input':
          await element.fill(action.value || 'Test input');
          const form = await element.evaluate(el => el.closest('form'));
          if (form) {
            await this.page.keyboard.press('Enter');
          }
          break;

        case 'check':
          await element.click({ timeout: 5000 });
          break;

        case 'select':
          const options = await element.locator('option').all();
          if (options.length > 1) {
            const value = await options[1].getAttribute('value');
            if (value) {
              await element.selectOption(value);
            }
          }
          break;

        case 'submit':
          await element.click({ timeout: 5000 });
          break;
      }

      return true;
    } catch (error) {
      console.error(`Action execution error: ${(error as Error).message}`);
      return false;
    }
  }

  private getActionKey(action: Action): string {
    return `${action.type}:${action.elementSelector}:${action.value || ''}`;
  }

  private findPathsTo(targetStateId: string, maxPaths: number = 1): string[][] {
    if (targetStateId === this.entryStateId) {
      return [[this.entryStateId]];
    }

    const allPaths: string[][] = [];
    const queue: { stateId: string; path: string[] }[] = [
      { stateId: this.entryStateId, path: [this.entryStateId] },
    ];

    const visited = new Set<string>();

    while (queue.length > 0 && allPaths.length < maxPaths) {
      const { stateId, path } = queue.shift()!;

      if (stateId === targetStateId) {
        allPaths.push(path);
        continue;
      }

      const pathKey = path.join('->');
      if (visited.has(pathKey)) continue;
      visited.add(pathKey);

      const outgoing = this.stateGraph.getTransitionsFrom(stateId);

      for (const transition of outgoing) {
        if (!path.includes(transition.toStateId) || transition.toStateId === targetStateId) {
          queue.push({
            stateId: transition.toStateId,
            path: [...path, transition.toStateId],
          });
        }
      }
    }

    return allPaths;
  }

  isExecuting(): boolean {
    return this.executionLock;
  }

  getExplorationDuration(): number {
    return Date.now() - this.startTime;
  }
}
