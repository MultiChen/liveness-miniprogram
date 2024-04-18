// 模型所需要的宽
const modelWidth = 64;
// 模型所需要的高
const modelHeight = 64;
// rgb 3 通道
const modelChannel = 3;

let inferenceStart;
let inferenceEnd;

class EyesBlinkDetector {
  // 图像显示尺寸结构体 { width: Number, height: Number }
  displaySize;

  // net inference session
  session;

  // is ready
  ready;

  // the predicted class
  mPredClass = 0;

  speedTime = 0.0;

  // modelInput = null;

  constructor(displaySize) {
    this.displaySize = {
      width: displaySize.width,
      height: displaySize.height,
    };
    this.ready = false;
  }

  // 下载模型
  load() {
    return new Promise((resolve, reject) => {
      const modelPath = `${wx.env.USER_DATA_PATH}/blinkDetect.onnx`;

      // 判断之前是否已经下载过onnx模型
      wx.getFileSystemManager().access({
        path: modelPath,
        success: (res) => {
          console.log(`file already exist at: ${modelPath}`);
          this.createInferenceSession(modelPath).then(() => {
            resolve();
          });
        },
        fail: (res) => {
          console.log(res);

          console.log('begin download model');

          const cloudPath = 'https://hckz-1259319636.cos.ap-guangzhou.myqcloud.com/DL_models/blink_detect/blinkDetect.onnx';
          this.downloadFile(cloudPath, (r) => {
            console.log(`下载进度：${r.progress}%，已下载${r.totalBytesWritten}B，共${r.totalBytesExpectedToWrite}B`);
          }).then((result) => {
            wx.getFileSystemManager().saveFile({
              tempFilePath: result.tempFilePath,
              filePath: modelPath,
              success: (saveRes) => { // 注册回调函数
                console.log(saveRes);

                const modelSavePath = saveRes.savedFilePath;
                console.log(`save onnx model at path: ${modelSavePath}`);

                this.createInferenceSession(modelSavePath).then(() => {
                  resolve();
                });
              },
              fail(saveErr) {
                console.log(saveErr);
              }
            });
          });
        }
      });
    });
  }

  // 加载模型
  createInferenceSession(modelPath) {
    return new Promise((resolve, reject) => {
      /**
       * 使用微信原生能力进行推理，亦可使用onnx.js
       */
      this.session = wx.createInferenceSession({
        model: modelPath,
        /* 0: Lowest  precision e.g., LS16 + A16 + Winograd A16 + approx. math
			   1: Lower   precision e.g., LS16 + A16 + Winograd off + approx. math
			   2: Modest  precision e.g., LS16 + A32 + Winograd A32 + approx. math
			   3: Higher  precision e.g., LS32 + A32 + Winograd A32 + approx. math
			   4: Highest precision e.g., LS32 + A32 + Winograd A32 + precise math
		
			   Higher precision always require longer time to run session
			*/
        precisionLevel: 0,
        allowNPU: false, // wheather use NPU for inference, only useful for IOS
        allowQuantize: false, // wheather generate quantize model
      });

      //监听error事件
      this.session.onError((error) => {
        console.log(error);
        reject(error);
      });
      this.session.onLoad(() => {
        this.ready = true;
        resolve();
      });
    });
  }

  downloadFile(fileID, onCall = () => {}) {
    return new Promise((resolve, reject) => {
      const task = wx.downloadFile({
        url: fileID,
        success: (res) => resolve(res),
        fail: (e) => {
          wx.hideLoading();
          const info = e.toString();
          if (info.indexOf('abort') !== -1) {
            reject(new Error('【文件下载失败】中断下载'));
          } else {
            reject(new Error('【文件下载失败】网络或其他错误'));
          }
        }
      });
      task.onProgressUpdate((res) => {
        if (onCall(res) === false) {
          task.abort();
        }
      });
    });
  }

  isReady() {
    return this.ready;
  }

  predClass() {
    return this.mPredClass;
  }


  blinkPreprocess(frame, eye_w, eye_box_x, eye_box_y, eyeInput, dstInput, colormode = 'BGR') {
    return new Promise((resolve, reject) => {
      const origData = new Uint8Array(frame.data);

      // const hRatio = frame.height / modelHeight;

      // const wRatio = frame.width / modelWidth;
      const hRatio = 1;
      const wRatio = 1;

      // resize data to model input size, uint8 data to float32 data,
      // 根据人眼框坐标，裁剪出目标区域
      const origHStride = frame.width * 4;
      const origWStride = 4;
      const mean = [0.485, 0.456, 0.406];
      const reverse_div = [4.367, 4.464, 4.444];
      let idx = 0;
      if (colormode === "BGR") {
        // console.log('RGB')
        for (let h = 0; h < frame.height; ++h) {
          if (h >= eye_box_y && h < (eye_w + eye_box_y)) {
            const origH = Math.round(h * hRatio);
            const origHOffset = origH * origHStride;
            for (let w = 0; w < frame.width; ++w) {
              if (w >= eye_box_x && w < (eye_w + eye_box_x)) {
                for (let c = 0; c < modelChannel; ++c) {
                  const origW = Math.round(w * wRatio);
                  const origIndex = origHOffset + origW * origWStride + c;
                  const val = ((origData[origIndex] / 255) - (mean[c])) * reverse_div[c];
                  eyeInput[idx] = val;
                  idx++;
                }
              }
            }
          }
        }
      } else {
        // for (var c = 2; c >= 0; --c) 
        // console.log('BGR')
        for (let h = 0; h < frame.height; ++h) {
          if (h >= eye_box_y && h < (eye_w + eye_box_y)) {
            const origH = Math.round(h * hRatio);
            const origHOffset = origH * origHStride;
            for (let w = 0; w < frame.width; ++w) {
              if (w >= eye_box_x && w < (eye_w + eye_box_x)) {
                for (let c = 2; c >= 0; --c) {
                  const origW = Math.round(w * wRatio);
                  const origIndex = origHOffset + origW * origWStride + c;
                  const val = ((origData[origIndex] / 255) - (mean[c])) * reverse_div[c];
                  eyeInput[idx] = val;
                  idx++;
                }
              }
            }
          }
        }
      }
      // 人眼区域对其进行resize处理成要求的64*64,transpose from nhwc to nchw
      const hRatio_ = eye_w / 64;
      const wRatio_ = eye_w / 64;
      const origHStride_ = eye_w * 3;
      const origWStride_ = 3;
      let edx = 0;
      let decimalSumH = 0;
      let decimalSumW = 0;
      for (let c = 0; c < modelChannel; ++c) {
        for (let h = 0; h < modelHeight; ++h) {
          let origH = Math.round(h * hRatio_);
          const origHDecimal = (Math.round(h * hRatio_ * 100) / 100) - origH;
          decimalSumH += origHDecimal;
          if (decimalSumH >= 1) {
            origH = origH + 1;
            decimalSumH -= 1;
          }
          if (decimalSumH <= -1) {
            origH = origH - 1;
            decimalSumH += 1;
          }
          const origHOffset = origH * origHStride_;

          for (let w = 0; w < modelWidth; ++w) {
            let origW = Math.round(w * wRatio_);
            const origWDecimal = (Math.round(w * wRatio_ * 100) / 100) - origW;
            decimalSumW += origWDecimal;
            if (decimalSumW >= 1) {
              origW = origW + 1;
              decimalSumW -= 1;
            }
            if (decimalSumW <= -1) {
              origW = origW - 1;
              decimalSumW += 1;
            }
            const origIndex = origHOffset + origW * origWStride_ + c;
            const val = eyeInput[origIndex];
            dstInput[edx] = val;
            edx++;
          }
        }
      }

      for (let c = 0; c < modelChannel; ++c) {
        for (let h = 0; h < modelHeight; ++h) {
          let origH = Math.round(h * hRatio_);
          const origHDecimal = (Math.round(h * hRatio_ * 100) / 100) - origH;
          decimalSumH += origHDecimal;
          if (decimalSumH >= 1) {
            origH = origH + 1;
            decimalSumH -= 1;
          }
          if (decimalSumH <= -1) {
            origH = origH - 1;
            decimalSumH += 1;
          }
          const origHOffset = origH * origHStride_;

          for (let w = 0; w < modelWidth; ++w) {
            let origW = Math.round(w * wRatio_);
            const origWDecimal = (Math.round(w * wRatio_ * 100) / 100) - origW;
            decimalSumW += origWDecimal;
            if (decimalSumW >= 1) {
              origW = origW + 1;
              decimalSumW -= 1;
            }
            if (decimalSumW <= -1) {
              origW = origW - 1;
              decimalSumW += 1;
            }
            const origIndex = origHOffset + origW * origWStride_ + c;
            const val = eyeInput[origIndex];
            dstInput[edx] = val;
            edx++;
          }
        }
      }

      resolve();
    });
  }

  // 人脸检测框转眼睛框坐标处理函数
  boxPreprocess(box) {
    let eye_left_x = box[0][1][0];
    let eye_left_y = box[0][1][1];
    let eye_right_x = box[0][1][2];
    let eye_right_y = box[0][1][3];
    let box_x1 = box[0][0][0];
    let box_y1 = box[0][0][1];
    let box_x2 = box[0][0][2];

    // 人眼宽
    let eye_w = Math.round((box_x2 - box_x1) * 0.25);
    if (eye_w <= 64) {
      eye_w = 64;
    }

    var arrInt = [0, 1]
    var randElement = arrInt[Math.floor(Math.random() * arrInt.length)];

    if (randElement == 0) {
      // console.log('右眼检测')    //
      // 人眼框右顶点x轴坐标
      var eye_box_x = Math.round((eye_right_x - eye_w / 2));
      if (eye_box_x < box_x1) {
        eye_box_x = box_x1;
      }
      // 人眼框右顶点y轴坐标
      var eye_box_y = Math.round((eye_right_y - eye_w / 2));
      if (eye_box_y < box_y1) {
        eye_box_y = box_y1;
      }
    } else {
      // console.log('左眼检测')    //
      // 人眼框左顶点x轴坐标
      var eye_box_x = Math.round((eye_left_x - eye_w / 2));
      if (eye_box_x < box_x1) {
        eye_box_x = box_x1;
      }
      // 人眼框左顶点y轴坐标
      var eye_box_y = Math.round((eye_left_y - eye_w / 2));
      if (eye_box_y < box_y1) {
        eye_box_y = box_y1;
      }
    }

    return [
      eye_w,
      eye_box_x,
      eye_box_y,
      // eye_box_x2,
      // eye_box_y2
    ];
  }

  // 眨眼检测主函数
  async detect(frame, box) {
    return new Promise((resolve, reject) => {
      // 根据人脸检测框的box结果，解析眼睛坐标
      let eye_landmark = this.boxPreprocess(box);
      let eye_w = eye_landmark[0]; // 人眼宽
      let eye_box_x = eye_landmark[1]; // 人眼框左顶点x轴坐标
      let eye_box_y = eye_landmark[2]; // 人眼框左顶点y轴坐标

      let dstInput = new Float32Array(2 * modelChannel * modelHeight * modelWidth);
      let dstInput2 = new Float32Array(modelChannel * modelHeight * modelWidth);
      let eyeInput = new Float32Array(modelChannel * eye_w * eye_w);
      let eyeInput2 = new Float32Array(modelChannel * eye_w * eye_w);

      // 将人眼坐标输入到模型数据格式预处理函数进行处理


      this.blinkPreprocess(frame, eye_w, eye_box_x, eye_box_y, eyeInput, dstInput).then(() => {
        const xinput = {
          shape: [2, 3, modelHeight, modelWidth], // Input data shape in NCHW
          // data: new Float32Array(3 * 224 * 224).buffer,
          data: dstInput.buffer,
          type: 'float32', // Input data type
        };
        //   console.log("xinput11",xinput.data)
        inferenceStart = new Date().getTime();
        // 运行推理
        // 其中input 必须与使用的onnx模型中实际的输入输出名字完全一致，不可随意填写。
        // 模型输入输出信息可以通过 Netron 打开onnx模型看到
        this.session.run({
            // Here string "input" Should be the same with the input name in onnx file
            x: xinput,
          })
          .then((res) => {
            inferenceEnd = new Date().getTime();
            //   console.log('res:', res);
            for (let key in res) {
              let blink_result = new Float32Array(res[key].data);
              if (blink_result[0] >= 0.9) {
                console.log('blink_result闭眼置信度:', blink_result[0]);
              }
              if (blink_result[1] >= 0.9) {
                this.mPredClass = 0;
                //   console.log('睁眼');
              }
              if (blink_result[0] >= 0.9) {
                //   console.log('闭眼');
                this.mPredClass = 1;
              }
              if (blink_result[3] >= 0.7) {
                // console.log('遮挡')
                this.mPredClass = 2;
              }
            }

            this.speedTime = inferenceEnd - inferenceStart;
            resolve({
              blinkResult: this.mPredClass,
              eyesBlinkFrame: frame
            });
          })
          .catch((err) => {
            console.log('detect err', err);
          });
      });
    });
  }

  getTime() {
    return this.speedTime;
  }

  dispose() {
    this.session.destroy();
  }
}

module.export = EyesBlinkDetector;

export {
  EyesBlinkDetector
};