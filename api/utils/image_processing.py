import base64
from io import BytesIO
from PIL import Image

def compress_and_to_base64(image_data_url, max_size=(800, 800), quality=75):
    """
    Prend une image en dataURL (base64), la compresse, et la renvoie en base64 pour injection HTML.
    """
    if not image_data_url or "base64," not in image_data_url:
        return None
    
    try:
        # Extraire les données base64
        header, encoded = image_data_url.split(",", 1)
        data = base64.b64decode(encoded)
        
        # Ouvrir l'image avec Pillow
        img = Image.open(BytesIO(data))
        
        # Convertir en RGB si nécessaire (pour JPEG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # Redimensionnement proportionnel
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Sauvegarde compressée en mémoire
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        
        # Re-conversion en base64
        compressed_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{compressed_base64}"
    except Exception as e:
        print(f"Erreur compression image : {e}")
        return image_data_url # Renvoi original en cas d'erreur