import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { InteractiveExplorer } from '../explorer/InteractiveExplorer';
import { SessionManager } from '../session/SessionManager';
import { GraphRenderer } from './GraphRenderer';
import { DEFAULT_CONFIG } from '../types';
import {
  InteractiveServerConfig,
  WSMessage,
  WSMessageType,
  ConnectionInitPayload,
  StateUpdatePayload,
  GraphUpdatePayload,
  ActionResultPayload,
  ExecuteActionPayload,
  SkipActionPayload,
  JumpToStatePayload,
  SaveSessionPayload,
  ErrorPayload,
} from '../types/interactive';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

export class InteractiveServer {
  private httpServer: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private explorer: InteractiveExplorer | null = null;
  private clients: Set<WebSocket> = new Set();
  private config: InteractiveServerConfig;

  constructor(config: InteractiveServerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    // Initialize the explorer
    this.explorer = new InteractiveExplorer({
      url: this.config.url,
      timeout: 30000,
      inputValues: DEFAULT_CONFIG.inputValues,
      slowMo: 50,
    });

    // Set up explorer event handlers
    this.explorer.on('stateChange', () => {
      this.broadcastStateUpdate();
    });

    this.explorer.on('graphUpdate', () => {
      this.broadcastGraphUpdate();
    });

    // Initialize browser and navigate to entry state
    await this.explorer.init();

    // If resuming from a session, load it
    if (this.config.sessionFile && SessionManager.exists(this.config.sessionFile)) {
      console.log(`Loading session from: ${this.config.sessionFile}`);
      const session = SessionManager.load(this.config.sessionFile);
      await this.explorer.fromSession(session);
    }

    const staticDir = this.getStaticDir();

    // Create HTTP server
    this.httpServer = http.createServer((req, res) => {
      this.handleHttpRequest(req, res, staticDir);
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });

    // Start listening
    return new Promise((resolve) => {
      this.httpServer!.listen(this.config.port, () => {
        const url = `http://localhost:${this.config.port}`;
        console.log(`\nInteractive UI running at: ${url}\n`);

        if (this.config.openBrowser) {
          this.openBrowser(url);
        }

        console.log('Press Ctrl+C to stop the server and save the session.\n');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Save session before stopping
    if (this.explorer) {
      const session = this.explorer.toSession();
      const sessionPath = this.config.sessionFile ||
        SessionManager.getDefaultSessionPath(this.config.url);
      SessionManager.save(session, sessionPath);
    }

    // Close WebSocket connections
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Close HTTP server
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    // Cleanup browser
    if (this.explorer) {
      await this.explorer.cleanup();
      this.explorer = null;
    }

    console.log('\nServer stopped.');
  }

  async saveAndExit(outputPath: string): Promise<void> {
    if (this.explorer) {
      // Save the state graph
      const graphData = this.explorer.getStateGraph().toJSON();
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));
      console.log(`Graph saved to: ${outputPath}`);
    }

    await this.stop();
  }

  private handleConnection(ws: WebSocket): void {
    console.log('Client connected');
    this.clients.add(ws);

    // Send initial state
    this.sendConnectionInit(ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        await this.handleMessage(ws, message);
      } catch (error) {
        this.sendError(ws, (error as Error).message, 'PARSE_ERROR');
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  private async handleMessage(ws: WebSocket, message: WSMessage): Promise<void> {
    if (!this.explorer) {
      this.sendError(ws, 'Explorer not initialized', 'NOT_INITIALIZED');
      return;
    }

    try {
      switch (message.type) {
        case 'execute_action':
          await this.handleExecuteAction(ws, message.payload as ExecuteActionPayload);
          break;

        case 'skip_action':
          await this.handleSkipAction(ws, message.payload as SkipActionPayload);
          break;

        case 'unskip_action':
          await this.handleUnskipAction(ws, message.payload as SkipActionPayload);
          break;

        case 'jump_to_state':
          await this.handleJumpToState(ws, message.payload as JumpToStatePayload);
          break;

        case 'go_to_root':
          await this.handleGoToRoot(ws);
          break;

        case 'save_session':
          await this.handleSaveSession(ws, message.payload as SaveSessionPayload);
          break;

        case 'request_state':
          await this.sendStateUpdate(ws);
          break;

        default:
          this.sendError(ws, `Unknown message type: ${message.type}`, 'UNKNOWN_TYPE');
      }
    } catch (error) {
      this.sendError(ws, (error as Error).message, 'HANDLER_ERROR');
    }
  }

  private async handleExecuteAction(ws: WebSocket, payload: ExecuteActionPayload): Promise<void> {
    if (!this.explorer) return;

    try {
      const result = await this.explorer.executeAction(payload.actionId);
      this.send(ws, 'action_result', result);

      // Broadcast updated state to all clients
      this.broadcastStateUpdate();

      if (result.isNewState) {
        this.broadcastGraphUpdate();
      }
    } catch (error) {
      this.sendError(ws, (error as Error).message, 'EXECUTE_ERROR');
    }
  }

  private async handleSkipAction(ws: WebSocket, payload: SkipActionPayload): Promise<void> {
    if (!this.explorer) return;

    const actionKey = payload.actionId.split(':').slice(1).join(':');
    this.explorer.skipAction(payload.stateId, actionKey);

    // Send updated state
    await this.sendStateUpdate(ws);
  }

  private async handleUnskipAction(ws: WebSocket, payload: SkipActionPayload): Promise<void> {
    if (!this.explorer) return;

    const actionKey = payload.actionId.split(':').slice(1).join(':');
    this.explorer.unskipAction(payload.stateId, actionKey);

    // Send updated state
    await this.sendStateUpdate(ws);
  }

  private async handleJumpToState(ws: WebSocket, payload: JumpToStatePayload): Promise<void> {
    if (!this.explorer) return;

    try {
      await this.explorer.jumpToState(payload.targetStateId);
      this.broadcastStateUpdate();
    } catch (error) {
      this.sendError(ws, (error as Error).message, 'JUMP_ERROR');
    }
  }

  private async handleGoToRoot(ws: WebSocket): Promise<void> {
    if (!this.explorer) return;

    try {
      await this.explorer.goToRoot();
      this.broadcastStateUpdate();
    } catch (error) {
      this.sendError(ws, (error as Error).message, 'ROOT_ERROR');
    }
  }

  private async handleSaveSession(ws: WebSocket, payload: SaveSessionPayload): Promise<void> {
    if (!this.explorer) return;

    const session = this.explorer.toSession();
    const filePath = payload.filePath ||
      this.config.sessionFile ||
      SessionManager.getDefaultSessionPath(this.config.url);

    SessionManager.save(session, filePath);

    this.send(ws, 'session_saved', { filePath });
  }

  private async sendConnectionInit(ws: WebSocket): Promise<void> {
    if (!this.explorer) return;

    const currentState = this.explorer.getCurrentState();
    const availableActions = await this.explorer.getAvailableActions();
    const session = this.explorer.toSession();

    const payload: ConnectionInitPayload = {
      session,
      currentState: currentState!,
      availableActions,
    };

    this.send(ws, 'connection_init', payload);
  }

  private async sendStateUpdate(ws: WebSocket): Promise<void> {
    if (!this.explorer) return;

    const currentState = this.explorer.getCurrentState();
    const availableActions = await this.explorer.getAvailableActions();

    const payload: StateUpdatePayload = {
      currentState: currentState!,
      availableActions,
      pathFromRoot: this.explorer.getPathFromRoot(),
    };

    this.send(ws, 'state_update', payload);
  }

  private async broadcastStateUpdate(): Promise<void> {
    if (!this.explorer) return;

    const currentState = this.explorer.getCurrentState();
    const availableActions = await this.explorer.getAvailableActions();

    const payload: StateUpdatePayload = {
      currentState: currentState!,
      availableActions,
      pathFromRoot: this.explorer.getPathFromRoot(),
    };

    this.broadcast('state_update', payload);
  }

  private broadcastGraphUpdate(): void {
    if (!this.explorer) return;

    const graphData = this.explorer.getStateGraph().toJSON();
    const cytoscapeData = GraphRenderer.toCytoscapeFormat(graphData);

    const payload: GraphUpdatePayload = {
      graphData,
      cytoscapeData,
    };

    this.broadcast('graph_update', payload);
  }

  private send(ws: WebSocket, type: WSMessageType, payload: unknown): void {
    const message: WSMessage = {
      type,
      timestamp: Date.now(),
      payload,
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, message: string, code: string): void {
    const payload: ErrorPayload = { message, code };
    this.send(ws, 'error', payload);
  }

  private broadcast(type: WSMessageType, payload: unknown): void {
    const message: WSMessage = {
      type,
      timestamp: Date.now(),
      payload,
    };

    const data = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private handleHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    staticDir: string
  ): void {
    const url = req.url || '/';

    // API endpoint for current state (HTTP fallback)
    if (url === '/api/state') {
      if (!this.explorer) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Explorer not initialized' }));
        return;
      }

      const currentState = this.explorer.getCurrentState();
      const graphData = this.explorer.getStateGraph().toJSON();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        currentState,
        graphData,
        cytoscape: GraphRenderer.toCytoscapeFormat(graphData),
      }));
      return;
    }

    // Serve static files from React build (dist directory)
    const distDir = path.join(staticDir, 'dist');
    let filePath: string;

    // For assets (js, css, images), serve directly from dist/assets
    if (url.startsWith('/assets/')) {
      filePath = path.join(distDir, url);
    } else {
      // Try to serve the requested file, fall back to index.html for SPA routing
      filePath = path.join(distDir, url === '/' ? 'index.html' : url);
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // SPA fallback: serve index.html for client-side routing
          const indexPath = path.join(distDir, 'index.html');
          fs.readFile(indexPath, (indexErr, indexContent) => {
            if (indexErr) {
              res.writeHead(404);
              res.end('Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(indexContent);
            }
          });
        } else {
          res.writeHead(500);
          res.end('Server Error');
        }
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  }

  private getStaticDir(): string {
    const srcStatic = path.join(__dirname, 'static');
    const distStatic = path.join(__dirname, '..', '..', 'src', 'ui', 'static');

    if (fs.existsSync(srcStatic)) {
      return srcStatic;
    }
    if (fs.existsSync(distStatic)) {
      return distStatic;
    }

    throw new Error(`Static directory not found. Checked: ${srcStatic}, ${distStatic}`);
  }

  private openBrowser(url: string): void {
    const { platform } = process;
    let command: string;

    switch (platform) {
      case 'darwin':
        command = `open "${url}"`;
        break;
      case 'win32':
        command = `start "${url}"`;
        break;
      default:
        command = `xdg-open "${url}"`;
    }

    const { exec } = require('child_process');
    exec(command, (error: Error | null) => {
      if (error) {
        console.log(`Could not open browser automatically. Please visit: ${url}`);
      }
    });
  }
}
