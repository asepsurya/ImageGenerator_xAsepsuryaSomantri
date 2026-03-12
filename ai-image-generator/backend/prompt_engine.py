import random

STYLE_PRESETS = {
    "cinematic": "cinematic lighting, ultra detailed, 8k resolution, highly detailed, photorealistic, dramatic movie still, blockbuster",
    "anime": "anime artwork, anime style, highly detailed, vibrant colors, studio ghibli, makoto shinkai, intricate details",
    "realistic": "realistic portrait, canon eos, sharp focus, 8k uhd, dslr, soft lighting, award winning photography",
    "cyberpunk": "cyberpunk style, neon city, dark futuristic, glowing lights, highly detailed, intricate cityscapes, dystopian",
    "fantasy": "epic fantasy art, magical, ethereal, highly detailed, artstation, digital painting, fantasy concept art",
    "3d render": "3d render, octane render, unreal engine 5, ray tracing, super detailed, crisp lighting, 4k"
}

def enhance_prompt(base_prompt: str, style: str | None = None) -> str:
    """
    Enhances the base prompt based on selected style, similar to Midjourney.
    """
    prompt = base_prompt.strip()
    
    if style and style.lower() in STYLE_PRESETS:
        preset_tags = STYLE_PRESETS[style.lower()]
        prompt = f"{prompt}, {preset_tags}"
        
    # Additional randomizer could go here
    return prompt

def get_random_prompt() -> str:
    prompts = [
        "A cyberpunk cat warrior with glowing swords",
        "A mystical forest floating in the sky with glowing waterfalls",
        "An astronaut riding a futuristic motorcycle on Mars",
        "A highly detailed portrait of a steampunk queen",
        "A neon-lit futuristic ramen shop in a rainy city"
    ]
    return random.choice(prompts)
