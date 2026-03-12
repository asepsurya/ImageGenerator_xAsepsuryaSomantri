import os
import time
import base64
from io import BytesIO
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json

from contextlib import asynccontextmanager
from model_loader import model_loader
from generator import ImageGenerator
from prompt_engine import enhance_prompt, get_random_prompt

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Backend server starting up...")
    yield
    # Shutdown logic
    print("Backend server shutting down...")

app = FastAPI(title="Local AI Image Generator", lifespan=lifespan)

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
    client_id: str | None = None
    image_reference: str | None = None
    strength: float = 0.75

# Manager for WebSockets to send progress
class ConnectionManager:
    def __init__(self):
        # Store connections by client_id
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].remove(websocket)
            if len(self.active_connections[client_id]) == 0:
                self.active_connections.pop(client_id, None)

    async def send_progress(self, progress: int, status: str = "generating", client_id: str | None = None, data: str | None = None):
        if not client_id:
            # Broadcast to all if no client_id (optional fallback)
            for cid in self.active_connections:
                for connection in self.active_connections[cid]:
                    try:
                        await connection.send_json({"progress": progress, "status": status, "data": data})
                    except:
                        pass
            return

        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                try:
                    await connection.send_json({"progress": progress, "status": status, "data": data})
                except:
                    pass

manager = ConnectionManager()
img_generator = ImageGenerator(model_loader)

@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket, client_id: str = "default"):
    await manager.connect(websocket, client_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)

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
    loop = asyncio.get_running_loop()
    client_id = req.client_id
    
    def sync_progress_callback(prog):
        try:
            asyncio.run_coroutine_threadsafe(manager.send_progress(prog, client_id=client_id), loop)
        except RuntimeError:
            pass
            
    await manager.send_progress(0, "starting", client_id=client_id)
    
    try:
        results = []
        # Sequential generation: loop through batch_size
        batch_size = req.batch_size
        base_seed = req.seed if req.seed != -1 else int(time.time() % 100000)
        
        for i in range(batch_size):
            await manager.send_progress(0, f"generating {i+1}/{batch_size}", client_id=client_id)
            
            # Update seed for each image if it's random
            current_seed = base_seed + i
            current_req = req.dict()
            current_req['batch_size'] = 1
            current_req['seed'] = current_seed
            
            images = await loop.run_in_executor(
                None, 
                img_generator.generate,
                current_req,
                sync_progress_callback
            )
            
            if images:
                img = images[0]
                filename = f"out_{int(time.time())}_{current_seed}_{i}.png"
                filepath = os.path.join(OUTPUT_DIR, filename)
                img.save(filepath)
                
                buffered = BytesIO()
                img.save(buffered, format="PNG")
                img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                
                image_data = {"filename": filename, "data": img_str}
                results.append(image_data)
                
                # Send immediate update with the new image
                await manager.send_progress(100, f"finished {i+1}/{batch_size}", client_id=client_id, data=img_str)
        
        await manager.send_progress(100, "done", client_id=client_id)
        return {"images": results}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        await manager.send_progress(0, f"error: {str(e)}", client_id=client_id)
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    from dotenv import load_dotenv
    load_dotenv()
    
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    
    try:
        uvicorn.run(app, host=host, port=port)
    except KeyboardInterrupt:
        print("\nStopping server...")
