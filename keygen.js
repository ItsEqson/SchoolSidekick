// Server only: never import this module from public/ or return its key to clients.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

let cached;
let pending;
let localEnv;

export class KeygenError extends Error {
  constructor(message, fix) {
    super(message);
    this.fix = fix;
  }
}

function configuration() {
  if (!localEnv) {
    try {
      localEnv = parseEnv(readFileSync(new URL('./.env', import.meta.url), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      localEnv = {};
    }
  }
  return {
    url: process.env.KEYGEN_URL ?? localEnv.KEYGEN_URL,
    token: process.env.KEYGEN_TOKEN ?? localEnv.KEYGEN_TOKEN,
  };
}

export function invalidateKey(key) {
  // An older failed request must not evict a newer key.
  if (cached?.apiKey === key) cached = undefined;
}

export async function getKey() {
  if (cached && Date.now() < cached.expiresAt) return cached.apiKey;
  if (pending) return pending;
  pending = lookupKey();
  try {
    return await pending;
  } finally {
    pending = undefined;
  }
}

async function lookupKey() {
  let token;
  try {
    const config = configuration();
    token = config.token;
    if (!config.url || config.url === 'paste-here' || !token || token === 'paste-here') {
      throw new KeygenError('The AI helper is not configured yet.', 'Set KEYGEN_URL and KEYGEN_TOKEN in .env or the server environment, then restart.');
    }
    const url = new URL(`${config.url.replace(/\/+$/, '')}/api/lookup-key`);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new KeygenError('The AI helper address is not configured correctly.', 'Set KEYGEN_URL to the HTTPS MindDo base URL without credentials, query parameters, or a fragment.');
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    const redact = (value, fallback) => {
      if (typeof value !== 'string' || !value.trim()) return fallback;
      let safe = value;
      for (const secret of [token, cached?.apiKey, data.apiKey]) {
        if (typeof secret === 'string' && secret) safe = safe.split(secret).join('[redacted]');
      }
      return safe;
    };
    if (!response.ok || data.error) {
      throw new KeygenError(
        redact(data.error?.message, 'The AI key service could not provide a key.'),
        redact(data.error?.fix, 'Check the MindDo configuration and service availability, then try again.'),
      );
    }
    const expiresAt = typeof data.expiresAt === 'string' ? Date.parse(data.expiresAt) : NaN;
    if (typeof data.apiKey !== 'string' || !data.apiKey.trim() || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new KeygenError('The AI key service returned an unusable key.', 'MindDo must return a nonempty apiKey and a future ISO 8601 expiresAt timestamp.');
    }
    cached = { apiKey: data.apiKey, expiresAt };
    return cached.apiKey;
  } catch (error) {
    if (error instanceof KeygenError) throw error;
    // Never log raw transport errors, response bodies, credentials, or keys.
    throw new KeygenError('I couldn’t reach the AI key service.', 'Check KEYGEN_URL, the internet connection, and MindDo availability, then try again.');
  }
}
