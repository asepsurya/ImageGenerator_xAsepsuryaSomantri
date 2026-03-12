import os
import time
import base64
from io import BytesIO
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json

from model_loader import model_loader
from generator import ImageGenerator
from prompt_engine import enhance_prompt, get_random_prompt

app = FastAPI(title="Local AI Image Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "AI Image Generator Backend is running! Please run the frontend (npm run dev) to access the UI, or visit /docs for the API documentation."}

class GenerateRequest(BaseModel):
    model: str
    prompt: str
    negative_prompt: str = ""
    style: str | None = None
    resolution: list[int] = [512, 512]
    cfg_scale: float = 7.5
    steps: int = 20
    seed: int = -1
    batch_size: int = 1

# Manager for WebSockets to send progress
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_progress(self, progress: int, status: str = "generating"):
        for connection in self.active_connections:
            try:
                await connection.send_json({"progress": progress, "status": status})
            except:
                pass

manager = ConnectionManager()
img_generator = ImageGenerator(model_loader)

@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/models")
def get_models():
    model_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    lora_dir = os.path.join(os.path.dirname(__file__), "..", "lora")
    
    models = []
    if os.path.exists(model_dir):
        models = [f for f in os.listdir(model_dir) if f.endswith(('.safetensors', '.ckpt'))]
        
    loras = []
    if os.path.exists(lora_dir):
        loras = [f for f in os.listdir(lora_dir) if f.endswith('.safetensors')]
        
    return {"models": models, "loras": loras}

@app.get("/api/prompt/random")
def random_prompt():
    return {"prompt": get_random_prompt()}

@app.post("/api/prompt/enhance")
def enhance(prompt: str, style: str | None = None):
    return {"enhanced_prompt": enhance_prompt(prompt, style)}

@app.post("/api/generate")
async def generate_images(req: GenerateRequest):
    # This might block everything, ideally should run in thread pool
    # but for local usage it's okay for now.
    loop = asyncio.get_running_loop()
    
    def sync_progress_callback(prog):
        try:
            # We must use run_coroutine_threadsafe because this callback runs in a separate thread
            asyncio.run_coroutine_threadsafe(manager.send_progress(prog), loop)
        except RuntimeError:
            pass
            
    await manager.send_progress(0, "starting")
    
    try:
        # Run the blocking generation in a threadpool so we don't block the async event loop
        loop = asyncio.get_running_loop()
        images = await loop.run_in_executor(
            None, 
            lambda: img_generator.generate(req.dict(), callback=sync_progress_callback)
        )
        
        results = []
        for i, img in enumerate(images):
            # Save to disk
            filename = f"out_{int(time.time())}_{req.seed}_{i}.png"
            filepath = os.path.join(OUTPUT_DIR, filename)
            img.save(filepath)
            
            # Convert to base64 for quick preview frontend rendering
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
            results.append({"filename": filename, "data": img_str})
            
        await manager.send_progress(100, "done")
        return {"images": results}
        
    except Exception as e:
        await manager.send_progress(0, f"error: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
