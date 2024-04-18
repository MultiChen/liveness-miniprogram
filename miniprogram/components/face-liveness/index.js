var e = getApp(),url = e.globalData.url;
const {
  EyesBlinkDetector
} = require('../../utils/blinkDetector');
const {
  FaceDetector
} = require('../../utils/faceDetector');

Component({

  data: {
    // 页面类名
    pageClass: 'detect-white',
    cameraBorder: 'camera-border',
    cameraClass: 'detect-camera-model',
    faceDetectTips: '',
    randomClass: {
      r: 'detect-red',
      y: 'detect-yellow',
      b: 'detect-blue',
      g: 'detect-green',
      W: 'detect-white',
    },
    // 相机每帧宽高
    frameWidth: null,
    frameheight: null,
    // 当前屏幕亮度
    screenBrightness: null,
    // 是否在录制视频中
    isRecording: false,
    // 视频录制成功
    recordSuccess: false,
    // 人脸检测中
    faceDetecting: false,
    // 眨眼检测中
    eyesBlinkDetecting: false,
    // 眨眼检测通过
    eyesBlinkDetectPassed: false,
    // 发光序列

    // 当前光序列
    currentLightSequence: '',
    // 最佳活体照存储路径
    activeFacePhotoPath: null,
    // 眨眼照存储路径
    blinkPhotoPath: null,
    // 睁眼次数
    eyeBlinkNum: 0,
    // 是否中断录制
    isBreakOff: false,
    frameData: null,
    startDectTime: 0,
    endDetecTime: 0,
    blinkTimes: 0,
  },

  lifetimes: {
    async ready() {
      // 生产光序列
      this.createLightSequence();
      // 初始化摄像头
      this.initCamera();
      // 初始化画布
      this.initCanvas();
      // 设置屏幕亮度
      this.initScreen();
      this.setData({
        cameraClass: 'detect-camera',
      })
    },
    async detached() {
      this.listener.stop();
      this.data.eyesBlinkDetectPassed = false;
      this.cameraContext = null;
      this.listener = null;
    }
  },

  methods: {
    initScreen() {
      // 1、获取当前屏幕亮度，保存
      // 2、将屏幕调整至最亮，进行视频录制
      wx.getScreenBrightness({
        success: (brightnessValue) => {
          this.data.screenBrightness = brightnessValue.data;
          wx.setScreenBrightness({
            value: 1,
          });
        }
      });
    },
    // 初始化画布
    initCanvas() {
      const that = this;
      // 创建眨眼照画布实例
      this.createSelectorQuery().in(this)
        .select('#eyes_blink') // 在 WXML 中填入的 id
        .fields({
          node: true,
          size: true
        })
        .exec((res) => {
          const eyesCanvasNode = res[0].node;
          that.eyesCanvasNode = eyesCanvasNode;
          that.eyesCanvas = eyesCanvasNode.getContext('2d');
          // Canvas 画布的实际绘制宽高
          const {
            width
          } = res[0];
          const {
            height
          } = res[0];

          /**
           * 初始化画布大小
           */
          // 获取像素比
          const dpr = wx.getSystemInfoSync().devicePixelRatio;
          eyesCanvasNode.width = width * dpr;
          eyesCanvasNode.height = height * dpr;
          that.eyesCanvas.scale(dpr, dpr);
        });
    },
    // 初始化摄像头
    async initCamera() {
      // 创建相机实例上下文
      this.cameraContext = wx.createCameraContext(this);
      this.data.recordSuccess = false;
      this.data.isRecording = false;
      // 初始化检测模型
      await this.initDetector();
      this.data.detectNum = 0;
      this.data.startDectTime = new Date().getTime()
      this.listener = this.cameraContext.onCameraFrame((frame) => { // 获取 Camera实时帧数据

        // 设置帧宽高
        if (!this.data.frameWidth || !this.data.frameHeight) {
          this.data.frameWidth = frame.width;
          this.data.frameHeight = frame.height;
        }
        this.data.detectNum++;
        if (this.data.detectNum > 10) {
          this.data.detectNum = 0;
        }
        // 如果人脸检测模型已经加载好，则可以开始识别
        if (this.faceDetector && this.faceDetector.isReady() && !this.data.faceDetecting && !this.data.hasSend && this.data.detectNum === 0) {
          // if (this.faceDetector && this.faceDetector.isReady() && !this.data.faceDetecting && !this.data.hasSend) {
          // 执行
          // this.data.startDectTime =  new Date().getTime()
          this.executeFaceDetect(frame);
        }
      });
      this.listener.start();
    },
    // 生成光序列
    createLightSequence() {
      const colorSequenceList = ['r', 'y', 'b', 'g'];
      const firstColorNum = Math.floor(Math.random() * 4);
      let secondColorNum = firstColorNum + 1;
      if (secondColorNum > 3) {
        secondColorNum = 0;
      }
      this.data.currentLightSequence = `${colorSequenceList[firstColorNum] + colorSequenceList[secondColorNum] + colorSequenceList[firstColorNum]}W`;
    },
    // 初始化检测模型
    initDetector() {
      wx.showLoading();
      this.faceDetector = new FaceDetector({
        width: 375,
        height: 667
      });
      this.faceDetector.load().then(() => {
        wx.hideLoading();
        console.log('模型初始化完成');
      }).catch((err) => {
        console.log('模型加载报错：', err);
      });
      this.eyesBlinkDetector = new EyesBlinkDetector({
        width: 375,
        height: 667
      });
      this.eyesBlinkDetector.load().then(() => {
        wx.hideLoading();
        console.log('眨眼模型初始化完成');
      }).catch((err) => {
        console.log('眨眼模型加载报错：', err);
      });
    },
    // 屏幕闪烁
    screenFlashing() {
      let index = 0;
      if (this.flashingTimer) {
        clearInterval(this.flashingTimer);
        this.flashingTimer = null;
      }
      this.setData({
        pageClass: this.data.randomClass[this.data.currentLightSequence[index]],
        faceDetectTips: ''
      });
      this.flashingTimer = setInterval(() => {
        index++;
        if (this.data.currentLightSequence && this.data.currentLightSequence[index]) {
          const colorKey = this.data.currentLightSequence[index];
          // console.log('isBreakOff', !this.data.isBreakOff);  //11
          if (!this.data.isBreakOff) {
            this.setData({
              pageClass: this.data.randomClass[colorKey]
            });
          } else {
            this.setData({
              pageClass: 'detect-white'
            });
          }
        }
      }, 500);
    },
    // 开始录屏
    startRecord() {
      this.data.isRecording = true;
      const that = this;
      // 人脸识别通过,需要保存当前入参的帧，当作最佳人脸照上传接口
      if (!this.data.activeFacePhotoPath) {
        // 存储最佳人脸照
        this.cameraContext.takePhoto({
          // quality: 'high',
          success: (takeSuccess) => {
            console.log('takeSuccess', takeSuccess);
            that.data.activeFacePhotoPath = takeSuccess.tempImagePath;
          },
          fail: (takeFail) => {
            console.log('takeFail', takeFail);
          }
        });
      }
      this.data.isBreakOff = false;
      this.cameraContext.startRecord({
        success: (res) => {
          console.log('调用了startRecord，启动录制成功', res);
          if (this.stopRecordTimer) {
            clearTimeout(this.stopRecordTimer);
            this.stopRecordTimer = null;
          }
          this.screenFlashing();
          this.stopRecordTimer = setTimeout(() => {
            this.stopRecord();
          }, 2000);
        },
        fail: (err) => {
          console.log('启动录制失败', err);
          wx.setScreenBrightness({
            value: this.data.screenBrightness || 0.5
          });
          this.data.isRecording = false;
          this.setData({
            pageClass: 'detect-white'
          });
        }
      });

    },
    // 停止录屏
    async stopRecord() {
      if (!this.data.isRecording) {
        return;
      }
      if (this.flashingTimer) {
        clearInterval(this.flashingTimer);
        this.flashingTimer = null;
      }

      // console.log('走进来了stopRecord', this.data.isRecording, '是否需要上传视频：', !this.data.isBreakOff);  //11
      await this.cameraContext.stopRecord({
        // compressed: true,
        success: (res) => {
          // console.log('=======stopRecord success');  //11
          this.data.isRecording = false;
          this.setData({
            pageClass: 'detect-white',
            faceDetectTips: ''
          });
          // console.log('stop isBreakOff', !this.data.isBreakOff);  //11

          // 如果录制时人脸移动出屏幕，停止录屏，不上传视频
          if (!this.data.isBreakOff) {
            wx.setScreenBrightness({
              value: this.data.screenBrightness || 0.5
            });
            this.data.recordSuccess = true;
            this.data.liveVideoPath = res.tempVideoPath;
          }
        },
        fail: (err) => {
          this.data.isRecording = false;
          clearTimeout(this.stopRecordTimer);
          this.setData({
            pageClass: 'detect-white',
            faceDetectTips: ''
          });
          wx.setScreenBrightness({
            value: this.data.screenBrightness || 0.5
          });
          clearTimeout(this.stopRecordTimer);
          // console.log('stop err', err, this.data.isRecording);  //11
        }
      });
    },
    // 执行人脸检测
    async executeFaceDetect(frame) {
      if (this.faceDetector && this.faceDetector.isReady()) {
        this.data.faceDetecting = true;
        // 检测人脸
        await this.faceDetector.detect(frame).then((res) => {
          this.data.faceDetecting = false;
          // 处理人脸检测结果
          this.handleFaceDetectRes(res);
          this.data.endDetecTime = new Date().getTime()
          // console.log("总的检测耗时1111 = ",this.data.endDetecTime - this.data.startDectTime)  //11
        }).catch((err) => {
          this.data.faceDetecting = false;
          console.log('detect err', err);
        });
      } else {
        this.data.faceDetecting = false;
      }
    },
    // 处理人脸检测结果，提示对应文案
    async handleFaceDetectRes(detectResult) {
      const {
        faceDetectResult,
        brightnessRes,
        perfectFaceFrameData,
        faceCoord,
        faceNumber,
      } = detectResult;
      console.log('人脸数量', faceNumber);
      let faceDetectTips = '';
      // console.log("brightnessRes",brightnessRes)
      // 未检测到人脸
      if (faceCoord.length === 0) {
        this.setData({
          faceDetectTips: '请您面向屏幕',
          pageClass: 'detect-white',
          eyesBlinkDetectPassed: false,
          blinkPhotoPath: '',
          activeFacePhotoPath: '',
          eyeBlinkNum: 0,
          isBreakOff: true,
          cameraBorder: 'camera-border-red'
        });
        return;
      }
      // brightNessResult: 0、正常；1、过亮；2、过暗
      if (brightnessRes !== -1 && brightnessRes !== 0) {
        if (brightnessRes === 1) {
          faceDetectTips = '光线太亮';
        }
        if (brightnessRes === 2) {
          faceDetectTips = '光线太暗';
        }

        this.setData({
          faceDetectTips,
          pageClass: 'detect-white',
          cameraBorder: 'camera-border-red'
        });
        // console.log('因为', faceDetectTips, '需要重新识别人脸,此时是否正在录制', this.data.isRecording); //11
        // 停止录屏，并且不上传
        if (this.data.isRecording) {
          this.data.isBreakOff = true;
          this.stopRecord();
        }
        return;
      }
      if (faceDetectResult !== 0) {
        // 人脸检测未通过，清空眨眼检测结果
        this.dealWithFaceDetectFailRes(faceDetectResult);
        return;
      }
      // 脸部关键点存在，人脸检测及明暗度合适
      if (faceCoord.length > 0 && faceDetectResult === 0 && brightnessRes === 0) {
        this.setData({
          cameraBorder: 'camera-border'
        });
        const confidentScore = faceCoord[0][2];
        // console.log('confidentScore', confidentScore);   //11

        // console.log('人脸检测结果faceDetectResult和brightnessRes', faceDetectResult, brightnessRes);   //11
        if (!this.data.isRecording && !this.data.recordSuccess) {
          this.setData({
            faceDetectTips: '请您缓慢眨眼'
          });
        }
        // 执行眨眼检测
        if (!this.data.eyesBlinkDetecting && !this.data.blinkPhotoPath) {
          this.data.eyesBlinkDetecting = true;
          if (!this.data.eyesDetectBegin) {
            this.data.eyesDetectBegin = new Date().getTime();
          }
          this.data.blinkTimes += 1;
          this.executeEyesDetect({
            faceCoord,
            faceFrame: perfectFaceFrameData
          });
        }
        if (!this.data.isRecording && !this.data.recordSuccess && this.data.eyesBlinkDetectPassed) {
          this.setData({
            faceDetectTips: '光线即将闪烁，请保持姿势稳定'
          });
          await this.startRecord();
        }
        if (this.data.recordSuccess && this.data.activeFacePhotoPath && this.data.blinkPhotoPath) {
          this.uploadVideoAndPic();
        }
      }
    },
    // 处理人脸检测失败
    dealWithFaceDetectFailRes(faceDetectResult) {
      if (this.flashingTimer) {
        clearInterval(this.flashingTimer);
        this.flashingTimer = null;
      }
      let faceDetectTips = '';
      // faceDetectResult：0、正常；1、太近；2、太远；3、未居中
      switch (faceDetectResult) {
        case 1:
          faceDetectTips = '请您离远一点';
          break;
        case 2:
          faceDetectTips = '请您靠近一点';
          break;
        case 3:
          faceDetectTips = '请您保持人脸居中';
          break;
        default:
          faceDetectTips = '请您保持人脸居中';
          break;
      }
      this.setData({
        faceDetectTips,
        pageClass: 'detect-white',
        eyesBlinkDetectPassed: false,
        blinkPhotoPath: '',
        activeFacePhotoPath: '',
        eyeBlinkNum: 0,
        cameraBorder: 'camera-border-red'
      });
      // console.log('因为', faceDetectTips, '需要重新识别人脸,此时是否正在录制', this.data.isRecording);  //11
      if (this.data.isRecording) {
        this.data.isBreakOff = true;
        this.stopRecord();
      }
    },
    // 保存最佳人脸照或眨眼照
    async saveFaceOrEyesBlinkPic(params) {
      this.data.isSavingPicPath = true;
      const {
        picType,
        picData
      } = params;
      // 将帧数据转换为 Uint8Array
      const imageData = new Uint8Array(picData);
      const imgData = this.eyesCanvas.createImageData(this.data.frameWidth, this.data.frameHeight);
      const {
        data
      } = imgData;
      // 将帧数据复制到 ImageData 对象中
      for (let i = 0; i < imageData.length; i++) {
        data[i] = imageData[i];
      }
      this.eyesCanvasNode.width = this.data.frameWidth;
      this.eyesCanvasNode.height = this.data.frameHeight;
      await this.eyesCanvas.putImageData(imgData, 0, 0);
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const that = this;
      wx.canvasToTempFilePath({
        canvas: that.eyesCanvasNode,
        x: 0,
        y: 0,
        width: that.data.frameWidth,
        height: that.data.frameHeight,
        destWidth: that.data.frameWidth * dpr,
        destHeight: that.data.frameHeight * dpr,
        fileType: 'jpg',
        quality: 0.5,
        success(canvasToTempFilePath) {
          // console.log('picType', picType);    //11
          // console.log('eyesImage', canvasToTempFilePath.tempFilePath);     //11
          // 最佳活体照存储路径
          if (picType === 'activeFacePhotoPath') {
            that.data.activeFacePhotoPath = canvasToTempFilePath.tempFilePath;
          }
          // 眨眼照存储路径
          if (picType === 'blinkPhotoPath') {
            that.data.blinkPhotoPath = canvasToTempFilePath.tempFilePath;
          }
        },
        fail(err) {
          console.log('canvasToTempFilePath err', picType, err);
        },
        complete() {
          that.data.isSavingPicPath = false;
        }
      }, this);
    },
    // 执行眨眼检测
    async executeEyesDetect(params) {
      const {
        faceFrame,
        faceCoord
      } = params;
      this.data.frameData = new Uint8Array(faceFrame.data);
      if (this.eyesBlinkDetector && this.eyesBlinkDetector.isReady()) {
        await this.eyesBlinkDetector.detect(faceFrame, faceCoord).then((res) => {
          this.data.eyesBlinkDetecting = false;
          if (res.blinkResult === 0) {
            this.data.eyeBlinkNum++;
          }

          if (res.blinkResult === 2) {
            this.data.eyeBlinkNum = 0;
          }

          if (this.data.eyeBlinkNum > -1 && res.blinkResult === 1 && !this.data.eyesBlinkDetectPassed) {
            this.data.eyesBlinkDetectPassed = true;
            this.data.eyesDetectEnd = new Date().getTime() - this.data.eyesDetectBegin;
            console.log('眨眼检测用时', this.data.eyesDetectEnd); //11
            console.log('眨眼检测次数', this.data.blinkTimes); //11

            const {
              eyesBlinkFrame
            } = res;
            this.handleEyesDetectRes(this.data.frameData);
          }
        }).catch((err) => {
          this.data.eyesBlinkDetectPassed = false;
          this.data.eyesBlinkDetecting = false;
          console.log('detect err', err);

        });
      } else {
        this.data.eyesBlinkDetecting = false;
      }
    },
    // 处理眨眼检测结果
    async handleEyesDetectRes(faceFrame) {
      if (!this.data.blinkPhotoPath && !this.data.isSavingPicPath) {
        // 保存眨眼照
        this.saveFaceOrEyesBlinkPic({
          picType: 'blinkPhotoPath',
          picData: faceFrame,
        });
      }
    },
    // 上传视频和图片
    async uploadVideoAndPic(params) {
      //   liveVideoPath, // 视频路径
      //   activeFacePhotoPath, // 最佳人脸照路径
      //   blinkPhotoPath, // 眨眼照路径
      const {
        liveVideoPath,
        activeFacePhotoPath,
        blinkPhotoPath
      } = this.data;
      console.log('liveVideoPath', liveVideoPath);
      console.log('activeFacePhotoPath', activeFacePhotoPath);
      console.log('blinkPhotoPath', blinkPhotoPath);
      if (!liveVideoPath || !activeFacePhotoPath || !blinkPhotoPath) {
        return;
      }
      // 若眨眼检测未通过
      if (!this.data.eyesBlinkDetectPassed) {
        return;
      }
      this.setData({
        faceDetectTips: '认证中，请勿离开',
        cameraClass: 'detect-camera-model',
      });
      if (!this.data.hasSend) {
        // // 最佳人脸照保存至本地相册（便于直接调试时查看）
        // wx.saveVideoToPhotosAlbum({
        //   filePath: liveVideoPath
        // });
        // // 活体视频照保存至本地相册（便于直接调试时查看）
        // wx.saveImageToPhotosAlbum({
        //   filePath: activeFacePhotoPath
        // });
        // // 眨眼照保存至本地相册（便于直接调试时查看）
        // wx.saveImageToPhotosAlbum({
        //   filePath: blinkPhotoPath
        // });
        this.sendDataToServer(activeFacePhotoPath, blinkPhotoPath, liveVideoPath)
        this.data.hasSend = true;
        console.log('完成')
        
      }
    },
    // 将指定路径的文件读取并转换为Base64编码的字符串
    async fileToBase64(filePath) {
      return new Promise((resolve, reject) => {
        // 获取文件系统管理器
        const fileSystemManager = wx.getFileSystemManager();

        // 读取文件
        fileSystemManager.readFile({
          filePath: filePath, // 文件路径，可以是临时文件路径或永久文件路径
          encoding: 'base64', // 指定编码格式为base64
          success: function (res) {
            // 文件读取成功，res.data包含了Base64编码的文件内容
            resolve(res.data);
          },
          fail: function (err) {
            // 文件读取失败
            reject(err);
          }
        });
      });
    },
    checkPassFlag (pass_flag) {
      console.log('跳转结果页'),
      wx.navigateTo({
        url: '../../pages/result/result?pass_flag=' + pass_flag,
      });
    },
    async sendDataToServer(activeFacePhotoPath, blinkPhotoPath, liveVideoPath) {
      console.log('开始调用后台接口')
      try {
        // 将文件转换为Base64
        console.log('文件格式转换')
        const activeFacePhotoBase64 = await this.fileToBase64(activeFacePhotoPath);
        const blinkPhotoBase64 = await this.fileToBase64(blinkPhotoPath);
        const liveVideoBase64 = await this.fileToBase64(liveVideoPath);
        console.log('发送request请求')
        // 使用wx.request发送数据
        wx.request({
          url: url,
          method: 'POST',
          // data: JSON.stringify({
          //   active_face_photo_base64: activeFacePhotoBase64,
          //   blink_photo_base64: blinkPhotoBase64,
          //   live_video_base64: liveVideoBase64,
          // }),
          data: {
            'active_face_photo_base64': activeFacePhotoBase64,
            'blink_photo_base64': blinkPhotoBase64,
            'live_video_base64': liveVideoBase64
          },
          header: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          success: (res) => {
            console.log('Server response:', res.data);
            this.checkPassFlag(res.data)
          },
          fail(error) {
            console.error('Request failed:', error);
          }
        });
      } catch (error) {
        console.error('Error converting files to Base64:', error);
      }
    },
  },
});