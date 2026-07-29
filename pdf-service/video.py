"""BookBunny Video Service - Generate animated book videos"""
import json
import sys
import base64
import os
import tempfile
import subprocess

# Try to use ffmpeg
HAVE_FFMPEG = False
try:
    subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    HAVE_FFMPEG = True
except (subprocess.CalledProcessError, FileNotFoundError):
    pass


def generate_video(book_data: dict, output_path: str) -> str:
    """Generate an animated video from book pages using FFmpeg"""
    pages = book_data.get("pages", [])
    title = book_data.get("title", "My Story")

    if not HAVE_FFMPEG:
        # Return a playlist HTML as fallback
        html = generate_video_playlist(book_data)
        html_path = output_path.replace('.mp4', '.html')
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        return html_path

    # Create temp dir for frame images
    with tempfile.TemporaryDirectory() as tmpdir:
        frame_paths = []
        for i, page in enumerate(pages):
            text = page.get("text", "") if isinstance(page, dict) else page
            image_b64 = page.get("imageB64") if isinstance(page, dict) else None
            frame_path = os.path.join(tmpdir, f"frame_{i:04d}.png")
            generate_frame(text, i + 1, len(pages), frame_path, image_b64)
            frame_paths.append(frame_path)

        # Use FFmpeg to stitch frames into video
        # 2 seconds per page, 24fps
        input_list = os.path.join(tmpdir, "input.txt")
        with open(input_list, 'w', encoding='utf-8') as f:
            for fp in frame_paths:
                f.write(f"file '{fp}'\n")
                f.write("duration 2\n")
            # Last frame needs extra entry
            f.write(f"file '{frame_paths[-1]}'\n")

        cmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', input_list,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-r', '24',
            '-vf', 'fps=24,format=yuv420p',
            output_path
        ]
        subprocess.run(cmd, capture_output=True, check=True)

    return output_path


def generate_frame(text: str, page_num: int, total_pages: int, output_path: str, image_b64: str = None):
    """Generate a single video frame using PIL"""
    from PIL import Image, ImageDraw, ImageFont
    import io

    size = (1080, 1080)

    # If we have an image, use it as background
    if image_b64:
        try:
            img_data = base64.b64decode(image_b64)
            img = Image.open(io.BytesIO(img_data)).convert('RGB')
            img = img.resize(size, Image.LANCZOS)
        except Exception:
            img = Image.new('RGB', size, '#FFF5EE')
    else:
        img = Image.new('RGB', size, '#FFF5EE')

    draw = ImageDraw.Draw(img)

    # Try to load a font (cross-platform)
    font_size = 36
    font = None
    for font_path in [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',  # Linux
        'C:\\Windows\\Fonts\\arial.ttf',  # Windows
        '/System/Library/Fonts/Helvetica.ttc',  # macOS
    ]:
        try:
            font = ImageFont.truetype(font_path, font_size)
            break
        except Exception:
            continue
    if not font:
        font = ImageFont.load_default()

    # Draw semi-transparent overlay for text readability
    overlay = Image.new('RGBA', size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    # Bottom gradient overlay
    for y in range(size[1] // 2, size[1]):
        alpha = int(((y - size[1] // 2) / (size[1] // 2)) * 180)
        overlay_draw.rectangle([0, y, size[0], y + 1], fill=(0, 0, 0, alpha))
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    # Word wrap text
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        current_line.append(word)
        test_line = ' '.join(current_line)
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] > 900:
            current_line.pop()
            lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))

    # Draw text at bottom
    total_height = len(lines) * (font_size + 10)
    start_y = size[1] - total_height - 80
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        x = (size[0] - bbox[2]) // 2
        y = start_y + i * (font_size + 10)
        # White text with shadow
        draw.text((x + 2, y + 2), line, fill=(0, 0, 0), font=font)
        draw.text((x, y), line, fill='white', font=font)

    # Page number
    page_text = f"{page_num} / {total_pages}"
    bbox = draw.textbbox((0, 0), page_text, font=font)
    draw.text((size[0] - bbox[2] - 40, size[1] - 60), page_text, fill='white', font=font)

    img.save(output_path, 'PNG')


def generate_video_playlist(book_data: dict) -> str:
    """Generate an HTML page that works as a video-like slideshow (fallback)"""
    pages = book_data.get("pages", [])
    title = book_data.get("title", "My Story")

    items_html = ""
    for i, page in enumerate(pages):
        text = page.get("text", "") if isinstance(page, dict) else page
        image_b64 = page.get("imageB64") if isinstance(page, dict) else None

        if image_b64:
            bg_style = f"background-image: url(data:image/png;base64,{image_b64}); background-size: cover;"
        else:
            bg_style = "background: #FFF5EE;"

        items_html += f"""
        <div class="slide" data-index="{i}" style="{bg_style}">
            <div class="slide-overlay">
                <div class="page-num">{i+1} / {len(pages)}</div>
                <p class="slide-text">{text}</p>
            </div>
        </div>"""

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title} - Video</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ background: #1a1a2e; display: flex; flex-direction: column; justify-content: center;
          align-items: center; min-height: 100vh; font-family: Inter, sans-serif; padding: 20px; }}
  .player {{ width: 720px; height: 720px; position: relative; background: #FFF5EE;
             border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }}
  .slide {{ position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; align-items: flex-end; justify-content: center;
            opacity: 0; transition: opacity 0.8s; padding: 60px; }}
  .slide.active {{ opacity: 1; }}
  .slide-overlay {{ background: linear-gradient(transparent, rgba(0,0,0,0.7));
                    width: 100%; padding: 30px; text-align: center; }}
  .slide-text {{ font-size: 24pt; color: white; line-height: 1.6; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }}
  .page-num {{ font-size: 14pt; color: rgba(255,255,255,0.8); margin-bottom: 12px; }}
  .controls {{ margin-top: 20px; text-align: center; }}
  button {{ background: #FF6B8A; color: white; border: none; padding: 10px 24px;
            border-radius: 12px; font-size: 16px; cursor: pointer; margin: 0 5px; }}
  button:hover {{ background: #FF5577; }}
</style></head><body>
<div>
  <div class="player" id="player">{items_html}</div>
  <div class="controls">
    <button onclick="prevSlide()">Prev</button>
    <button onclick="togglePlay()" id="playBtn">Play</button>
    <button onclick="nextSlide()">Next</button>
  </div>
</div>
<script>
  let current = 0; let playing = false; let timer = null;
  const slides = document.querySelectorAll('.slide');
  if (slides.length > 0) slides[0].classList.add('active');
  function show(n) {{
    slides.forEach(s => s.classList.remove('active'));
    current = (n + slides.length) % slides.length;
    slides[current].classList.add('active');
  }}
  function nextSlide() {{ show(current + 1); }}
  function prevSlide() {{ show(current - 1); }}
  function togglePlay() {{
    playing = !playing;
    const btn = document.getElementById('playBtn');
    btn.textContent = playing ? 'Pause' : 'Play';
    if (playing) {{
      timer = setInterval(nextSlide, 3000);
    }} else {{
      clearInterval(timer);
    }}
  }}
</script>
</body></html>"""


if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
        output = sys.argv[2] if len(sys.argv) > 2 else sys.argv[1].replace('.json', '.mp4')
        result = generate_video(data, output)
        print(json.dumps({"success": True, "path": result}))
    else:
        data = json.load(sys.stdin)
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
            output = generate_video(data, tmp.name)
            with open(output, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode()
            print(json.dumps({"success": True, "video_b64": b64, "path": output}))
