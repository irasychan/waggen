import { AppState, StateTransition, StateGraphData } from '../types';

export class StateGraph {
  private states: Map<string, AppState> = new Map();
  private transitions: StateTransition[] = [];
  private entryStateId: string = '';
  private metadata: StateGraphData['metadata'] | null = null;

  addState(state: AppState): void {
    if (!this.states.has(state.id)) {
      this.states.set(state.id, state);
    }
  }

  addTransition(transition: StateTransition): void {
    // Avoid duplicate transitions
    const exists = this.transitions.some(
      t =>
        t.fromStateId === transition.fromStateId &&
        t.toStateId === transition.toStateId &&
        t.action.elementSelector === transition.action.elementSelector &&
        t.action.type === transition.action.type
    );

    if (!exists) {
      this.transitions.push(transition);
    }
  }

  setEntryState(stateId: string): void {
    this.entryStateId = stateId;
  }

  setMetadata(metadata: StateGraphData['metadata']): void {
    this.metadata = metadata;
  }

  getState(stateId: string): AppState | undefined {
    return this.states.get(stateId);
  }

  getAllStates(): AppState[] {
    return Array.from(this.states.values());
  }

  getTransitions(): StateTransition[] {
    return this.transitions;
  }

  getTransitionsFrom(stateId: string): StateTransition[] {
    return this.transitions.filter(t => t.fromStateId === stateId);
  }

  getTransitionsTo(stateId: string): StateTransition[] {
    return this.transitions.filter(t => t.toStateId === stateId);
  }

  computePaths(): Record<string, string[][]> {
    const paths: Record<string, string[][]> = {};

    if (!this.entryStateId) {
      return paths;
    }

    // BFS to find all paths from entry to each state
    for (const state of this.states.values()) {
      paths[state.id] = this.findPathsTo(state.id);
    }

    return paths;
  }

  private findPathsTo(targetStateId: string, maxPaths: number = 3): string[][] {
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

      // Avoid cycles in path finding
      const pathKey = path.join('->');
      if (visited.has(pathKey)) continue;
      visited.add(pathKey);

      // Get outgoing transitions
      const outgoing = this.getTransitionsFrom(stateId);

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

  toJSON(): StateGraphData {
    const statesRecord: Record<string, AppState> = {};
    for (const [id, state] of this.states) {
      statesRecord[id] = state;
    }

    return {
      metadata: this.metadata || {
        appUrl: '',
        generatedAt: new Date().toISOString(),
        totalStates: this.states.size,
        totalTransitions: this.transitions.length,
        explorationDurationMs: 0,
      },
      states: statesRecord,
      transitions: this.transitions,
      paths: this.computePaths(),
      entryStateId: this.entryStateId,
    };
  }

  getStats(): { states: number; transitions: number; avgActionsPerState: number } {
    const totalActions = this.transitions.length;
    const states = this.states.size;

    return {
      states,
      transitions: totalActions,
      avgActionsPerState: states > 0 ? totalActions / states : 0,
    };
  }
}
