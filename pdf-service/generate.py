"""BookBunny PDF Service - KDP-ready children's book PDF generation"""
import os
import sys
import json
import tempfile
from pathlib import Path
import base64

# Try WeasyPrint, fallback to reportlab
try:
    from weasyprint import HTML
    HAVE_WEASYPRINT = True
except ImportError:
    HAVE_WEASYPRINT = False

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Image, PageBreak, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    HAVE_REPORTLAB = True
except ImportError:
    HAVE_REPORTLAB = False


KDP_SIZES = {
    "8.5x8.5": (8.5 * inch, 8.5 * inch),
    "8x10": (8 * inch, 10 * inch),
    "7x10": (7 * inch, 10 * inch),
    "6x9": (6 * inch, 9 * inch),
}


def generate_kdp_html(book_data: dict) -> str:
    """Generate a KDP-ready HTML with proper bleeds and trim marks"""
    pages = book_data.get("pages", [])
    title = book_data.get("title", "My Story")
    author = book_data.get("author", "BookBunny")
    size = book_data.get("size", "8.5x8.5")
    bleed = 0.125  # 3mm bleed in inches

    if size in KDP_SIZES:
        w, h = KDP_SIZES[size]
    else:
        w, h = KDP_SIZES["8.5x8.5"]

    # CSS for print
    css = f"""
    @page {{
        size: {w:.2f}in {h:.2f}in;
        margin: 0;
        bleed: {bleed}in;
    }}
    @page:first {{
        @top-left {{ content: none; }}
        @bottom-center {{ content: none; }}
    }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: 'Inter', 'Helvetica Neue', sans-serif; }}
    .page {{
        width: {w:.2f}in;
        height: {h:.2f}in;
        position: relative;
        overflow: hidden;
        page-break-after: always;
        background: #FFF5EE;
    }}
    .bleed-area {{
        position: absolute;
        top: {bleed}in;
        left: {bleed}in;
        right: {bleed}in;
        bottom: {bleed}in;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 0.5in;
    }}
    .cover {{
        background: linear-gradient(135deg, #FF6B8A 0%, #C8A2E8 50%, #87CEEB 100%);
    }}
    .cover h1 {{
        font-size: 42pt;
        color: white;
        text-align: center;
        font-weight: 800;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }}
    .cover .subtitle {{
        font-size: 16pt;
        color: rgba(255,255,255,0.9);
        text-align: center;
        margin-top: 20px;
    }}
    .text-page {{
        background: #FFF5EE;
    }}
    .text-page .page-text {{
        font-size: 18pt;
        color: #2D2D2D;
        line-height: 1.8;
        text-align: center;
        max-width: 5in;
        font-weight: 500;
    }}
    .text-page .page-num {{
        position: absolute;
        bottom: 0.3in;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 10pt;
        color: #C8A2E8;
    }}
    .image-placeholder {{
        width: 4in;
        height: 4in;
        border-radius: 20px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 60pt;
    }}
    .end-page {{
        background: linear-gradient(135deg, #87CEEB 0%, #C8A2E8 50%, #FF6B8A 100%);
    }}
    .end-page h2 {{
        font-size: 36pt;
        color: white;
        text-align: center;
    }}
    """

    # Build pages HTML
    cover_html = f"""
    <div class="page cover">
        <div class="bleed-area">
            <div style="font-size:80pt;margin-bottom:20px;">📖</div>
            <h1>{title}</h1>
            <p class="subtitle">by {author}</p>
            <p style="color:rgba(255,255,255,0.6);font-size:11pt;margin-top:60px;">Created with BookBunny</p>
        </div>
    </div>"""

    content_html = ""
    for i, page in enumerate(pages):
        text = page.get("text", "")
        chars = page.get("characters", [])
        image_b64 = page.get("imageB64")
        char_emojis = " ".join(["🐰"] * len(chars))

        # Use embedded image if available, otherwise show emoji placeholder
        if image_b64:
            image_html = f'<img src="data:image/png;base64,{image_b64}" style="width:4in;height:4in;border-radius:20px;margin-bottom:20px;object-fit:cover;" />'
        else:
            image_html = f'<div class="image-placeholder" style="background:#FFF;">{char_emojis or "🌈"}</div>'

        content_html += f"""
        <div class="page text-page">
            <div class="bleed-area">
                {image_html}
                <div class="page-text">{text}</div>
                <div class="page-num">{i + 1}</div>
            </div>
        </div>"""

    end_html = f"""
    <div class="page end-page">
        <div class="bleed-area">
            <div style="font-size:60pt;margin-bottom:20px;">⭐</div>
            <h2>The End</h2>
            <p style="color:rgba(255,255,255,0.8);font-size:14pt;margin-top:20px;">
                A BookBunny Story
            </p>
        </div>
    </div>"""

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{css}</style></head>
<body>{cover_html}{content_html}{end_html}</body></html>"""


def generate_pdf(book_data: dict, output_path: str) -> str:
    """Generate a KDP-ready PDF, return the output path"""
    html_content = generate_kdp_html(book_data)

    if HAVE_WEASYPRINT:
        # Professional PDF with WeasyPrint
        HTML(string=html_content).write_pdf(output_path)
    elif HAVE_REPORTLAB:
        # Fallback with ReportLab
        size = book_data.get("size", "8.5x8.5")
        if size in KDP_SIZES:
            w, h = KDP_SIZES[size]
        else:
            w, h = KDP_SIZES["8.5x8.5"]

        doc = SimpleDocTemplate(output_path, pagesize=(w, h),
                                leftMargin=0.5*inch, rightMargin=0.5*inch,
                                topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        story = []
        # Title page
        title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=36, spaceAfter=30)
        story.append(Spacer(1, 2*inch))
        story.append(Paragraph(book_data.get("title", "My Story"), title_style))
        story.append(PageBreak())

        # Content pages
        for i, page in enumerate(book_data.get("pages", [])):
            p = ParagraphStyle('Body2', parent=styles['Normal'], fontSize=16, leading=28, spaceAfter=10)
            story.append(Paragraph(page.get("text", ""), p))
            story.append(Paragraph(f'<i>Page {i+1}</i>', ParagraphStyle('PageNum', fontSize=10, textColor='#C8A2E8')))
            story.append(PageBreak())

        doc.build(story)
    else:
        # Pure fallback - write HTML
        with open(output_path.replace('.pdf', '.html'), 'w') as f:
            f.write(html_content)
        return output_path.replace('.pdf', '.html')

    return output_path


if __name__ == "__main__":
    # CLI mode: read JSON from stdin, write PDF to stdout or file
    if len(sys.argv) > 1:
        input_path = sys.argv[1]
        with open(input_path, 'r') as f:
            data = json.load(f)

        output_path = sys.argv[2] if len(sys.argv) > 2 else input_path.replace('.json', '.pdf')
        result = generate_pdf(data, output_path)
        print(json.dumps({"success": True, "path": result}))
    else:
        # Read from stdin JSON
        data = json.load(sys.stdin)
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            output = generate_pdf(data, tmp.name)
            # Return base64 encoded PDF
            with open(output, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode()
            print(json.dumps({"success": True, "pdf_b64": b64}))
            os.unlink(output)
