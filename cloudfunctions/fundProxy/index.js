// cloudfunctions/fundProxy/index.js
const https = require('https')

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve({ statusCode: res.statusCode, data }))
    }).on('error', reject)
  })
}

exports.main = async (event, context) => {
  const code = String(event.code || '').trim()
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: 'invalid code', code }
  }

  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`

  try {
    const { statusCode, data } = await httpsGet(url)

    // 返回格式大概是：jsonpgz({...});
    const m = data.match(/jsonpgz\((\{.*\})\);?/)
    if (!m) {
      return { ok: false, error: 'unexpected response', statusCode, raw: data.slice(0, 200) }
    }

    const obj = JSON.parse(m[1])
    return { ok: true, data: obj }
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) }
  }
}
