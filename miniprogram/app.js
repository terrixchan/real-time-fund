App({
  onLaunch() {
    if (!wx.getStorageSync('fundList')) {
      wx.setStorageSync('fundList', []);
    }
    if (!wx.getStorageSync('refreshInterval')) {
      wx.setStorageSync('refreshInterval', 15);
    }
  }
});
