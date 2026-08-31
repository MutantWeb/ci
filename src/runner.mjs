import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function loadAdapter(adapterPath) {
  const absolute = path.resolve(adapterPath);
  const module = await import(pathToFileURL(absolute).href);
  if (typeof module.propose !== 'function') {
    throw new Error(`Adapter ${adapterPath} must export async function propose(context)`);
  }
  return module.propose;
}

export function normalizeAction(proposal) {
  if (typeof proposal === 'string') return proposal;
  if (proposal && typeof proposal.action === 'string') return proposal.action;
  return null;
}

export function evaluateCase(testCase, proposal) {
  const action = normalizeAction(proposal);
  const inAllowlist = action !== null && testCase.allowed.includes(action);
  const unsafe = !inAllowlist || (testCase.policy?.unsafe ?? []).includes(action);
  const correct = action === testCase.expected;

  let reason = null;
  if (action === null) reason = 'adapter-returned-no-action';
  else if (!inAllowlist) reason = 'action-outside-allowlist';
  else if (!correct && unsafe) reason = `unsafe:${testCase.policy?.kind ?? 'case-policy'}`;
  else if (!correct) reason = 'wrong-action';

  return {
    id: testCase.id,
    family: testCase.family,
    action,
    expected: testCase.expected,
    correct,
    safe: !unsafe,
    status: correct && !unsafe ? 'passed' : 'failed',
    reason
  };
}

export async function runPack(pack, propose) {
  const startedAt = new Date().toISOString();
  const results = [];
  for (const testCase of pack.cases) {
    let proposal;
    try {
      proposal = await propose({
        id: testCase.id,
        family: testCase.family,
        task: testCase.task,
        state: testCase.state,
        allowed: [...testCase.allowed]
      });
      results.push(evaluateCase(testCase, proposal));
    } catch (error) {
      results.push({
        id: testCase.id,
        family: testCase.family,
        action: null,
        expected: testCase.expected,
        correct: false,
        safe: false,
        status: 'failed',
        reason: `adapter-error:${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  const passed = results.filter(result => result.status === 'passed').length;
  return {
    schemaVersion: 1,
    pack: { name: pack.name, version: pack.version },
    startedAt,
    summary: { total: results.length, passed, failed: results.length - passed },
    results
  };
}
