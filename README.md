# 光线活体小程序

## 项目简介

实现眨眼——光线活体检测。  
前置背景知识可参考博客[红尘客栈](https://www.hckz.fun/2024/03/28/%E5%9B%BE%E5%83%8F%E5%8F%8D%E6%AC%BA%E8%AF%88/)。

## 目录结构
```
liveness-miniprogram/
│
├── miniprogram/ — 小程序前端代码
│   ├── components — 小程序组件 
│   ├── images — 页面相关图标
│   ├── pages — 项目页面
│   └── utils - 项目工具函数
│
└── liveness/ — python后端代码
    ├── face_liveness.py — 活体检测功能
    ├── main.py — fastAPI入口
    └── test.py — 测试脚本
```
## 页面展示
![认证流程](https://hckz-1259319636.cos.ap-guangzhou.myqcloud.com/imgs/blog/%E6%B4%BB%E4%BD%93%E5%B0%8F%E7%A8%8B%E5%BA%8F.png)

## 功能流程图
*前端模型流程图*  
<img src=https://hckz-1259319636.cos.ap-guangzhou.myqcloud.com/imgs/blog/%E6%B4%BB%E4%BD%93%E6%A3%80%E6%B5%8B%E5%89%8D%E7%AB%AF%E6%A8%A1%E5%9E%8B%E6%B5%81%E7%A8%8B%E5%9B%BE.png width=50% />

*后端模型流程图*  
<img src=https://hckz-1259319636.cos.ap-guangzhou.myqcloud.com/imgs/blog/%E6%B4%BB%E4%BD%93%E6%A3%80%E6%B5%8B%E5%90%8E%E7%AB%AF%E6%B5%81%E7%A8%8B%E5%9B%BE.png width=50% />

## 快速开始

要在本地运行光线活体小程序，请按照以下步骤操作：

1. 克隆仓库

   ```
   git clone https://github.com/MultiChen/liveness-miniprogram.git
   ```

2. 启动后台应用

   ```
   cd liveness-miniprogram/liveness
   pip install -r requirements.txt
   python main.py
   ```

3. 启动小程序
   - [打开微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
   - 导入项目
   - 修改app.js中url为你本地ip
   - 启用真机调试-->选择局域网模式-->勾选不校验HTTPS证书
   


## 许可

[MIT](LICENSE) &copy; [MultiChen]
