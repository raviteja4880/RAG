import fitz # PyMuPDF (The fastest PDF extractor)
import os
from langchain_core.documents import Document

def load_pdf(file_path: str):
    """Ultra-fast text extraction from PDFs using PyMuPDF (fitz) directly."""
    documents = []
    try:
        doc = fitz.open(file_path)
        source_name = os.path.basename(file_path)
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            
            # Create LangChain Document format
            documents.append(Document(
                page_content=text, 
                metadata={
                    "source": source_name, 
                    "page": page_num,
                    "method": "fast-fitz"
                }
            ))
        doc.close()
    except Exception as e:
        print(f"WARN: PyMuPDF Extraction Error: {e}")
        
    return documents