import os
import torch
from diffusers import (
    StableDiffusionPipeline, 
    StableDiffusionXLPipeline, 
    StableDiffusionImg2ImgPipeline, 
    StableDiffusionXLImg2ImgPipeline,
    AutoencoderKL
)

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
LORA_DIR = os.path.join(os.path.dirname(__file__), "..", "lora")

# Ensure directories exist
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(LORA_DIR, exist_ok=True)

class ModelLoader:
    def __init__(self):
        # Default to cpu if not specified
        requested_device = os.environ.get("DEVICE", "cpu").lower()
        if requested_device == "cuda" and torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"
            
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
                
            # self.pipeline = self.pipeline.to(self.device) # Don't use .to() with offloading
            
            # Memory optimizations
            if self.device == "cuda":
                try:
                    self.pipeline.enable_xformers_memory_efficient_attention()
                except Exception as e:
                    print(f"xformers not available or failed: {e}")
                
                # Check if we should use more aggressive offloading
                use_sequential = os.environ.get("USE_SEQUENTIAL_OFFLOAD", "0") == "1"
                if use_sequential:
                    print("Using Sequential CPU Offload (Aggressive)")
                    self.pipeline.enable_sequential_cpu_offload()
                else:
                    self.pipeline.enable_model_cpu_offload()
            else:
                self.pipeline = self.pipeline.to(self.device)

            self.current_model_path = model_path
            return self.pipeline
            
        except Exception as e:
            print(f"Error loading model: {e}")
            self.pipeline = None
            raise e

    def get_img2img_pipeline(self, is_sdxl: bool = False):
        if self.pipeline is None:
            return None
            
        if is_sdxl:
            return StableDiffusionXLImg2ImgPipeline(**self.pipeline.components)
        else:
            return StableDiffusionImg2ImgPipeline(**self.pipeline.components)

model_loader = ModelLoader()
