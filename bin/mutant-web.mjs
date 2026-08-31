#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAdapter, runPack } from '../src/runner.mjs';
import { formatConsole, formatGithub, formatJson, formatJunit } from '../src/formatters.mjs';
import { fetchFeed } from '../src/feed.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const options = { format: 'console', pack: path.join(packageRoot, 'packs', 'starter.json'), feed: null, out: null, adapter: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--adapter') options.adapter = argv[++index];
    else if (argument === '--pack') options.pack = argv[++index];
    else if (argument === '--feed') options.feed = argv[++index];
    else if (argument === '--format') options.format = argv[++index];
    else if (argument === '--out') options.out = argv[++index];
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

const usage = `Usage: mutant-web --adapter <file> [--pack <json> | --feed <https-url>] [--format console|json|junit|github] [--out <file>]`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    process.exit(0);
  }
  if (!options.adapter) throw new Error('--adapter is required');

  if (options.feed && process.argv.includes('--pack')) throw new Error('--pack and --feed are mutually exclusive');
  const pack = options.feed
    ? await fetchFeed(options.feed)
    : JSON.parse(await fs.readFile(path.resolve(options.pack), 'utf8'));
  const propose = await loadAdapter(options.adapter);
  const report = await runPack(pack, propose);
  const formatter = { console: formatConsole, json: formatJson, junit: formatJunit, github: formatGithub }[options.format];
  if (!formatter) throw new Error(`Unsupported format: ${options.format}`);
  const output = formatter(report);

  if (options.out) await fs.writeFile(path.resolve(options.out), output, 'utf8');
  else if (options.format === 'github' && process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, output, 'utf8');
    process.stdout.write(formatConsole(report));
  } else process.stdout.write(output);

  process.exitCode = report.summary.failed === 0 ? 0 : 1;
} catch (error) {
  console.error(`mutant-web: ${error instanceof Error ? error.message : String(error)}`);
  console.error(usage);
  process.exitCode = 2;
}
