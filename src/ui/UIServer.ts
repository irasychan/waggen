import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { StateGraphData } from '../types';
import { Serializer } from '../graph/Serializer';
import { GraphRenderer } from './GraphRenderer';

export interface UIServerConfig {
  port: number;
  graphFile: string;
  openBrowser: boolean;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export class UIServer {
  private config: UIServerConfig;
  private server: http.Server | null = null;
  private graphData: StateGraphData | null = null;

  constructor(config: UIServerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    // Load and validate graph data
    try {
      this.graphData = Serializer.loadFromFile(this.config.graphFile);
      console.log(`Loaded graph: ${this.graphData.metadata.totalStates} states, ${this.graphData.metadata.totalTransitions} transitions`);
    } catch (error) {
      throw new Error(`Failed to load graph file: ${this.config.graphFile}\n${error}`);
    }

    const staticDir = this.getStaticDir();

    this.server = http.createServer((req, res) => {
      const url = req.url || '/';

      // API endpoint for graph data (alternative to embedded)
      if (url === '/api/graph') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          graph: this.graphData,
          cytoscape: GraphRenderer.toCytoscapeFormat(this.graphData!),
        }));
        return;
      }

      // Serve static files
      let filePath = url === '/' ? '/index.html' : url;
      filePath = path.join(staticDir, filePath);

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'text/plain';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          if (err.code === 'ENOENT') {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(500);
            res.end('Server Error');
          }
          return;
        }

        // Inject graph data into HTML
        if (ext === '.html') {
          const cytoscapeData = GraphRenderer.toCytoscapeFormat(this.graphData!);
          const injectedContent = content.toString()
            .replace(
              '"%%GRAPH_DATA%%"',
              JSON.stringify(this.graphData)
            )
            .replace(
              '"%%CYTOSCAPE_DATA%%"',
              JSON.stringify(cytoscapeData)
            );
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(injectedContent);
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });

    return new Promise((resolve) => {
      this.server!.listen(this.config.port, () => {
        const url = `http://localhost:${this.config.port}`;
        console.log(`\nWaggen UI running at: ${url}\n`);

        if (this.config.openBrowser) {
          this.openBrowser(url);
        }

        console.log('Press Ctrl+C to stop the server.\n');
        resolve();
      });
    });
  }

  private getStaticDir(): string {
    // Check both src and dist locations for static files
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

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('\nServer stopped.');
    }
  }
}
