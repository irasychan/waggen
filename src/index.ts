#!/usr/bin/env node

import { Command } from 'commander';
import { Explorer } from './explorer/Explorer';
import { Serializer } from './graph/Serializer';
import { TestGenerator } from './generator/TestGenerator';
import { DEFAULT_CONFIG, ExplorerConfig } from './types';

const program = new Command();

program
  .name('waggen')
  .description('Web Application State Graph Generator - Map user journeys for test automation')
  .version('0.1.0');

program
  .command('explore')
  .description('Explore a web application and generate a state graph')
  .requiredOption('-u, --url <url>', 'URL of the web application to explore')
  .option('-o, --output <path>', 'Output path for the state graph JSON', './output/graph.json')
  .option('--max-states <number>', 'Maximum number of states to discover', '50')
  .option('--max-depth <number>', 'Maximum exploration depth', '5')
  .option('--headed', 'Run browser in headed mode (visible)', false)
  .option('--timeout <ms>', 'Timeout for actions in milliseconds', '30000')
  .action(async (options) => {
    const config: ExplorerConfig = {
      ...DEFAULT_CONFIG,
      url: options.url,
      outputPath: options.output,
      maxStates: parseInt(options.maxStates, 10),
      maxDepth: parseInt(options.maxDepth, 10),
      headless: !options.headed,
      timeout: parseInt(options.timeout, 10),
    };

    console.log('\n🔍 Waggen - Web Application State Graph Generator\n');

    try {
      const explorer = new Explorer(config);
      const graph = await explorer.explore();

      // Save to file
      await Serializer.saveToFile(graph, config.outputPath);

      // Print summary
      const data = graph.toJSON();
      console.log(Serializer.generateSummary(data));

      // Generate Mermaid diagram
      const mermaidPath = config.outputPath.replace('.json', '.mermaid.md');
      const mermaid = Serializer.generateMermaidDiagram(data);
      require('fs').writeFileSync(
        mermaidPath,
        `# State Graph Visualization\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n`
      );
      console.log(`Mermaid diagram saved to: ${mermaidPath}`);

    } catch (error) {
      console.error('Error during exploration:', error);
      process.exit(1);
    }
  });

program
  .command('summary')
  .description('Display summary of an existing state graph')
  .requiredOption('-f, --file <path>', 'Path to the state graph JSON file')
  .action((options) => {
    try {
      const data = Serializer.loadFromFile(options.file);
      console.log(Serializer.generateSummary(data));
    } catch (error) {
      console.error('Error reading file:', error);
      process.exit(1);
    }
  });

program
  .command('mermaid')
  .description('Generate a Mermaid diagram from an existing state graph')
  .requiredOption('-f, --file <path>', 'Path to the state graph JSON file')
  .action((options) => {
    try {
      const data = Serializer.loadFromFile(options.file);
      console.log(Serializer.generateMermaidDiagram(data));
    } catch (error) {
      console.error('Error reading file:', error);
      process.exit(1);
    }
  });

program
  .command('generate-tests')
  .description('Generate Playwright tests from a state graph')
  .requiredOption('-f, --file <path>', 'Path to the state graph JSON file')
  .option('-o, --output <dir>', 'Output directory for generated tests', './generated-tests')
  .option('--base-url <url>', 'Base URL for tests', 'http://localhost:3000')
  .option('--prefix <prefix>', 'Test file prefix', 'waggen')
  .option('--no-states', 'Skip state verification tests')
  .option('--no-transitions', 'Skip transition tests')
  .option('--no-journeys', 'Skip user journey tests')
  .action((options) => {
    console.log('\n🧪 Waggen - Playwright Test Generator\n');

    try {
      const data = Serializer.loadFromFile(options.file);

      const generator = new TestGenerator(data, {
        outputDir: options.output,
        baseUrl: options.baseUrl,
        testPrefix: options.prefix,
        generateStateTests: options.states !== false,
        generateTransitionTests: options.transitions !== false,
        generatePathTests: options.journeys !== false,
      });

      const files = generator.generate();

      console.log('Generated test files:');
      files.forEach(file => console.log(`  - ${file}`));

      console.log(`\nTo run the tests:`);
      console.log(`  cd ${options.output}`);
      console.log(`  npx playwright test`);

    } catch (error) {
      console.error('Error generating tests:', error);
      process.exit(1);
    }
  });

program.parse();
