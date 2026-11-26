const { createHmac } = require('node:crypto');

function getDirectIceServers(userId, env) {
  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  const urls = (env.TURN_URLS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (urls.length && env.TURN_SHARED_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + 3600}:${userId}`;
    const credential = createHmac('sha1', env.TURN_SHARED_SECRET).update(username).digest('base64');
    iceServers.push({ urls, username, credential });
  }
  return iceServers;
}

const validMeteredDomain = domain => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.metered\.live$/i.test(domain);
function isTurnConfigured(env = process.env) {
  return Boolean((env.METERED_TURN_DOMAIN && env.METERED_TURN_API_KEY) || (env.TURN_URLS?.trim() && env.TURN_SHARED_SECRET));
}

function createIceService({ env = process.env, fetchImpl = (...args) => fetch(...args), now = Date.now } = {}) {
  let cached;
  let pending;
  async function fetchMetered() {
    try {
      const domain = env.METERED_TURN_DOMAIN?.trim();
      if (!validMeteredDomain(domain || '') || !env.METERED_TURN_API_KEY) throw new Error('Invalid configuration');
      const response = await fetchImpl(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(env.METERED_TURN_API_KEY)}`, {
        signal: AbortSignal.timeout(5000), redirect: 'error',
      });
      if (!response.ok) throw new Error('Provider rejected request');
      const payload = await response.json();
      if (!Array.isArray(payload) || payload.length > 20) throw new Error('Invalid ICE response');
      const servers = payload.map(server => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        if (!urls.length || urls.length > 20 || urls.some(url => typeof url !== 'string' || url.length > 2048 || !/^(stun|stuns|turn|turns):[^\s]+$/i.test(url))) throw new Error('Invalid ICE URLs');
        const result = { urls };
        if (urls.some(url => /^turns?:/i.test(url))) {
          if (typeof server.username !== 'string' || !server.username || typeof server.credential !== 'string' || !server.credential) throw new Error('Missing relay credentials');
          result.username = server.username;
          result.credential = server.credential;
        }
        return result;
      });
      if (!servers.some(server => server.urls.some(url => /^turns?:/i.test(url)))) throw new Error('No TURN relay returned');
      cached = { servers, until: now() + 15000 };
      return servers;
    } catch {
      // Provider errors can contain the API-key URL. Never propagate them.
      throw Object.assign(new Error('TURN credential service unavailable'), { status: 503 });
    }
  }
  return {
    async getIceServers(userId) {
      if (!env.METERED_TURN_DOMAIN && !env.METERED_TURN_API_KEY) return getDirectIceServers(userId, env);
      if (cached && now() < cached.until) return cached.servers;
      if (!pending) pending = fetchMetered().finally(() => { pending = null; });
      return pending;
    },
  };
}
module.exports = { ...createIceService(), createIceService, isTurnConfigured, validMeteredDomain };
