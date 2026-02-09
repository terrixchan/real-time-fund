import { getFundGz } from '../../utils/fund';

const intervalOptions = [
  { label: '5 秒', value: 5 },
  { label: '10 秒', value: 10 },
  { label: '15 秒', value: 15 },
  { label: '30 秒', value: 30 },
  { label: '60 秒', value: 60 },
  { label: '120 秒', value: 120 },
  { label: '300 秒', value: 300 }
];

Page({
  data: {
    inputCode: '',
    funds: [],
    refreshInterval: 15,
    intervalOptions
  },

  onLoad() {
    const storedList = wx.getStorageSync('fundList') || [];
    const refreshInterval = wx.getStorageSync('refreshInterval') || 15;
    this.setData({
      funds: storedList,
      refreshInterval
    });
  },

  onShow() {
    this.startAutoRefresh();
    if (this.data.funds.length) {
      this.refreshAllFunds();
    }
  },

  onHide() {
    this.stopAutoRefresh();
  },

  onUnload() {
    this.stopAutoRefresh();
  },

  onInputChange(event) {
    this.setData({ inputCode: event.detail.value.trim() });
  },

  onAddFund() {
    const code = this.data.inputCode;
    if (!/^\d{6}$/.test(code)) {
      wx.showToast({ title: '请输入 6 位基金代码', icon: 'none' });
      return;
    }

    if (this.data.funds.some((item) => item.code === code)) {
      wx.showToast({ title: '该基金已存在', icon: 'none' });
      this.setData({ inputCode: '' });
      return;
    }

    const newItem = {
      code,
      name: '',
      estimate: '--',
      time: '',
      changeText: '--',
      changeClass: ''
    };

    const nextFunds = [newItem, ...this.data.funds];
    this.setData({ funds: nextFunds, inputCode: '' });
    wx.setStorageSync('fundList', nextFunds);
    this.fetchFund(code);
  },

  onRemoveFund(event) {
    const { code } = event.currentTarget.dataset;
    const nextFunds = this.data.funds.filter((item) => item.code !== code);
    this.setData({ funds: nextFunds });
    wx.setStorageSync('fundList', nextFunds);
  },

  onIntervalChange(event) {
    const index = event.detail.value;
    const selected = this.data.intervalOptions[index];
    if (!selected) return;
    this.setData({ refreshInterval: selected.value });
    wx.setStorageSync('refreshInterval', selected.value);
    this.stopAutoRefresh();
    this.startAutoRefresh();
  },

  onManualRefresh() {
    this.refreshAllFunds();
  },

  startAutoRefresh() {
    if (this.refreshTimer) return;
    const interval = this.data.refreshInterval * 1000;
    this.refreshTimer = setInterval(() => {
      this.refreshAllFunds();
    }, interval);
  },

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  refreshAllFunds() {
    if (!this.data.funds.length) return;
    this.data.funds.forEach((item) => this.fetchFund(item.code));
  },

  async fetchFund(code) {
    try {
      const data = await getFundGz(code);
      this.updateFundItem(code, data);
    } catch (error) {
      wx.showToast({ title: `基金 ${code} 获取失败`, icon: 'none' });
    }
  },

  updateFundItem(code, payload) {
    const nextFunds = this.data.funds.map((item) => {
      if (item.code !== code) return item;
      const changeValue = Number(payload.gszzl || 0);
      return {
        ...item,
        name: payload.name || item.name,
        estimate: payload.gsz || '--',
        time: payload.gztime || '',
        changeText: `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%`,
        changeClass: changeValue >= 0 ? 'up' : 'down'
      };
    });
    this.setData({ funds: nextFunds });
    wx.setStorageSync('fundList', nextFunds);
  }
});
