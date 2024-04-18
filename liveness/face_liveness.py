import cv2
import tempfile
import base64
import numpy as np
from typing import List
from modelscope.pipelines import pipeline
from modelscope.utils.constant import Tasks
from tempfile import NamedTemporaryFile

# ref: https://modelscope.cn/models?name=%E6%B4%BB%E4%BD%93&page=1
face_liveness_xc = pipeline(Tasks.face_liveness, 'damo/cv_manual_face-liveness_flxc')

# 活体阈值分
threshold = 0.5


# 推理
def infer(img0, img1, video):
    #  对最佳活体照进行MD5校验并留底（因此处仅为演示代码，故省略）
    decode_base64_to_image(img0)

    #  校验眨眼照（因此处仅为演示代码，故省略）
    decode_base64_to_image(img1)

    # 活体视频校验，理论上还应对前端传入的光序列做校验，此处简化
    img_list = decode_base64_to_video(video)

    responses = face_liveness_xc(img_list)
    average_score = sum(responses[i]['scores'][0] for i in range(3)) / 3
    if average_score > threshold:
        return True
    return False


def decode_base64_to_image(base64_str: str) -> np.ndarray:
    try:
        # Decode base64 to bytes
        img_bytes = base64.b64decode(base64_str)
        # Convert bytes data to a numpy array
        img_array = np.fromstring(img_bytes, np.uint8)
        # Convert numpy array to OpenCV Image
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        raise ValueError("Invalid base64 string") from e


def decode_base64_to_video(base64_str: str) -> List[np.ndarray]:
    try:
        with NamedTemporaryFile(suffix='.mp4', delete=True) as temp_video:
            # Decode base64 to bytes and write to the temporary file
            video_bytes = base64.b64decode(base64_str)
            temp_video.write(video_bytes)
            temp_video.flush()  # Flush to make sure all data is written

            # Extract frames
            return extract_frames_from_video(temp_video.name, num_frames=3)
    except ValueError as e:
        raise ValueError("Invalid base64 data for video") from e


def extract_frames_from_video(video_path: str, num_frames: int) -> List[np.ndarray]:
    video_cap = cv2.VideoCapture(video_path)
    frame_count = int(video_cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frames_step = frame_count // num_frames
    frames = []

    for i in range(num_frames):
        # Set video position and read frame
        video_cap.set(cv2.CAP_PROP_POS_FRAMES, i * frames_step)
        success, frame = video_cap.read()
        if success:
            frames.append(frame)
        else:
            break

    video_cap.release()
    # os.remove(video_path)

    return frames
