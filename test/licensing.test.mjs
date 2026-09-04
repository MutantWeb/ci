import assert from 'node:assert/strict';
import test from 'node:test';
import { activateLicense, decodeFeedToken, encodeFeedToken, validateFeedToken } from '../src/licensing.mjs';

const productId = 1329906;
const licenseKey = 'test-license-key';
const instanceId = 'instance-123';

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

test('feed tokens round-trip without changing the license key', () => {
  const token = encodeFeedToken(licenseKey, instanceId);
  assert.deepEqual(decodeFeedToken(token), { licenseKey, instanceId });
});

test('activation returns a single-secret feed token and checks product identity', async () => {
  const fetchImpl = async (_url, options) => {
    assert.match(String(options.body), /instance_name=owner%2Frepository/);
    return response({
      activated: true,
      error: null,
      license_key: { status: 'active', activation_usage: 1, activation_limit: 5 },
      instance: { id: instanceId, name: 'owner/repository' },
      meta: { product_id: productId }
    });
  };
  const result = await activateLicense({ licenseKey, instanceName: 'owner/repository', productId, fetchImpl });
  assert.equal(result.token, `${licenseKey}:${instanceId}`);
});

test('validation requires the exact active instance and product', async () => {
  const fetchImpl = async (_url, options) => {
    assert.match(String(options.body), /instance_id=instance-123/);
    return response({
      valid: true,
      error: null,
      license_key: { status: 'active' },
      instance: { id: instanceId },
      meta: { product_id: productId }
    });
  };
  const result = await validateFeedToken({ token: `${licenseKey}:${instanceId}`, productId, fetchImpl });
  assert.equal(result.valid, true);
});

test('a valid key from another product is rejected', async () => {
  const fetchImpl = async () => response({
    valid: true,
    license_key: { status: 'active' },
    instance: { id: instanceId },
    meta: { product_id: 999 }
  });
  await assert.rejects(
    validateFeedToken({ token: `${licenseKey}:${instanceId}`, productId, fetchImpl }),
    /different product/
  );
});
