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
    feed_url: https://mutant-web-bench.axayoxo.chatgpt.site/api/feed/manifest
    token: ${{ secrets.MUTANT_WEB_TOKEN }}
```

After checkout, activate the Lemon Squeezy license once for each repository. The
activation endpoint returns one compound token to store as `MUTANT_WEB_TOKEN`:

```sh
curl -X POST https://mutant-web-bench.axayoxo.chatgpt.site/api/license/activate \
  -H 'content-type: application/json' \
  -d '{"license_key":"YOUR-LICENSE-KEY","instance_name":"owner/repository"}'
```

The feed validates the exact license instance and product on access. Subscription
expiry therefore stops future pack downloads without invalidating an already cached pack.

Team access is described at [Mutant Web](https://mutant-web-bench.axayoxo.chatgpt.site/).
