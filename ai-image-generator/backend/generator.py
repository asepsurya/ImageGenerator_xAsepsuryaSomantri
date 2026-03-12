import torch
from prompt_engine import enhance_prompt

class ImageGenerator:
    def __init__(self, model_loader_instance):
        self.model_loader = model_loader_instance
        
    def generate(self, params: dict, callback=None):
        model_name = params.get("model", "")
        prompt = params.get("prompt", "")
        negative_prompt = params.get("negative_prompt", "")
        style = params.get("style", None)
        width, height = params.get("resolution", (512, 512))
        cfg_scale = params.get("cfg_scale", 7.5)
        steps = params.get("steps", 20)
        seed = params.get("seed", -1)
        batch_size = params.get("batch_size", 1)
        
        # Build absolute model path
        import os
        model_path = os.path.join(os.path.dirname(__file__), "..", "models", model_name)
        
        # Is SDXL
        is_sdxl = "xl" in model_name.lower()
        
        pipeline = self.model_loader.load_model(model_path, is_sdxl=is_sdxl)
        
        if pipeline is None:
            raise Exception("Model could not be loaded")
            
        enhanced_prompt = enhance_prompt(prompt, style)
        
        generator = None
        if seed != -1:
            generator = torch.Generator(device=self.model_loader.device).manual_seed(seed)
            
        def step_callback(step, timestep, latents):
            if callback:
                progress = int((step / steps) * 100)
                callback(progress)
                
        images = pipeline(
            prompt=enhanced_prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=steps,
            guidance_scale=cfg_scale,
            width=width,
            height=height,
            num_images_per_prompt=batch_size,
            generator=generator,
            callback=step_callback if callback else None,
            callback_steps=1 if callback else None
        ).images
        
        return images
