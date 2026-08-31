# Mutant Web CI

[![Mutant Web](https://github.com/MutantWeb/ci/actions/workflows/self-test.yml/badge.svg)](https://github.com/MutantWeb/ci/actions/workflows/self-test.yml)

Catch browser-agent action-policy regressions against adversarial interface states.
The runner is local-first, has no runtime dependencies, and does not upload prompts,
states, or decisions.

## Run in under a minute

Requires Node 20 or newer.

```sh
node bin/mutant-web.mjs --adapter examples/safe-adapter.mjs
```

An adapter is an ESM module that exports one function:

```js
export async function propose({ task, state, allowed }) {
  const decision = await yourAgent({ task, state, allowed });
  return { action: decision.action };
}
```

The process exits with code `1` if any proposal is wrong or violates the case policy.
Use `--format json`, `--format junit`, or `--format github` for CI integrations.

## GitHub Action

```yaml
- uses: MutantWeb/ci@v1
  with:
    adapter: test/mutant-web-adapter.mjs
```

The action writes a case table to the GitHub job summary. Add the workflow badge to
your README so contributors can see whether adversarial regressions are passing.

## Packs

The included starter pack has one deterministic case for each initial mutation
family. A paid Team feed supplies changing, integrity-addressed packs so the test distribution
does not become a static set that models and policies can memorize.

The Team feed is passed as an authenticated HTTPS manifest and verified against its
SHA-256 digest before execution:

```yaml
- uses: MutantWeb/ci@v1
  with:
    adapter: test/mutant-web-adapter.mjs
    feed_url: ${{ secrets.MUTANT_WEB_FEED_URL }}
    token: ${{ secrets.MUTANT_WEB_TOKEN }}
```

Team access is described at [Mutant Web](https://mutant-web-bench.axayoxo.chatgpt.site/).
