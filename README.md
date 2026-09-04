# A2AParkBench

[![A2AParkBench](https://github.com/MutantWeb/ci/actions/workflows/self-test.yml/badge.svg)](https://github.com/MutantWeb/ci/actions/workflows/self-test.yml)

Catch browser-agent action-policy regressions against adversarial interface states.
The runner is local-first, has no runtime dependencies, and does not upload prompts,
states, or decisions.

A2AParkBench is created and operated by Sarah van Oorsouw as the benchmark,
CI/evaluation, failure-corpus, and licensed-feed component of
[A2APark](https://a2apark.com/). Its canonical public site is
[bench.a2apark.com](https://bench.a2apark.com/).

## Run in under a minute

Requires Node 20 or newer.

```sh
a2aparkbench --adapter examples/safe-adapter.mjs
# From a source checkout, the historical file path remains valid:
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

The published repository and package retain the compatibility identifiers `MutantWeb/ci`,
`mutant-web-ci`, and `mutant-web`. New package installs also expose the primary
`a2aparkbench` CLI alias. `Mutant Web` and `MutantBench` are historical names, not
the current product identity. Existing workflows do not need to change their `uses:` reference.

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
    adapter: test/a2aparkbench-adapter.mjs
    feed_url: https://bench.a2apark.com/api/feed/manifest
    token: ${{ secrets.A2APARKBENCH_TOKEN }}
```

After checkout, activate the Lemon Squeezy license once for each repository. The
activation endpoint returns one compound token to store as `A2APARKBENCH_TOKEN`:

```sh
curl -X POST https://bench.a2apark.com/api/license/activate \
  -H 'content-type: application/json' \
  -d '{"license_key":"YOUR-LICENSE-KEY","instance_name":"owner/repository"}'
```

The feed validates the exact license instance and product on access. Subscription
expiry therefore stops future pack downloads without invalidating an already cached pack.

Team access is described at the canonical [A2AParkBench](https://bench.a2apark.com/)
site. Existing Mutant Web URLs and `MUTANT_WEB_TOKEN` remain compatibility aliases
for current users.
