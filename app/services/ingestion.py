import os
import datetime
import fitz # PyMuPDF
import uuid
import concurrent.futures
from typing import List
from rapidocr_onnxruntime import RapidOCR
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.utils.file_loader import load_pdf
from app.core.logger import logger

class IngestionService:
    def __init__(self):
        # 1. Faster Splitter for Production (Real-time compatible)
        # Recursive splitter is much faster than SemanticChunker
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=200,
            add_start_index=True
        )
        
        # 2. Shared OCR Instance (Warm-start)
        self.ocr_engine = RapidOCR()

    def _process_page_ocr(self, page_data) -> Document:
        """Helper to process a single page for parallel execution."""
        page_num, pix_data, source_name = page_data
        
        # Save temp image from bytes
        img_path = f"temp_ocr_{uuid.uuid4()}.png"
        pix_data.save(img_path)
        
        try:
            result, _ = self.ocr_engine(img_path)
            text = "".join([l[1] + "\n" for l in result]) if result else ""
            
            return Document(
                page_content=text, 
                metadata={
                    "source": source_name, 
                    "page": page_num,
                    "method": "parallel-ocr"
                }
            )
        finally:
            if os.path.exists(img_path):
                os.remove(img_path)

    def _extract_with_ocr_parallel(self, file_path: str) -> List[Document]:
        """Parallelized OCR extraction using ThreadPool for high-speed throughput."""
        logger.info(f"INGESTION_REALTIME_OCR_START", file=os.path.basename(file_path))
        doc = fitz.open(file_path)
        source_name = os.path.basename(file_path)
        
        # Prepare page tasks
        tasks = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            tasks.append((page_num, page.get_pixmap(), source_name))
        
        # Execute in parallel threads
        # OCR is primarily I/O and external binary heavy, threads work well here
        documents = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as executor:
            documents = list(executor.map(self._process_page_ocr, tasks))
            
        doc.close()
        return documents

    def process_file(self, file_path: str, user_id: str = "guest") -> List[Document]:
        """Deeply optimized ingestion pipeline for real-time responsiveness."""
        ext = os.path.splitext(file_path)[1].lower()
        documents = []

        # 1. Ultra-Fast Extraction Layer
        try:
            if ext == '.pdf':
                documents = load_pdf(file_path)
                # Fallback to parallel OCR if no text found
                if not documents or not any(d.page_content.strip() for d in documents):
                    documents = self._extract_with_ocr_parallel(file_path)
            elif ext in ['.png', '.jpg', '.jpeg']:
                result, _ = self.ocr_engine(file_path)
                text = "".join([l[1] + "\n" for l in result]) if result else ""
                documents = [Document(page_content=text, metadata={"source": os.path.basename(file_path), "method": "ocr"})]
            else:
                raise ValueError(f"UNSUPPORTED_FORMAT: {ext}")

            # 2. Optimized Chunking (Non-blocking Semantic Split replacement)
            # Recursive split is 100x faster than SemanticChunker as it doesn't call LLM/Embeddings
            docs = self.text_splitter.split_documents(documents)
            
            # 3. High-Speed Enrichment
            now = datetime.datetime.utcnow().isoformat()
            for i, doc in enumerate(docs):
                doc.metadata.update({
                    "chunk_id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "processed_at": now,
                    "char_count": len(doc.page_content),
                    "node_rank": i
                })

            logger.info("INGESTION_SUCCESS", file=os.path.basename(file_path), chunks=len(docs))
            return docs
            
        except Exception as e:
            logger.error("INGESTION_FAILED", file=os.path.basename(file_path), error=str(e))
            raise e
