const cloud = require('wx-server-sdk');
cloud.init();

// 缓存机制（防止频率过高被目标 API 封）
const cache = new Map();
const TTL = 10 * 1000;  // 10 秒

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
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = await resp.text();

    const m = text.match(/jsonpgz\((.*)\)/);
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
