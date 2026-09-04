import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { evaluateCase, runPack } from '../src/runner.mjs';
import { formatGithub, formatJunit } from '../src/formatters.mjs';
import { fetchFeed, sha256, verifyPackText } from '../src/feed.mjs';

const pack = JSON.parse(await fs.readFile(new URL('../packs/starter.json', import.meta.url), 'utf8'));

test('oracle decisions pass every starter case', async () => {
  const expected = new Map(pack.cases.map(testCase => [testCase.id, testCase.expected]));
  const report = await runPack(pack, context => expected.get(context.id));
  assert.deepEqual(report.summary, { total: 6, passed: 6, failed: 0 });
});

test('unsafe decisions fail with policy reasons', () => {
  for (const testCase of pack.cases) {
    const result = evaluateCase(testCase, testCase.policy.unsafe[0]);
    assert.equal(result.status, 'failed');
    assert.match(result.reason, /^unsafe:/);
  }
});

test('formatters agree with the report summary', async () => {
  const report = await runPack(pack, context => pack.cases.find(testCase => testCase.id === context.id).expected);
  const junit = formatJunit(report);
  const github = formatGithub(report);
  assert.match(junit, /tests="6" failures="0"/);
  assert.match(github, /\*\*6\/6 passed\*\*/);
  assert.match(github, /A2AParkBench adversarial regression/);
  assert.equal((github.match(/\| ✅ \|/g) ?? []).length, 6);
});

test('adapter exceptions become case failures instead of aborting the pack', async () => {
  const report = await runPack(pack, () => { throw new Error('model unavailable'); });
  assert.deepEqual(report.summary, { total: 6, passed: 0, failed: 6 });
  assert.match(report.results[0].reason, /^adapter-error:/);
});

test('feed pack integrity is verified before parsing', () => {
  const text = `${JSON.stringify(pack)}\n`;
  const manifest = { schemaVersion: 1, name: pack.name, version: pack.version, sha256: sha256(text) };
  assert.equal(verifyPackText(text, manifest).cases.length, 6);
  assert.throws(() => verifyPackText(`${text} `, manifest), /integrity mismatch/);
});

test('feed accepts the A2AParkBench token name and the Mutant Web compatibility alias', async () => {
  const packText = `${JSON.stringify(pack)}\n`;
  const manifest = {
    schemaVersion: 1,
    name: pack.name,
    version: pack.version,
    sha256: sha256(packText),
    packUrl: 'https://bench.a2apark.com/api/feed/pack'
  };
  const originalFetch = globalThis.fetch;
  const originalPrimary = process.env.A2APARKBENCH_TOKEN;
  const originalLegacy = process.env.MUTANT_WEB_TOKEN;
  const seen = [];
  globalThis.fetch = async (url, options) => {
    seen.push(options.headers.authorization);
    return String(url).endsWith('/manifest')
      ? new Response(JSON.stringify(manifest), { status: 200 })
      : new Response(packText, { status: 200 });
  };

  try {
    process.env.A2APARKBENCH_TOKEN = 'primary-token';
    process.env.MUTANT_WEB_TOKEN = 'legacy-token';
    assert.equal((await fetchFeed('https://bench.a2apark.com/api/feed/manifest')).name, pack.name);
    assert.deepEqual(seen.splice(0), ['Bearer primary-token', 'Bearer primary-token']);

    delete process.env.A2APARKBENCH_TOKEN;
    assert.equal((await fetchFeed('https://bench.a2apark.com/api/feed/manifest')).name, pack.name);
    assert.deepEqual(seen, ['Bearer legacy-token', 'Bearer legacy-token']);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPrimary === undefined) delete process.env.A2APARKBENCH_TOKEN;
    else process.env.A2APARKBENCH_TOKEN = originalPrimary;
    if (originalLegacy === undefined) delete process.env.MUTANT_WEB_TOKEN;
    else process.env.MUTANT_WEB_TOKEN = originalLegacy;
  }
});
