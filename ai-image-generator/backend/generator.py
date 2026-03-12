import torch
from prompt_engine import enhance_prompt
import base64
from io import BytesIO
from PIL import Image

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
        image_reference = params.get("image_reference", None)
        strength = params.get("strength", 0.75)
        
        # Build absolute model path
        import os
        model_path = os.path.join(os.path.dirname(__file__), "..", "models", model_name)
        
        # Is SDXL
        is_sdxl = "xl" in model_name.lower()
        
        pipeline = self.model_loader.load_model(model_path, is_sdxl=is_sdxl)
        
        if pipeline is None:
            raise Exception("Model could not be loaded")

        # Switch to Img2Img if image reference is provided
        ref_image = None
        if image_reference:
            print("Reference image detected, switching to Img2Img")
            try:
                # Remove header if present (e.g. data:image/png;base64,)
                if "," in image_reference:
                    image_reference = image_reference.split(",")[1]
                
                img_data = base64.b64decode(image_reference)
                ref_image = Image.open(BytesIO(img_data)).convert("RGB")
                # Resize if necessary or keep original? Usually better to match requested width/height
                ref_image = ref_image.resize((width, height), Image.LANCZOS)
                
                pipeline = self.model_loader.get_img2img_pipeline(is_sdxl=is_sdxl)
            except Exception as e:
                print(f"Error processing reference image: {e}")
                # Fallback to text2img if image processing fails
            
        enhanced_prompt = enhance_prompt(prompt, style)
        
        generator = None
        if seed != -1:
            generator = torch.Generator(device=self.model_loader.device).manual_seed(seed)
            
        def step_callback(step, timestep, latents):
            if callback:
                progress = int((step / steps) * 100)
                callback(progress)
                
        # Modern callback support for diffusers >= 0.21.0
        # We try to use callback_on_step_end if the pipeline supports it, 
        # otherwise fall back to the old callback
        
        callback_args = {
            "prompt": enhanced_prompt,
            "negative_prompt": negative_prompt,
            "num_inference_steps": steps,
            "guidance_scale": cfg_scale,
            "width": width,
            "height": height,
            "num_images_per_prompt": batch_size,
            "generator": generator,
        }

        if ref_image:
            callback_args["image"] = ref_image
            callback_args["strength"] = strength
        
        # Checking for modern callback support
        use_modern_callback = False
        try:
            # Simple check if current diffusers version likely supports it
            import diffusers
            from packaging import version
            if version.parse(diffusers.__version__) >= version.parse("0.21.0"):
                use_modern_callback = True
        except:
            pass

        print(f"Starting generation: {steps} steps, {width}x{height}, batch={batch_size}")
        
        if use_modern_callback:
            def callback_on_step_end(pipe, i, t, callback_kwargs):
                if callback:
                    prog = int((i / steps) * 100)
                    callback(prog)
                return callback_kwargs
            
            callback_args["callback_on_step_end"] = callback_on_step_end
        else:
            callback_args["callback"] = step_callback
            callback_args["callback_steps"] = 1

        output = pipeline(**callback_args)
        print("Generation cycle completed on backend.")
        return output.images
