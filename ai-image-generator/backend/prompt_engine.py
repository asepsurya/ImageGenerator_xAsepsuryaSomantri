import random

STYLE_PRESETS = {
    "cinematic": "cinematic lighting, ultra detailed, 8k resolution, highly detailed, photorealistic, dramatic movie still, blockbuster",
    "anime": "anime artwork, anime style, highly detailed, vibrant colors, studio ghibli, makoto shinkai, intricate details",
    "realistic": "realistic portrait, canon eos, sharp focus, 8k uhd, dslr, soft lighting, award winning photography",
    "cyberpunk": "cyberpunk style, neon city, dark futuristic, glowing lights, highly detailed, intricate cityscapes, dystopian",
    "fantasy": "epic fantasy art, magical, ethereal, highly detailed, artstation, digital painting, fantasy concept art",
    "3d render": "3d render, octane render, unreal engine 5, ray tracing, super detailed, crisp lighting, 4k",
    "product": "professional product photography, studio lighting, clean background, 8k resolution, sharp focus, high quality, commercial jewelry photography, product showcase",
    "affiliate": "lifestyle photography, engaging social media style, bright and airy, natural lighting, high quality, appealing for marketing, user review style",
    "poster": "professional marketing poster, graphic design, typographic elements, bold colors, commercial advertising style, cinematic composition, high impact visual"
}

def enhance_prompt(base_prompt: str, style: str | None = None) -> str:
    """
    Enhances the base prompt based on selected style and cleans up the input.
    Ensures the final prompt stays within CLIP token limits while preserving user intent.
    """
    # 1. Clean up base prompt
    base = base_prompt.strip()
    # Normalize spaces and commas
    import re
    base = re.sub(r'\s+', ' ', base)
    base = re.sub(r',(\s*,)+', ',', base)
    
    # 2. Get style tags
    preset_tags = ""
    if style and style.lower() in STYLE_PRESETS:
        preset_tags = STYLE_PRESETS[style.lower()]
    
    # 3. Intelligent Truncation to fit CLIP 77 tokens
    # We prioritize the user's base description, but want some style too.
    # A safe word limit for 77 tokens is around 65-70 words.
    
    if preset_tags:
        # If we have both, we need to balance them
        style_words = preset_tags.split(', ')
        base_words = base.split()
        
        # Limit base prompt if it's extremely long (e.g. over 50 words)
        if len(base_words) > 50:
            base_words = base_words[:50]
            base = " ".join(base_words)
            print(f"Note: User prompt was very long, prioritized first 50 words.")
        
        # Combine
        combined = f"{base}, {preset_tags}"
        
        # Final safety check on total words
        final_words = combined.split()
        if len(final_words) > 70:
            final_words = final_words[:70]
            combined = " ".join(final_words)
            
        return combined
    
    # No style selected, just clean and safety truncate
    final_words = base.split()
    if len(final_words) > 70:
        final_words = final_words[:70]
        base = " ".join(final_words)
        
    return base

def get_random_prompt() -> str:
    prompts = [
        "A cyberpunk cat warrior with glowing swords",
        "A mystical forest floating in the sky with glowing waterfalls",
        "An astronaut riding a futuristic motorcycle on Mars",
        "A highly detailed portrait of a steampunk queen",
        "A neon-lit futuristic ramen shop in a rainy city",

        "A giant dragon flying over a futuristic city at sunset",
        "A magical library with floating books and glowing runes",
        "A samurai standing in a field of cherry blossoms during sunset",
        "A cyberpunk street market full of neon lights and robots",
        "A mysterious wizard casting spells in a dark enchanted forest",
        "A futuristic train traveling through a glowing cyberpunk city",
        "A medieval knight riding a horse through a foggy battlefield",
        "A realistic portrait of a Viking warrior with detailed armor",
        "A surreal landscape with giant floating jellyfish in the sky",
        "A futuristic robot chef cooking in a high-tech kitchen",
        "A glowing crystal cave deep underground with magical energy",
        "A space station orbiting a colorful alien planet",
        "A fantasy castle floating above the clouds at sunrise",
        "A cyberpunk hacker surrounded by holographic screens",
        "A majestic phoenix rising from flames in a dark sky",
        "A futuristic city built inside a giant glass dome",
        "A magical deer made of glowing light standing in a forest",
        "A warrior princess holding a glowing sword on a mountain",
        "A futuristic drone delivery system flying over a city",
        "A mysterious portal opening in the middle of a desert",
        "A deep sea underwater kingdom with glowing coral",
        "A giant ancient tree with houses built in its branches",
        "A cyberpunk motorcycle racer speeding through neon streets",
        "A fantasy ice kingdom with crystal towers and snow dragons",
        "A steampunk airship flying through golden clouds",
        "A futuristic soldier in advanced exoskeleton armor",
        "A magical potion shop filled with glowing bottles",
        "A time traveler standing in front of a glowing portal",
        "A peaceful village hidden inside a giant canyon",
        "A robot gardener taking care of glowing alien plants"
    ]
    return random.choice(prompts)
