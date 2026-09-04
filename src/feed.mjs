import { createHash } from 'node:crypto';

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function verifyPackText(packText, manifest) {
  if (manifest.schemaVersion !== 1) throw new Error(`Unsupported feed manifest schema: ${manifest.schemaVersion}`);
  const actual = sha256(packText);
  if (actual !== manifest.sha256) {
    throw new Error(`Feed integrity mismatch: expected ${manifest.sha256}, received ${actual}`);
  }
  const pack = JSON.parse(packText);
  if (pack.name !== manifest.name || pack.version !== manifest.version) {
    throw new Error('Feed manifest does not match pack identity');
  }
  return pack;
}

export async function fetchFeed(manifestUrl, token = process.env.A2APARKBENCH_TOKEN ?? process.env.MUTANT_WEB_TOKEN) {
  if (!token) throw new Error('A2APARKBENCH_TOKEN is required for a private feed (legacy alias: MUTANT_WEB_TOKEN)');
  const headers = { authorization: `Bearer ${token}`, accept: 'application/json' };
  const manifestResponse = await fetch(manifestUrl, { headers });
  if (!manifestResponse.ok) throw new Error(`Feed manifest request failed with ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();
  const packUrl = new URL(manifest.packUrl, manifestUrl);
  if (packUrl.protocol !== 'https:') throw new Error('Private pack URL must use HTTPS');
  const packResponse = await fetch(packUrl, { headers });
  if (!packResponse.ok) throw new Error(`Private pack request failed with ${packResponse.status}`);
  return verifyPackText(await packResponse.text(), manifest);
}
