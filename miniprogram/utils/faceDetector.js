/* eslint-disable no-undef */
const face = require('./postProcess');

// 模型所需要的宽
const modelWidth = 224;
// 模型所需要的高
const modelHeight = 224;
// rgb 3 通道
const modelChannel = 3;

let inferenceStart;

let inferenceEnd;

let startTime = null;

let brightnessRes = 0;

let brightnessPassFlag = false;

let brightnessValueList = [];

// let faceNumber = 0;

class FaceDetector {
	// 图像显示尺寸结构体 { width: Number, height: Number }
	displaySize;

	// net inference session
	session;

	// is ready
	ready;

	// the predicted class
	mPredClass = 'None';

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
	    const modelPath = `${wx.env.USER_DATA_PATH}/faceDetect.onnx`;

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

	        const cloudPath = 'https://hckz-1259319636.cos.ap-guangzhou.myqcloud.com/DL_models/face_detect/faceDetect.onnx';
	        this.downloadFile(cloudPath, (r) => {
	          console.log(`下载进度：${r.progress}%，已下载${r.totalBytesWritten}B，共${r.totalBytesExpectedToWrite}B`);
	        }).then((result) => {
	          wx.getFileSystemManager().saveFile({
	            tempFilePath: result.tempFilePath,
	            filePath: modelPath,
	            success: (res) => { // 注册回调函数
	              console.log(res);

	              const modelPath = res.savedFilePath;
	              console.log(`save onnx model at path: ${modelPath}`);

	              this.createInferenceSession(modelPath).then(() => {
	                resolve();
	              });
	            },
	            fail(res) {
	              console.log(res);
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

	    // 监听error事件
	    this.session.onError((error) => {
	      console.log(error);
	      wx.hideLoading();
	      reject(error);
	    });
	    this.session.onLoad(() => {
	      this.ready = true;
	      resolve();
	    });
	  });
	}

	// 从云存储中下载模型
	downloadFile(fileID, onCall = () => {}) {
	  return new Promise((resolve, reject) => {
	    const task = wx.downloadFile({
	      url: fileID,
	      success: (res) => resolve(res),
	      fail: (e) => {
	        wx.hideLoading();
	        const info = e.toString();
	        if (info.indexOf('abort') != -1) {
	          reject(new Error('【文件下载失败】中断下载'));
	        } else {
	          reject(new Error('【文件下载失败】网络或其他错误'));
	        }
	      }
	    });
	    task.onProgressUpdate((res) => {
	      if (onCall(res) == false) {
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

	// 预处理，将小程序的数据流转换成模型所需数据格式
	preProcess(frame, dstInput, img_resize, hRatio, wRatio, colormode = 'BGR') {
	  return new Promise((resolve, reject) => {
	    const origData = new Uint8Array(frame.data);

	    // resize data to model input size, uint8 data to float32 data,
	    // and transpose from nhwc to nchw

	    const origHStride = frame.width * 4;
	    const origWStride = 4;

	    const mean = [123, 117, 104];

	    const reverse_div = [4.367, 4.464, 4.444]; // reverse of std = [0.229, 0.224, 0.225]
	    const ratio = 1;

	    const normalized_div = [ratio / reverse_div[0], ratio * reverse_div[1], ratio * reverse_div[2]];

	    const normalized_mean = [mean[0] * reverse_div[0], mean[1] * reverse_div[1], mean[2] * reverse_div[2]];

	    let idx = 0;
	    if (colormode === 'RGB') {
	      for (var c = 0; c < modelChannel; ++c) {
	        for (var h = 0; h < modelHeight; ++h) {
	          const origH = Math.round(h * hRatio);

	          const origHOffset = origH * origHStride;

	          for (var w = 0; w < modelWidth; ++w) {
	            const origW = Math.round(w * wRatio);

	            const origIndex = origHOffset + origW * origWStride + c;

	            // var val = ((origData[origIndex] * ratio) - mean[c]) * reverse_div[c];

	            var val = (origData[origIndex] - mean[c]) * ratio;
	            dstInput[idx] = val;
	            img_resize[idx] = origData[origIndex];

	            idx++;
	          }
	        }
	      }
	    } else {
	      for (var c = 2; c >= 0; --c) {
	        for (var h = 0; h < modelHeight; ++h) {
	          const origH = Math.round(h * hRatio);

	          const origHOffset = origH * origHStride;

	          for (var w = 0; w < modelWidth; ++w) {
	            const origW = Math.round(w * wRatio);
					
	            const origIndex = origHOffset + origW * origWStride + c;

	            // var val = ((origData[origIndex] * ratio) - mean[c]) * reverse_div[c];

	            var val = (origData[origIndex] - mean[c]) * ratio;
	            dstInput[idx] = val;
	            img_resize[idx] = origData[origIndex];

	            idx++;
	          }
	        }
	      }
	    }

	    resolve();
	  });
	}

	// 推断出人脸框
	async detect(frame) {
	  return new Promise((resolve, reject) => {
	    const dstInput = new Float32Array(modelChannel * modelHeight * modelWidth);

	    const img_resize = new Float32Array(modelChannel * modelHeight * modelWidth);

	    // 摄像头画面的高与模型的高比值
	    const hRatio = frame.height / modelHeight;

	    // 摄像头画面的宽域模型的宽比值
	    const wRatio = frame.width / modelWidth;

	    // const imageWH = modelHeight * modelWidth;

	    this.preProcess(frame, dstInput, img_resize, hRatio, wRatio).then(() => {
	      const xinput = {
	        shape: [1, 3, modelHeight, modelWidth], // Input data shape in NCHW
	        data: dstInput.buffer,
	        type: 'float32', // Input data type
	      };

		//   let brightnessRes = -1;
		  let nowTime = new Date().getTime();
		  if (!startTime){
			  startTime = new Date().getTime();
		  }
		  if (nowTime - startTime >= 1000){
			startTime = nowTime;
			brightnessRes = 0;
		  }

		  var brightnessResTemp = this.brightness(img_resize);
		  if (brightnessResTemp != 0){
			  brightnessRes = brightnessResTemp;
			  startTime = nowTime;
		  }
		  console.log("brightnessRes",brightnessRes)
		  console.log("brightnessPassFlag",brightnessRes)
	    //   brightnessRes = this.brightness(img_resize);

	      inferenceStart = new Date().getTime();
	      // 运行推理
	      // 其中input 必须与使用的onnx模型中实际的输入输出名字完全一致，不可随意填写。
	      // 模型输入输出信息可以通过 Netron 打开onnx模型看到
	      this.session.run({
	        // Here string "input" Should be the same with the input name in onnx file
	        input: xinput,
	      })
	        .then((res) => {
	          inferenceEnd = new Date().getTime();

	          this.speedTime = inferenceEnd - inferenceStart;
	          // 初步结果
	          const bbox = new Float32Array(res.boxes.data);
	          // 信任值（%）
	          const score = new Float32Array(res.scores.data);
	          // 5个人脸关键点
	          const landmark = new Float32Array(res.landmarks.data);

	          // 生成先验框及解码生成boxes，scores和landmadks
	          const anchor = face.create_anchor(modelHeight, modelWidth);
	          const result = face.decode(anchor, bbox, score, landmark, modelHeight * hRatio, modelWidth * wRatio);
	          const boxes = result[0];
	          const scores = result[1];
	          const landmarks = result[2];
			  
	          // 预测后处理，得到最终结果
			  const box = face.postpredict(boxes, scores, landmarks);
			//   faceNumber = box.length
			  
			  
	          // 人脸位置判断，默认锚定人脸框最大的结果进行计算
			  let faceDetectResult = -1;
			  let faceNumber = 0;
	          if (box.length >= 1) {
				faceDetectResult = face.rigionpredict(box[0], frame.width, frame.height);
				faceNumber = face.filterBox(box, frame.width, frame.height);
	          } else {
	            faceDetectResult = 4; // 未识别到人脸。提示请看向摄像头
	          }
			  console.log('人脸数量', faceNumber);
	          this.getClass(box);

	          resolve({
	            faceCoord: box,
	            faceDetectResult,
	            brightnessRes,
				perfectFaceFrameData: frame,
				faceNumber:faceNumber,
	          });
	        }).catch((error) => {
	          console.log('this.session.run', error);
	        });
	    });
	  });
	}


	getClass(index) {
	  // const cIndex = `c${index}`
	  // this.mPredClass = classNames[cIndex];
	  const box_str = `${index}`;
	  this.mPredClass = box_str;
	}

	getTime() {
	  return this.speedTime;
	}

	dispose() {
	  this.session.destroy();
	}


	brightness_old(img_rgb) {
	//   const brightK = 2.3;
	//   const brightDa = -67;
	//   const brightK = 1.6;
	//   const brightDa = -60;

	  const brightK = 1.3;
	  const brightDa = 60;
	  const darkK = 1.1;
	  const darkDa = -50;
	  const darkDaK = -60;


	  const img_size = modelHeight * modelWidth;
	  const crop_img_size = Math.round(modelHeight * modelWidth * 3 / 4);
	  const img_gray = new Float32Array(crop_img_size);
	  let brightNessResult = 0;

	  // BGR图转Gray图
	  var idx = 0;
	  for (var idx = 0; idx < crop_img_size; idx++) {
	    const val = img_rgb[idx] * 0.114 + img_rgb[idx + img_size] * 0.587 + img_rgb[idx + 2 * img_size] * 0.299;
	    img_gray[idx] = Math.round(val);
	  }

	  // 计算灰度图像素点偏离均值（128）累积和及灰度图数值频次
	  const counts = {};
	  let shift_sum = 0;
	  let Ma = 0;
	  for (var idx = 0; idx < crop_img_size; idx++) {
	    shift_sum += img_gray[idx] - 128;
	    counts[img_gray[idx]] = counts[img_gray[idx]] ? counts[img_gray[idx]] + 1 : 1;
	  }
	  const da = shift_sum / crop_img_size;

	  for (let i = 0; i < 256; i++) {
	    if (typeof (counts[i]) !== 'undefined') {
	      Ma += Math.abs(i - 128 - da) * counts[i];
	    }
	  }
	  Ma /= crop_img_size;
	  const k_value = Math.abs(da / Ma);
	  console.log("da,k_value",da,k_value)
	  if (k_value > darkK) {
	    if (da > brightDa && k_value > brightK) {
	      console.log('过亮');
	      brightNessResult = 1;
	    } else {
	      if (da < darkDa && (Math.abs(da) / k_value) < 45) {
	        console.log('过暗');
	        brightNessResult = 2;
	      }
	    }
	  }

	  if (da < darkDaK) {
	    brightNessResult = 2;
	  }

	  return brightNessResult;
	}

	brightness(img_rgb) {
		const brightK = 1.6;
	  	const brightDa = 60;
	  	const darkK = 1.3;
	  	const darkDa = -50;
	  	const darkDaK = -60;
  
		const img_size = modelHeight * modelWidth;
		const crop_img_size = Math.round(modelHeight * modelWidth * 3 / 4);
		const img_gray = new Float32Array(crop_img_size);
		let brightNessResult = 0;
  
		// BGR图转Gray图
		var idx = 0;
		for (var idx = 0; idx < crop_img_size; idx++) {
		  const val = img_rgb[idx] * 0.114 + img_rgb[idx + img_size] * 0.587 + img_rgb[idx + 2 * img_size] * 0.299;
		  img_gray[idx] = Math.round(val);
		  // console.log(val);
		}
  
		// 计算灰度图像素点偏离均值（128）累积和及灰度图数值频次
		const counts = {};
		let shift_sum = 0;
		let Ma = 0;
		for (var idx = 0; idx < crop_img_size; idx++) {
		  shift_sum += img_gray[idx] - 128;
		  counts[img_gray[idx]] = counts[img_gray[idx]] ? counts[img_gray[idx]] + 1 : 1;
		}
		const da = shift_sum / crop_img_size;
  
		for (let i = 0; i < 256; i++) {
		  if (typeof (counts[i]) !== 'undefined') {
			Ma += Math.abs(i - 128 - da) * counts[i];
		  }
		}
		Ma /= crop_img_size;
		const k_value = Math.abs(da / Ma);
		console.log("k_value,da",k_value,da)
		if (k_value > darkK) {
			if (da > brightDa && k_value > brightK) {
			  console.log('过亮');
			  brightNessResult = 1;
			} else {
			  if (da < darkDa && (Math.abs(da) / k_value) < 45) {
				console.log('过暗');
				brightNessResult = 2;
			  }
			}
		  }
		if (da < darkDaK) {
			brightNessResult = 2;
		}
		return brightNessResult;
	}
  
}

module.export = FaceDetector;
export {
  FaceDetector
};