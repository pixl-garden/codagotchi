import sys
from PIL import Image
import json

def process_spritesheet(file_path, sprite_width, sprite_height, output_file):
    # Load the image
    image = Image.open(file_path)
    width, height = image.size
    
    # Prepare to iterate over each sprite
    sprites = {}
    for y in range(0, height, sprite_height):
        for x in range(0, width, sprite_width):
            sprite = image.crop((x, y, x + sprite_width, y + sprite_height))
            x_trim, y_trim = get_trim_dimensions(sprite)
            
            sprite_index = len(sprites)
            sprites[str(sprite_index)] = {
                "displayName": "",
                "spriteSheet": file_path,
                "xTrim": x_trim + 1,
                "yTrim": y_trim + 1,
                "states": {"default": [sprite_index]}
            }

    # Save the result to a JSON file
    with open(output_file, 'w') as f:
        json.dump(sprites, f, indent=4)

def get_trim_dimensions(sprite):
    # Convert to RGBA if not already in that mode
    if sprite.mode != 'RGBA':
        sprite = sprite.convert('RGBA')

    right, bottom = 0, 0
    for x in range(sprite.width):
        for y in range(sprite.height):
            r, g, b, a = sprite.getpixel((x, y))
            if a != 0:  # Not transparent
                if x > right:
                    right = x
                if y > bottom:
                    bottom = y
    return right, bottom

if __name__ == "__main__":
    input_file = sys.argv[1]
    sprite_x_dim = int(sys.argv[2])
    sprite_y_dim = int(sys.argv[3])
    output_file_name = sys.argv[4]
    process_spritesheet(input_file, sprite_x_dim, sprite_y_dim, output_file_name)
