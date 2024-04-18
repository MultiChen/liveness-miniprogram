from fastapi import FastAPI, Form
from pydantic import BaseModel
from face_liveness import infer
from fastapi import Request, HTTPException
from json import JSONDecodeError

app = FastAPI()


class ImageVideoRequest(BaseModel):
    active_face_photo_base64: str
    blink_photo_base64: str
    live_video_base64: str


@app.post("/face_liveness")
async def face_liveness(active_face_photo_base64: str = Form(...), blink_photo_base64: str = Form(...),
                        live_video_base64: str = Form(...)):
    # return ImageVideoRequest(active_face_photo_base64=active_face_photo_base64, blink_photo_base64=blink_photo_base64,
    #                          live_video_base64=live_video_base64)
    # return 'success'
    return infer(active_face_photo_base64, blink_photo_base64, live_video_base64)


# POST 请求
@app.post("/items")
async def create_item(item: str = Form(None)):
    return {"message": "Item created successfully: {}".format(str(item))}


@app.post('/')
async def main(request: Request):
    content_type = request.headers.get('Content-Type')

    if content_type is None:
        raise HTTPException(status_code=400, detail='No Content-Type provided')
    elif content_type == 'application/json':
        try:
            return await request.json()
        except JSONDecodeError:
            raise HTTPException(status_code=400, detail='Invalid JSON data')
    else:
        raise HTTPException(status_code=400, detail='Content-Type not supported')


if __name__ == "__main__":
    import uvicorn

    print('start')
    uvicorn.run(app, host="0.0.0.0", port=8000)
