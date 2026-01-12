import * as fs from 'fs';
import * as path from 'path';
import { StateGraph } from './StateGraph';
import { StateGraphData } from '../types';

export class Serializer {
  static toJSON(graph: StateGraph): string {
    const data = graph.toJSON();
    return JSON.stringify(data, null, 2);
  }

  static async saveToFile(graph: StateGraph, outputPath: string): Promise<void> {
    const json = Serializer.toJSON(graph);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, json, 'utf-8');
    console.log(`\nState graph saved to: ${outputPath}`);
  }

  static fromJSON(json: string): StateGraphData {
    return JSON.parse(json);
  }

  static loadFromFile(filePath: string): StateGraphData {
    const json = fs.readFileSync(filePath, 'utf-8');
    return Serializer.fromJSON(json);
  }

  static generateSummary(data: StateGraphData): string {
    const lines: string[] = [
      '='.repeat(60),
      'STATE GRAPH SUMMARY',
      '='.repeat(60),
      '',
      `App URL: ${data.metadata.appUrl}`,
      `Generated: ${data.metadata.generatedAt}`,
      `Exploration Duration: ${(data.metadata.explorationDurationMs / 1000).toFixed(1)}s`,
      '',
      `Total States: ${data.metadata.totalStates}`,
      `Total Transitions: ${data.metadata.totalTransitions}`,
      `Entry State: ${data.entryStateId}`,
      '',
      '-'.repeat(60),
      'STATES',
      '-'.repeat(60),
    ];

    for (const [id, state] of Object.entries(data.states)) {
      lines.push(`  ${id}: ${state.description}`);
      lines.push(`    URL: ${state.url}`);
      lines.push(`    Elements: ${state.elements.length}`);
    }

    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('TRANSITIONS');
    lines.push('-'.repeat(60));

    for (const transition of data.transitions) {
      const fromState = data.states[transition.fromStateId];
      const toState = data.states[transition.toStateId];
      const actionDesc = `${transition.action.type}("${transition.action.elementLabel}")`;

      lines.push(
        `  ${transition.fromStateId} -> ${transition.toStateId}`
      );
      lines.push(`    Action: ${actionDesc}`);
      lines.push(`    Selector: ${transition.action.elementSelector}`);
    }

    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('PATHS FROM ENTRY');
    lines.push('-'.repeat(60));

    for (const [stateId, paths] of Object.entries(data.paths)) {
      if (paths.length > 0) {
        lines.push(`  To ${stateId}:`);
        for (const path of paths.slice(0, 2)) {
          lines.push(`    ${path.join(' -> ')}`);
        }
      }
    }

    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  static generateMermaidDiagram(data: StateGraphData): string {
    const lines: string[] = ['stateDiagram-v2'];

    // Add states
    for (const [id, state] of Object.entries(data.states)) {
      const shortDesc = state.description.slice(0, 30).replace(/["\n]/g, ' ');
      lines.push(`    ${id} : ${shortDesc}`);
    }

    // Mark entry state
    lines.push(`    [*] --> ${data.entryStateId}`);

    // Add transitions
    const transitionMap = new Map<string, string[]>();

    for (const transition of data.transitions) {
      const key = `${transition.fromStateId}->${transition.toStateId}`;
      if (!transitionMap.has(key)) {
        transitionMap.set(key, []);
      }
      transitionMap.get(key)!.push(transition.action.elementLabel);
    }

    for (const [key, labels] of transitionMap) {
      const [from, to] = key.split('->');
      const label = labels.slice(0, 2).join(', ');
      lines.push(`    ${from} --> ${to} : ${label}`);
    }

    return lines.join('\n');
  }
}
