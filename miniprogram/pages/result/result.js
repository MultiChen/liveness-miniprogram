// pages/result/result.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    resultText: '',
    imageSrc: '',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const pass_flag = options.pass_flag === 'true';
    this.setData({
      resultText: pass_flag ? '认证成功' : '认证失败，请重试',
      imageSrc: pass_flag ? '../../images/认证成功.png' : '../../images/认证失败.png',
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})