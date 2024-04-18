import requests


def post(text):
    url = 'http://localhost:8000/face_liveness'

    # 构建请求数据
    payload = {
        'active_face_photo_base64': 'str',
        'blink_photo_base64': 'str',
        'live_video_base64': 'str'
    }

    # url = 'http://127.0.0.1:8000'
    # data = {'user': 'Smith'}
    # payload = {'user': 'foo'}

    # 发送 post 请求
    response = requests.post(url=url, data=payload, headers={'content-type': 'application/x-www-form-urlencoded'},
                             timeout=10)

    # 检查响应状态
    if response.status_code == 200:
        print('请求成功')
        print(response.json())
    else:
        print('请求失败，状态码：', response.status_code)


post('1234')
