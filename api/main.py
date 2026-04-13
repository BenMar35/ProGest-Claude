from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import os
import base64
from .utils.image_processing import compress_and_to_base64

app = FastAPI()

# Configuration Jinja2
template_dir = os.path.join(os.path.dirname(__file__), "templates")
env = Environment(loader=FileSystemLoader(template_dir))

def get_image_base64(filename):
    """Lit une image locale et la convertit en dataURL base64."""
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), filename)
    if os.path.exists(path):
        with open(path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
            return f"data:image/png;base64,{encoded_string}"
    return ""

@app.post("/api/generate-cr-pdf")
async def generate_cr_pdf(data: dict = Body(...)):
    try:
        # 1. Traitement des photos du chantier (compression)
        if "photos" in data:
            data["photos"] = [compress_and_to_base64(p) for p in data["photos"]]
            
        # 2. Chargement du template
        template = env.get_template("compte_rendu.html")
        
        # 3. Rendu HTML avec les données et le logo base64
        html_content = template.render(
            report_number=data.get("reportNumber"),
            report_date=data.get("reportDate"),
            next_meeting=data.get("nextMeeting"),
            observations=data.get("observations", "").split('\n'),
            attendance=data.get("attendance"),
            task_groups=data.get("taskGroups"),
            metadata=data.get("metadata"),
            logo_url=get_image_base64("logo.png")
        )
        
        # 4. Conversion WeasyPrint
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=CR_{data.get('reportNumber')}.pdf"}
        )
    except Exception as e:
        print(f"Erreur PDF : {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-tender-pdf")
async def generate_tender_pdf(data: dict = Body(...)):
    return Response(content=b"PDF Tender Placeholder", media_type="application/pdf")