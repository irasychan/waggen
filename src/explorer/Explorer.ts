import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { ActionDiscovery } from './ActionDiscovery';
import { StateManager } from './StateManager';
import { StateGraph } from '../graph/StateGraph';
import {
  ExplorerConfig,
  Action,
  AppState,
  ExplorationQueueItem,
  StateTransition,
} from '../types';

export class Explorer {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private actionDiscovery: ActionDiscovery;
  private stateManager: StateManager;
  private stateGraph: StateGraph;
  private explorationQueue: ExplorationQueueItem[] = [];
  private startTime: number = 0;

  constructor(private config: ExplorerConfig) {
    this.actionDiscovery = new ActionDiscovery(config);
    this.stateManager = new StateManager();
    this.stateGraph = new StateGraph();
  }

  async explore(): Promise<StateGraph> {
    this.startTime = Date.now();

    try {
      await this.init();
      await this.runExploration();
    } finally {
      await this.cleanup();
    }

    return this.stateGraph;
  }

  private async init(): Promise<void> {
    console.log(`Starting exploration of ${this.config.url}`);
    console.log(`Max states: ${this.config.maxStates}, Max depth: ${this.config.maxDepth}`);

    this.browser = await chromium.launch({
      headless: this.config.headless,
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout);
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async runExploration(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // Navigate to entry point
    await this.page.goto(this.config.url, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(500);

    // Capture initial state
    const initialState = await this.captureCurrentState();
    this.stateGraph.setEntryState(initialState.id);
    console.log(`Initial state: ${initialState.id} - ${initialState.description}`);

    // Queue initial actions
    await this.queueActionsForState(initialState, []);

    // BFS exploration
    while (this.explorationQueue.length > 0) {
      const stats = this.stateManager.getStats();
      if (stats.totalStates >= this.config.maxStates) {
        console.log(`Reached max states limit (${this.config.maxStates})`);
        break;
      }

      const item = this.explorationQueue.shift()!;
      if (item.pathFromRoot.length >= this.config.maxDepth) {
        console.log(`Skipping action at depth ${item.pathFromRoot.length} (max: ${this.config.maxDepth})`);
        continue;
      }

      await this.exploreAction(item);
    }

    const duration = Date.now() - this.startTime;
    this.stateGraph.setMetadata({
      appUrl: this.config.url,
      generatedAt: new Date().toISOString(),
      totalStates: this.stateManager.getAllStates().length,
      totalTransitions: this.stateGraph.getTransitions().length,
      explorationDurationMs: duration,
    });

    console.log(`\nExploration complete!`);
    console.log(`States discovered: ${this.stateManager.getAllStates().length}`);
    console.log(`Transitions recorded: ${this.stateGraph.getTransitions().length}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  }

  private async captureCurrentState(): Promise<AppState> {
    if (!this.page) throw new Error('Page not initialized');

    const elements = await this.actionDiscovery.discoverElements(this.page);
    const state = await this.stateManager.captureState(this.page, elements);
    this.stateGraph.addState(state);

    return state;
  }

  private async queueActionsForState(state: AppState, pathFromRoot: string[]): Promise<void> {
    const allActions: Action[] = [];

    for (const element of state.elements) {
      const actions = this.actionDiscovery.generateActionsForElement(element);
      allActions.push(...actions);
    }

    const unexploredActions = this.stateManager.getUnexploredActions(state.id, allActions);

    for (const action of unexploredActions) {
      this.explorationQueue.push({
        stateId: state.id,
        action,
        pathFromRoot: [...pathFromRoot, state.id],
      });
    }
  }

  private async exploreAction(item: ExplorationQueueItem): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    const { stateId, action, pathFromRoot } = item;

    // Restore to the starting state
    await this.restoreToState(stateId, pathFromRoot);

    // Mark action as explored
    this.stateManager.markActionExplored(stateId, action);

    console.log(`Exploring: ${action.type} on "${action.elementLabel}" from ${stateId}`);

    try {
      // Execute the action
      const success = await this.executeAction(action);
      if (!success) {
        console.log(`  -> Action failed, skipping`);
        return;
      }

      // Wait for potential state changes
      await this.page.waitForTimeout(300);

      // Capture the new state
      const newState = await this.captureCurrentState();

      // Record the transition
      const transition: StateTransition = {
        id: `trans_${this.stateGraph.getTransitions().length + 1}`,
        fromStateId: stateId,
        toStateId: newState.id,
        action,
      };

      this.stateGraph.addTransition(transition);

      if (newState.id !== stateId) {
        console.log(`  -> New state: ${newState.id} - ${newState.description}`);
        // Queue actions for the new state
        await this.queueActionsForState(newState, pathFromRoot);
      } else {
        console.log(`  -> Same state (no change)`);
      }
    } catch (error) {
      console.log(`  -> Error: ${(error as Error).message}`);
    }
  }

  private async executeAction(action: Action): Promise<boolean> {
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
          // If this is a form input, try to submit
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
      return false;
    }
  }

  private async restoreToState(targetStateId: string, pathFromRoot: string[]): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // Simple approach: refresh and replay path
    await this.page.goto(this.config.url, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(300);

    // For now, we don't replay the full path - this is a POC limitation
    // A more sophisticated version would record and replay action sequences
  }

  getStateGraph(): StateGraph {
    return this.stateGraph;
  }
}
