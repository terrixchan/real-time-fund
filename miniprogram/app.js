// miniprogram/app.js
App({
  onLaunch: function () {
    // 初始化 storage（保留原逻辑）
    if (!wx.getStorageSync('fundList')) {
      wx.setStorageSync('fundList', []);
    }
    if (!wx.getStorageSync('refreshInterval')) {
      wx.setStorageSync('refreshInterval', 15);
    }

    // 云开发 init（关键）
    if (wx.cloud && wx.cloud.init) {
      wx.cloud.init({
        env: 'cloud1-6gov01mkc0cce40b', // 改成当前环境 ID
        traceUser: true
      });
      console.log('[boot] cloud init ok');
    } else {
      console.warn('[boot] wx.cloud not available');
    }
  }
});
