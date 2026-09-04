#!/usr/bin/env node
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { sha256 } from '../src/feed.mjs';
import { activateLicense, validateFeedToken } from '../src/licensing.mjs';

const port = Number(process.env.PORT ?? 8787);
const productId = process.env.A2APARKBENCH_PRODUCT_ID ?? process.env.MUTANT_WEB_PRODUCT_ID ?? '1329906';
const packPath = process.env.A2APARKBENCH_PACK_PATH ?? process.env.MUTANT_WEB_PACK_PATH;
const publicOrigin = process.env.A2APARKBENCH_PUBLIC_ORIGIN ?? process.env.MUTANT_WEB_PUBLIC_ORIGIN;
const validationCache = new Map();

if (!packPath) throw new Error('A2APARKBENCH_PACK_PATH is required (legacy alias: MUTANT_WEB_PACK_PATH)');

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  response.end(body);
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new Error('Request body too large');
  }
  return JSON.parse(body || '{}');
}

function bearer(request) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.authorization ?? '');
  if (!match) throw new Error('Bearer feed token is required');
  return match[1];
}

async function authorize(request) {
  const token = bearer(request);
  const cached = validationCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;
  const payload = await validateFeedToken({ token, productId });
  validationCache.set(token, { payload, expiresAt: Date.now() + 60_000 });
  return payload;
}

async function loadPack() {
  const text = await fs.readFile(packPath, 'utf8');
  const pack = JSON.parse(text);
  return { text, pack };
}

export const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, publicOrigin ?? `http://${request.headers.host}`);
    if (request.method === 'GET' && url.pathname === '/health') return json(response, 200, { ok: true });

    if (request.method === 'POST' && url.pathname === '/v1/activate') {
      const body = await readJson(request);
      if (!body.license_key || !body.instance_name) return json(response, 422, { error: 'license_key and instance_name are required' });
      const activation = await activateLicense({
        licenseKey: body.license_key,
        instanceName: body.instance_name,
        productId
      });
      return json(response, 201, {
        token: activation.token,
        instance_id: activation.instance.id,
        activation_usage: activation.license.activation_usage,
        activation_limit: activation.license.activation_limit
      });
    }

    if (request.method === 'GET' && url.pathname === '/feed/manifest.json') {
      await authorize(request);
      const { text, pack } = await loadPack();
      const origin = publicOrigin ?? url.origin;
      return json(response, 200, {
        schemaVersion: 1,
        name: pack.name,
        version: pack.version,
        sha256: sha256(text),
        packUrl: `${origin}/feed/pack.json`
      });
    }

    if (request.method === 'GET' && url.pathname === '/feed/pack.json') {
      await authorize(request);
      const { text } = await loadPack();
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(text),
        'cache-control': 'private, max-age=300'
      });
      return response.end(text);
    }

    return json(response, 404, { error: 'Not found' });
  } catch (error) {
    return json(response, 401, { error: error instanceof Error ? error.message : String(error) });
  }
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(port, () => console.log(`A2AParkBench feed listening on ${port}`));
}
