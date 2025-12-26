import os
import sys
import hashlib
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# 验证启动token
def verify_startup_token():
    """验证启动token，确保只能通过前端启动"""
    token = os.environ.get('FASTAPI_STARTUP_TOKEN')
    if not token:
        print("错误：缺少启动token，此应用只能通过前端启动")
        sys.exit(1)
    
    # 验证token格式和时效性（token包含时间戳）
    try:
        timestamp_str, hash_part = token.split('_', 1)
        timestamp = int(timestamp_str)
        current_time = int(time.time())
        
        # token有效期为60秒
        if current_time - timestamp > 60:
            print("错误：启动token已过期")
            sys.exit(1)
            
        # 验证hash
        expected_hash = hashlib.sha256(f"fastapi_startup_{timestamp}".encode()).hexdigest()[:16]
        if hash_part != expected_hash:
            print("错误：无效的启动token")
            sys.exit(1)
            
        print("启动token验证成功")
        
    except (ValueError, IndexError):
        print("错误：启动token格式无效")
        sys.exit(1)

# 在创建FastAPI应用前验证token
verify_startup_token()

app = FastAPI()

# 添加CORS中间件，允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，在生产环境中应该限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有HTTP方法
    allow_headers=["*"],  # 允许所有HTTP头
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
