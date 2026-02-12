// miniprogram/utils/fund.js
// 上传兼容版：无 ?. / ?? / import / export
// 目标：对外提供 getFundGz(code) -> { name, gsz, gztime, gszzl, ... }

function normalizeCode(input) {
  if (!input) return '';
  if (typeof input === 'string' || typeof input === 'number') return String(input);

  if (typeof input === 'object') {
    if (input.code) return String(input.code);
    if (input.fundCode) return String(input.fundCode);
    if (input.symbol) return String(input.symbol);
  }
  return '';
}

function unwrap(res) {
  // wx.cloud.callFunction 返回：{ errMsg, result, ... }
  var r = res && res.result ? res.result : null;
  if (!r) throw new Error('empty cloud result');

  // 常见：{ ok:true, data:{...} }
  if (typeof r === 'object' && r !== null) {
    if (r.ok === false) throw new Error(r.error || 'cloud result not ok');

    if (typeof r.ok !== 'undefined' && typeof r.data !== 'undefined') r = r.data;
  }

  // 再兜底：有些会返回 { data: {...} } 或 { result: {...} }
  if (r && typeof r === 'object') {
    if (r.data && typeof r.data === 'object') r = r.data;
    if (r.result && typeof r.result === 'object') r = r.result;
  }

  return r;
}

function normalizePayload(p) {
  // 页面需要：name / gsz / gztime / gszzl
  // 如果字段已经齐全，直接返回
  if (p && (typeof p.gsz !== 'undefined' || typeof p.gszzl !== 'undefined' || typeof p.gztime !== 'undefined')) {
    return p;
  }

  // 常见兼容：把可能的嵌套再拆一次
  if (p && typeof p === 'object') {
    if (p.data && typeof p.data === 'object') return normalizePayload(p.data);
    if (p.fund && typeof p.fund === 'object') return normalizePayload(p.fund);
    if (p.fundData && typeof p.fundData === 'object') return normalizePayload(p.fundData);
  }

  // 实在不行，原样返回，让页面至少能看到日志
  return p;
}

function callFundProxy(codeOrObj) {
  var code = normalizeCode(codeOrObj);
  if (!code) return Promise.reject(new Error('missing fund code'));

  if (!wx || !wx.cloud || !wx.cloud.callFunction) {
    return Promise.reject(new Error('wx.cloud not available'));
  }

  return wx.cloud
    .callFunction({
      name: 'fundProxy',
      data: { code: code }
    })
    .then(function (res) {
      var p = unwrap(res);
      return normalizePayload(p);
    });
}

// ✅ 页面正在 require 的名字：getFundGz
function getFundGz(code) {
  return callFundProxy(code);
}

module.exports = {
  // 页面直用
  getFundGz: getFundGz,

  // 其余别名（历史兼容）
  callFundProxy: callFundProxy,
  fetchFund: callFundProxy,
  getFund: callFundProxy,
  requestFund: callFundProxy
};
