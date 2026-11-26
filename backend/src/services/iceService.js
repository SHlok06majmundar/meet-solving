const { createHmac } = require('node:crypto');

function getIceServers(userId) {
  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  const urls = (process.env.TURN_URLS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (urls.length && process.env.TURN_SHARED_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + 3600}:${userId}`;
    const credential = createHmac('sha1', process.env.TURN_SHARED_SECRET).update(username).digest('base64');
    iceServers.push({ urls, username, credential });
  }
  return iceServers;
}
module.exports = { getIceServers };
