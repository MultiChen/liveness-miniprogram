/* eslint-disable no-undef */
// 后处理
function postpredict(boxes, confidences, landmarks, iou_threshold = 0.3, top_k = -1) {
  // 过滤掉置信度低的值
  const confidence = confidences.filter((item, index) => index % 2 === 1);
  const mask = confidence.map((item) => (item > 0.6));
  const probs = confidence.filter((item, index) => mask[index]);
  const landmark = landmarks.filter((item, index) => mask[index]);

  // 过滤掉置信度低的人脸框
  var box = reshapeArr(boxes, 4);
  var box = box.filter((item, index) => mask[index]);

  // nms非极大值过滤
  let box_landmark = hard_nms(box, probs, landmark, iou_threshold = 0.4, top_k);

  // 若出现两张以上人脸，对预测出来的人脸框按面积大小排序，首位为最大
  if (box_landmark.length >= 2) {
    box_landmark = sortRuslut(box_landmark);
  }

  return box_landmark;
}

// 人脸区域判断函数
function rigionpredict(boxes, image_width, image_height) {
  // 人脸状态码，正常状态为0，宜鹏你可以自己定义,加上过暗过亮
  let faceDetectResult = 0;

  // 只对最大人脸做区域判定,即取第一张人脸框
  const box = boxes[0];

  // 计算人脸宽高以及人脸中心点坐标
  const face_w = box[2] - box[0];
  const face_h = box[3] - box[1];
  const center_x = (box[0] + box[2]) / 2;
  const center_y = (box[1] + box[3]) / 2;

  // 计算人脸框面积以及摄像头画面总面积,人脸占比
  const face_area = face_w * face_h;
  const total_area = image_width * image_height;
  const face_percentage = face_area / total_area;

  if (face_percentage > 0.35) {
    faceDetectResult = 1;
    console.log('人脸太近，请远离');
  }

  if (face_percentage < 0.10) {
    faceDetectResult = 2;
    console.log('人脸太远，请靠近');
  }

  if (center_x < image_width * 0.35 || center_x > image_width * 0.72 || center_y < image_height * 0.35 || center_y > image_height * 0.72 || box[0] < 5 || box[1] < 5 || box[2] > image_width - 5 || box[3] > image_height - 5) {
    faceDetectResult = 3
    console.log("人脸未居中，请正对屏幕");
  }

  return faceDetectResult;
}

function sortRuslut(arr) {
  // 计算面积area_arr数组
  const area_arr = [];
  for (let i = 0; i < arr.length; i++) {
    const x1 = arr[i][0][0];
    const x2 = arr[i][0][2];
    const y1 = arr[i][0][1];
    const y2 = arr[i][0][3];
    const area = (x2 - x1) * (y2 - y1);
    area_arr.push(area);
  }

  // 选择排序
  arr = selectionSort(area_arr, arr);

  return arr;
}

// 选择排序算法
function selectionSort(arr, dstArr) {
  const len = arr.length;

  for (let i = 0; i < len - 1; i++) {
    let maxIndex = i;
    for (let j = i + 1; j < len; j++) {
      if (arr[j] > arr[maxIndex]) {
        maxIndex = j; // 保存最大数的下标
      }
    }

    // 交换面积index
    const tmp_index = arr[i];
    arr[i] = arr[maxIndex];
    arr[maxIndex] = tmp_index;

    // 交换人脸框结果
    const tmp = dstArr[i];
    dstArr[i] = dstArr[maxIndex];
    dstArr[maxIndex] = tmp;
  }

  return dstArr;
}

function reshapeArr(arr, splitNum) {
  const newArr = [];
  const len = arr.length;
  for (let i = 0; i < len; i += splitNum) {
    newArr.push(arr.slice(i, i + splitNum)); // 拆成长度为4的二维数组
  }
  return newArr;
}

function getBox(box, indexArr, probs = 'None') {
  const newBox = [];
  const len = indexArr.length;
  for (let i = 0; i < len; i++) {
    newBox.push(box[indexArr[i]]);
  }
  return newBox;
}

function getResult(box, landmark, indexArr, probs = 'None') {
  const newBox = [];
  const len = indexArr.length;
  for (let i = 0; i < len; i++) {
    newBox.push([box[indexArr[i]], landmark[indexArr[i]], probs[indexArr[i]]]);
  }
  return newBox;
}

function hard_nms(boxes, probs, landmarks, iou_threshold, top_k = -1, candidate_size = 200) {
  const picked = [];
  let indexes = [...probs.keys()].sort((a, b) => probs[a] - probs[b]); // 对进行数组排序，返回该数组的索引
  indexes = indexes.slice(-candidate_size); // 保留前200个

  while (indexes.length > 0) {
    const current = indexes.pop();
    picked.push(current);
    if (top_k > 0 == picked.length || indexes.length == 1) {
      break;
    }
    let current_box = boxes[current];

    const rest_boxes = getBox(boxes, indexes);

    current_box = reshapeArr(current_box, 4);

    const iou = iou_process(rest_boxes, current_box);

    var iou_mask = iou.map((item) => (item <= iou_threshold));
    indexes = indexes.filter((item, index) => iou_mask[index]);
  }

  const result = getResult(boxes, landmarks, picked, probs);

  return result;
}

function iou_process(rest_boxes, current_box, eps = 1e-5) {
  const rest_boxes_left_top = rest_boxes.slice(0, rest_boxes.length + 1).map((i) => i.slice(0, 2));
  const current_box_left_top = current_box.slice(0, current_box.length + 1).map((i) => i.slice(0, 2));
  const overlap_left_top = extreNum(rest_boxes_left_top, current_box_left_top, 'max');

  const rest_boxes_right_bottom = rest_boxes.slice(0, rest_boxes.length + 1).map((i) => i.slice(2, 4));
  const current_box_right_bottom = current_box.slice(0, current_box.length + 1).map((i) => i.slice(2, 4));
  const overlap_right_bottom = extreNum(rest_boxes_right_bottom, current_box_right_bottom, 'min');

  const area0 = getArea(rest_boxes_left_top, rest_boxes_right_bottom);
  const area1 = getArea(current_box_left_top, current_box_right_bottom);
  const overlap_area = getArea(overlap_left_top, overlap_right_bottom);

  const iou = getIou(area0, area1, overlap_area, eps);

  return iou;
}

function extreNum(boxes0, boxes1, mode = 'max') {
  const newArr = [];
  if (mode === 'max') {
    for (let i = 0; i < boxes0.length; i++) {
      const result_x = boxes0[i][0] > boxes1[0][0] ? boxes0[i][0] : boxes1[0][0];
      const result_y = boxes0[i][1] > boxes1[0][1] ? boxes0[i][1] : boxes1[0][1];
      newArr.push([result_x, result_y]);
    }
  } else {
    for (let i = 0; i < boxes0.length; i++) {
      const result_x = boxes0[i][0] < boxes1[0][0] ? boxes0[i][0] : boxes1[0][0];
      const result_y = boxes0[i][1] < boxes1[0][1] ? boxes0[i][1] : boxes1[0][1];
      newArr.push([result_x, result_y]);
    }
  }
  return newArr;
}

function getArea(left_top, right_bottom) {
  const resultArr = [];
  for (let i = 0; i < left_top.length; i++) {
    const element_w = right_bottom[i][0] - left_top[i][0] > 0 ? right_bottom[i][0] - left_top[i][0] : 0.0;
    const element_h = right_bottom[i][1] - left_top[i][1] > 0 ? right_bottom[i][1] - left_top[i][1] : 0.0;
    resultArr.push(element_w * element_h);
  }
  return resultArr;
}

function getIou(area0, area1, overlap_area, eps = 1e-5) {
  const resultArr = [];
  for (let i = 0; i < area0.length; i++) {
    const element = overlap_area[i] / (area0[i] + area1[0] - overlap_area[i] + eps);
    resultArr.push(element);
  }
  return resultArr;
}

function create_anchor(height, width) {
  const anchor = [];
  const feature_map = [];
  const steps = [8, 16, 32, 64];
  const min_sizes = [
    [10, 16, 24],
    [32, 48],
    [64, 96],
    [128, 192, 256]
  ];

  for (let i = 0; i < 4; i++) {
    feature_map.push([Math.ceil(height / steps[i]), Math.ceil(width / steps[i])]);
  }

  for (let k = 0; k < feature_map.length; k++) {
    const min_size = min_sizes[k];
    for (let i = 0; i < feature_map[k][0]; i++) {
      for (let j = 0; j < feature_map[k][1]; j++) {
        for (let l = 0; l < min_size.length; l++) {
          const s_kx = min_size[l] * 1.0 / width;
          const s_ky = min_size[l] * 1.0 / height;
          const cx = (j + 0.5) * steps[k] / width;
          const cy = (i + 0.5) * steps[k] / height;
          const axil = [cx, cy, s_kx, s_ky];
          anchor.push(axil);
        }
      }
    }
  }

  return anchor;
}

function decode(anchor, boxes, scores, landmarks, height, width, threshold = 0.02, variance = [0.1, 0.2]) {
  const bbox = [];
  const confidences = [];
  const points = [];

  for (let i = 0; i < anchor.length; i++) {
    if (scores[2 * i + 1] > threshold) {
      const tmp = anchor[i];

      const cx = tmp[0] + boxes[4 * i] * variance[0] * tmp[2];
      const cy = tmp[1] + boxes[4 * i + 1] * variance[0] * tmp[3];
      const sx = tmp[2] * Math.exp(boxes[4 * i + 2] * variance[1]);
      const sy = tmp[3] * Math.exp(boxes[4 * i + 3] * variance[1]);

      // 解码出检测框坐标
      let x1 = (cx - sx / 2) * width;
      if (x1 < 0) {
        x1 = 0;
      }

      let y1 = (cy - sy / 2) * height;
      if (y1 < 0) {
        y1 = 0;
      }

      let x2 = (cx + sx / 2) * width;
      if (x2 > width) {
        x2 = width;
      }

      let y2 = (cy + sy / 2) * height;
      if (y2 > height) {
        y2 = height;
      }
      bbox.push(Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2));

      confidences.push(scores[2 * i], scores[2 * i + 1]);

      // 解码出landmark坐标
      const tmp_point = [];
      for (let j = 0; j < 5; j++) {
        const point_x = (tmp[0] + landmarks[10 * i + 2 * j] * variance[0] * tmp[2]) * width;
        const point_y = (tmp[1] + landmarks[10 * i + 2 * j + 1] * variance[0] * tmp[3]) * height;
        tmp_point.push(Math.round(point_x), Math.round(point_y));
      }
      points.push(tmp_point);
    }
  }
  return [bbox, confidences, points];
}

function filterBox(boxes, image_width, image_height) {
  let faceNumber = 0
  let boxNumber = boxes.length;
  for (let k = 0; k < boxNumber; k++) {
    if (k == 0) {
      faceNumber += 1;
    } else {
      const box = boxes[k][0]
      const face_w = box[2] - box[0];
      const face_h = box[3] - box[1];
      const box_area = face_w * face_h
      const area_proportion = box_area / (image_width * image_height)
      if (area_proportion >= 0.01) {
        faceNumber += 1;
      }
    }
  }
  return faceNumber;
}

module.exports = {
  postpredict,
  rigionpredict,
  create_anchor,
  decode,
  filterBox
};