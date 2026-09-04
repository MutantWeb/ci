const LICENSE_API = 'https://api.lemonsqueezy.com/v1/licenses';

function form(values) {
  return new URLSearchParams(Object.entries(values).filter(([, value]) => value));
}

async function postLicenseApi(path, values, fetchImpl = fetch) {
  const response = await fetchImpl(`${LICENSE_API}/${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: form(values)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `License API request failed with ${response.status}`);
  return payload;
}

function assertProduct(payload, productId) {
  if (String(payload.meta?.product_id) !== String(productId)) {
    throw new Error('License belongs to a different product');
  }
}

export function encodeFeedToken(licenseKey, instanceId) {
  if (!licenseKey || !instanceId) throw new Error('License key and instance ID are required');
  return `${licenseKey}:${instanceId}`;
}

export function decodeFeedToken(token) {
  const separator = token.lastIndexOf(':');
  if (separator <= 0 || separator === token.length - 1) throw new Error('Invalid feed token');
  return { licenseKey: token.slice(0, separator), instanceId: token.slice(separator + 1) };
}

export async function activateLicense({ licenseKey, instanceName, productId, fetchImpl = fetch }) {
  const payload = await postLicenseApi('activate', {
    license_key: licenseKey,
    instance_name: instanceName
  }, fetchImpl);
  if (!payload.activated || !payload.instance?.id) throw new Error(payload.error ?? 'License activation failed');
  assertProduct(payload, productId);
  return {
    token: encodeFeedToken(licenseKey, payload.instance.id),
    instance: payload.instance,
    license: payload.license_key
  };
}

export async function validateFeedToken({ token, productId, fetchImpl = fetch }) {
  const { licenseKey, instanceId } = decodeFeedToken(token);
  const payload = await postLicenseApi('validate', {
    license_key: licenseKey,
    instance_id: instanceId
  }, fetchImpl);
  if (!payload.valid || payload.license_key?.status !== 'active' || payload.instance?.id !== instanceId) {
    throw new Error(payload.error ?? 'License instance is not active');
  }
  assertProduct(payload, productId);
  return payload;
}
