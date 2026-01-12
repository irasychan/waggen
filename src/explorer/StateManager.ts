import { Page } from 'playwright';
import { createHash } from 'crypto';
import { AppState, InteractiveElement, Action } from '../types';

export class StateManager {
  private states: Map<string, AppState> = new Map();
  private stateCounter = 0;
  private exploredActions: Map<string, Set<string>> = new Map();

  async captureState(page: Page, elements: InteractiveElement[]): Promise<AppState> {
    const url = page.url();
    const domHash = await this.computeDomHash(page);
    const stateKey = this.computeStateKey(url, domHash);

    const existingState = this.findStateByKey(stateKey);
    if (existingState) {
      return existingState;
    }

    const state: AppState = {
      id: `state_${String(++this.stateCounter).padStart(3, '0')}`,
      url,
      domHash,
      description: await this.generateDescription(page),
      elements,
      timestamp: Date.now(),
    };

    this.states.set(state.id, state);
    this.exploredActions.set(state.id, new Set());

    return state;
  }

  private async computeDomHash(page: Page): Promise<string> {
    const domSignature = await page.evaluate(() => {
      const interactiveSelectors = [
        'button',
        'a[href]',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[data-testid]',
      ];

      const elements: string[] = [];

      interactiveSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el as HTMLElement);

          if (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0
          ) {
            const signature = [
              el.tagName,
              el.getAttribute('id') || '',
              el.getAttribute('data-testid') || '',
              el.getAttribute('class') || '',
              el.textContent?.trim().slice(0, 30) || '',
              (el as HTMLInputElement).checked ? 'checked' : '',
              (el as HTMLInputElement).disabled ? 'disabled' : '',
            ].join('|');

            elements.push(signature);
          }
        });
      });

      // Also capture list items to detect todo count changes
      const listItems = document.querySelectorAll('li:not(.empty-state)');
      elements.push(`list-items:${listItems.length}`);

      // Capture filter state
      const activeFilter = document.querySelector('.filter-btn.active');
      if (activeFilter) {
        elements.push(`filter:${activeFilter.getAttribute('data-filter')}`);
      }

      return elements.sort().join('\n');
    });

    return createHash('md5').update(domSignature).digest('hex').slice(0, 12);
  }

  private computeStateKey(url: string, domHash: string): string {
    const urlPath = new URL(url).pathname;
    return `${urlPath}:${domHash}`;
  }

  private findStateByKey(stateKey: string): AppState | undefined {
    for (const state of this.states.values()) {
      const existingKey = this.computeStateKey(state.url, state.domHash);
      if (existingKey === stateKey) {
        return state;
      }
    }
    return undefined;
  }

  private async generateDescription(page: Page): Promise<string> {
    return page.evaluate(() => {
      const parts: string[] = [];

      // Page title
      const title = document.title;
      if (title) parts.push(title);

      // Count visible items
      const listItems = document.querySelectorAll('li:not(.empty-state)');
      if (listItems.length > 0) {
        parts.push(`${listItems.length} items`);
      } else {
        parts.push('empty list');
      }

      // Active filter
      const activeFilter = document.querySelector('.filter-btn.active');
      if (activeFilter) {
        const filter = activeFilter.getAttribute('data-filter');
        if (filter && filter !== 'all') {
          parts.push(`filter: ${filter}`);
        }
      }

      // Completed items count
      const completedItems = document.querySelectorAll('.todo-item.completed');
      if (completedItems.length > 0) {
        parts.push(`${completedItems.length} completed`);
      }

      return parts.join(' - ') || 'Unknown state';
    });
  }

  isStateKnown(stateId: string): boolean {
    return this.states.has(stateId);
  }

  getState(stateId: string): AppState | undefined {
    return this.states.get(stateId);
  }

  getAllStates(): AppState[] {
    return Array.from(this.states.values());
  }

  markActionExplored(stateId: string, action: Action): void {
    const actionKey = this.getActionKey(action);
    const explored = this.exploredActions.get(stateId);
    if (explored) {
      explored.add(actionKey);
    }
  }

  isActionExplored(stateId: string, action: Action): boolean {
    const actionKey = this.getActionKey(action);
    const explored = this.exploredActions.get(stateId);
    return explored ? explored.has(actionKey) : false;
  }

  getUnexploredActions(stateId: string, actions: Action[]): Action[] {
    return actions.filter(action => !this.isActionExplored(stateId, action));
  }

  private getActionKey(action: Action): string {
    return `${action.type}:${action.elementSelector}:${action.value || ''}`;
  }

  getStats(): { totalStates: number; totalExploredActions: number } {
    let totalExploredActions = 0;
    for (const actions of this.exploredActions.values()) {
      totalExploredActions += actions.size;
    }
    return {
      totalStates: this.states.size,
      totalExploredActions,
    };
  }
}
