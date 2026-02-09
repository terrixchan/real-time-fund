const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init();

const cache = new Map();
const TTL = 10 * 1000;

function getCache(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.t > TTL) {
    cache.delete(key);
    return null;
  }
  return v.data;
}

function setCache(key, data) {
  cache.set(key, { t: Date.now(), data });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`status ${res.statusCode}`));
          }
        });
      })
      .on('error', reject);
  });
}

exports.main = async (event) => {
  const { code } = event;
  if (!code || !/\d{6}/.test(code)) {
    return { ok: false, error: 'invalid code' };
  }

  const cacheKey = `gz:${code}`;
  const c = getCache(cacheKey);
  if (c) return { ok: true, data: c };

  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;

  try {
    const text = await fetchText(url);
    const m = text.match(/jsonpgz\(([\s\S]*?)\);?/);
    if (!m) {
      return { ok: false, error: 'parse_failed', raw: text };
    }
    const data = JSON.parse(m[1]);
    setCache(cacheKey, data);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: 'fetch_failed', message: String(e) };
  }
};
