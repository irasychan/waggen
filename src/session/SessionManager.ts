import * as fs from 'fs';
import * as path from 'path';
import { ExplorationSession } from '../types/interactive';

const CURRENT_VERSION = 1;

export class SessionManager {
  static save(session: ExplorationSession, filePath: string): void {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Update timestamp
    session.lastUpdatedAt = new Date().toISOString();

    // Write session to file
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    console.log(`Session saved to: ${filePath}`);
  }

  static load(filePath: string): ExplorationSession {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const raw = JSON.parse(content);

    // Version check and migration
    if (raw.version !== CURRENT_VERSION) {
      return SessionManager.migrate(raw);
    }

    return raw as ExplorationSession;
  }

  static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDefaultSessionPath(appUrl: string): string {
    // Create a filename based on the app URL
    const urlObj = new URL(appUrl);
    const sanitizedHost = urlObj.host.replace(/[^a-zA-Z0-9]/g, '_');
    return `./output/sessions/${sanitizedHost}_session.json`;
  }

  private static migrate(raw: unknown): ExplorationSession {
    const data = raw as Record<string, unknown>;

    // Handle version migrations
    if (!data.version || data.version === 0) {
      // v0 -> v1: Add version field
      console.log('Migrating session from v0 to v1');
      return {
        version: CURRENT_VERSION,
        id: data.id as string || SessionManager.generateSessionId(),
        appUrl: data.appUrl as string || '',
        createdAt: data.createdAt as string || new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        currentStateId: data.currentStateId as string || '',
        entryStateId: data.entryStateId as string || '',
        stateGraph: data.stateGraph as ExplorationSession['stateGraph'],
        skippedActions: data.skippedActions as Record<string, string[]> || {},
        explorationHistory: data.explorationHistory as ExplorationSession['explorationHistory'] || [],
      };
    }

    // If version is higher than current, throw error
    if ((data.version as number) > CURRENT_VERSION) {
      throw new Error(`Session file version ${data.version} is newer than supported version ${CURRENT_VERSION}`);
    }

    return data as unknown as ExplorationSession;
  }

  // Convert Map to serializable object
  static serializeSkippedActions(map: Map<string, Set<string>>): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [stateId, actions] of map) {
      result[stateId] = Array.from(actions);
    }
    return result;
  }

  // Convert serialized object back to Map
  static deserializeSkippedActions(obj: Record<string, string[]>): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const [stateId, actions] of Object.entries(obj)) {
      map.set(stateId, new Set(actions));
    }
    return map;
  }
}
