import os
import torch
from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline, AutoencoderKL

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
LORA_DIR = os.path.join(os.path.dirname(__file__), "..", "lora")

# Ensure directories exist
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(LORA_DIR, exist_ok=True)

class ModelLoader:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.pipeline = None
        self.current_model_path = None
        
    def load_model(self, model_path: str, is_sdxl: bool = False):
        if self.current_model_path == model_path and self.pipeline is not None:
            return self.pipeline
            
        print(f"Loading model: {model_path} on {self.device}")
        
        try:
            if is_sdxl:
                self.pipeline = StableDiffusionXLPipeline.from_single_file(
                    model_path, 
                    torch_dtype=self.torch_dtype, 
                    use_safetensors=True
                )
            else:
                self.pipeline = StableDiffusionPipeline.from_single_file(
                    model_path, 
                    torch_dtype=self.torch_dtype, 
                    use_safetensors=True
                )
                
            self.pipeline = self.pipeline.to(self.device)
            
            # Memory optimizations
            if self.device == "cuda":
                try:
                    self.pipeline.enable_xformers_memory_efficient_attention()
                except Exception as e:
                    print(f"xformers not available or failed: {e}")
                self.pipeline.enable_model_cpu_offload()

            self.current_model_path = model_path
            return self.pipeline
            
        except Exception as e:
            print(f"Error loading model: {e}")
            self.pipeline = None
            raise e

model_loader = ModelLoader()
