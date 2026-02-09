App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('[cloud] wx.cloud is not available; please enable cloud development.');
    } else {
      wx.cloud.init({ env: 'cloud1-6gov01mkc0cce40b', traceUser: true });
    }
    if (!wx.getStorageSync('fundList')) {
      wx.setStorageSync('fundList', []);
    }
    if (!wx.getStorageSync('refreshInterval')) {
      wx.setStorageSync('refreshInterval', 15);
    }
  }
});
