import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { evaluateCase, runPack } from '../src/runner.mjs';
import { formatGithub, formatJunit } from '../src/formatters.mjs';
import { sha256, verifyPackText } from '../src/feed.mjs';

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
