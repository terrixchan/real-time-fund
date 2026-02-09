export async function getFundGz(code) {
  const res = await wx.cloud.callFunction({
    name: 'fundProxy',
    data: { code }
  });
  if (!res?.result?.ok) {
    throw new Error(res.result?.error || 'unknown error');
  }
  return res.result.data;
}
