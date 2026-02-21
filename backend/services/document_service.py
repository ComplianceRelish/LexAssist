"""
LexAssist — Document Processing Service
==========================================
Enterprise document scanning & OCR pipeline for legal documents:

1. Accept uploads (PDF, images, DOCX)
2. Image pre-processing & enhancement
3. OCR via OpenAI Vision (GPT-4o) — excellent for legal docs
4. Document classification (petition, affidavit, contract, etc.)
5. Text extraction with structure analysis
6. Storage in Supabase

Supports:
  - Mobile camera captures (JPG/PNG/WebP)
  - Scanner output (TIFF/PDF)
  - Direct file uploads (PDF/DOCX/images)
"""

import base64
import io
import os
import re
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend.config import Config
from backend.utils.logger import setup_logger

logger = setup_logger("DocumentService")

# ── Try to load dependencies ──────────────────────────────────────

try:
    import openai
    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False
    logger.warning("OpenAI SDK not installed — document OCR disabled")

try:
    from PIL import Image, ImageEnhance, ImageFilter
    _PIL_AVAILABLE = True
    logger.info("Pillow available for image processing")
except ImportError:
    _PIL_AVAILABLE = False
    logger.warning("Pillow not installed — image enhancement disabled. Install: pip install Pillow")

try:
    import fitz as pymupdf  # PyMuPDF
    _PYMUPDF_AVAILABLE = True
    logger.info("PyMuPDF available for PDF processing")
except ImportError:
    _PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF not installed — PDF text extraction disabled. Install: pip install PyMuPDF")


# ──────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────

SUPPORTED_IMAGE_FORMATS = {"jpg", "jpeg", "png", "webp", "tiff", "tif", "bmp", "gif"}
SUPPORTED_DOC_FORMATS = {"pdf", "doc", "docx"}
ALL_SUPPORTED_FORMATS = SUPPORTED_IMAGE_FORMATS | SUPPORTED_DOC_FORMATS
MAX_FILE_SIZE_MB = 20
MAX_PAGES_FOR_OCR = 20  # Limit pages sent to Vision API

# Document type classification keywords
DOCUMENT_TYPES = {
    "petition": ["petition", "writ petition", "special leave petition", "SLP", "pray", "prayer",
                  "petitioner", "in the matter of", "most respectfully showeth"],
    "affidavit": ["affidavit", "sworn", "deponent", "solemnly affirm", "oath", "verification",
                   "notary", "commissioner for oaths"],
    "contract": ["agreement", "contract", "parties hereto", "witnesseth", "whereas",
                  "terms and conditions", "indemnify", "force majeure"],
    "court_order": ["order", "in the court of", "disposed of", "hereby ordered",
                     "next date of hearing", "adjourned"],
    "legal_notice": ["legal notice", "notice", "under section", "cease and desist",
                      "without prejudice", "advocate for"],
    "judgment": ["judgment", "judgement", "pronounced", "appeal dismissed", "appeal allowed",
                  "held that", "ratio decidendi", "per curiam"],
    "plaint": ["plaint", "plaintiff", "defendant", "suit", "cause of action",
                "relief sought", "valued for the purposes of"],
    "charge_sheet": ["charge sheet", "chargesheet", "FIR", "investigation", "accused",
                      "section 173", "police station"],
    "bail_application": ["bail", "bail application", "anticipatory bail", "regular bail",
                          "section 438", "section 439", "surety"],
    "vakalatnama": ["vakalatnama", "vakalat", "power of attorney", "advocate",
                     "authorise", "represent"],
    "fir": ["first information report", "FIR", "complainant", "police station",
             "cognizable offence", "section 154"],
}

# ── OCR System Prompt ─────────────────────────────────────────────

OCR_SYSTEM_PROMPT = """You are a legal document OCR specialist for Indian law. Extract ALL text from this document image with perfect accuracy.

**Critical rules:**
1. Preserve the EXACT text — do not paraphrase, summarise, or interpret
2. Maintain paragraph structure and line breaks
3. Preserve all section numbers, article numbers, case citations exactly as printed
4. Preserve formatting: headings, numbered lists, bullet points
5. For tables, use markdown table format
6. Include all stamps, seals descriptions in [brackets]: [COURT SEAL], [NOTARY STAMP]
7. Include all handwritten text with [handwritten: text] markers
8. Preserve all dates, names, addresses, and reference numbers exactly
9. If text is partially illegible, note it as [illegible] or [partially illegible: best guess]
10. For multi-column layouts, read left to right, top to bottom

**Indian legal document specifics:**
- Preserve cause title formatting (IN THE COURT OF ...)
- Keep all section references (Section 302 IPC, Article 226, Order VII Rule 11)
- Preserve case citations (AIR 2023 SC 450, (2023) 5 SCC 120)
- Keep all Hindi/vernacular text as-is using transliteration if needed
- Note court stamps, filing stamps, and their dates

Return ONLY the extracted text. No commentary."""

CLASSIFICATION_PROMPT = """Analyse this legal document text and classify it. Return ONLY valid JSON:

{
  "document_type": "petition|affidavit|contract|court_order|legal_notice|judgment|plaint|charge_sheet|bail_application|vakalatnama|fir|other",
  "document_title": "Best descriptive title for this document",
  "parties": {
    "petitioner": "name or null",
    "respondent": "name or null",
    "judge": "name or null"
  },
  "court": "Court name if identifiable, or null",
  "case_number": "Case number if found, or null",
  "date": "Document date if found, or null",
  "key_sections": ["Section 302 IPC", "Article 226"],
  "summary": "2-3 sentence summary of the document",
  "page_count_estimate": 1,
  "language": "English|Hindi|Mixed|Other",
  "confidence": 0.95
}"""


class DocumentService:
    """
    Enterprise document processing service for legal documents.
    
    Pipeline:
      Upload → Validate → Pre-process → OCR (OpenAI Vision) → Classify → Store
    """

    def __init__(self):
        self.openai_client = None
        self._ocr_available = False

        openai_key = Config.OPENAI_API_KEY if hasattr(Config, 'OPENAI_API_KEY') else os.environ.get('OPENAI_API_KEY')
        if _OPENAI_AVAILABLE and openai_key:
            try:
                self.openai_client = openai.OpenAI(api_key=openai_key)
                self._ocr_available = True
                logger.info("Document OCR service initialised (GPT-4o Vision)")
            except Exception as e:
                logger.error("OpenAI client init failed for OCR: %s", e)
        else:
            logger.warning("Document OCR unavailable — OpenAI SDK or API key missing")

    @property
    def is_available(self) -> bool:
        return self._ocr_available

    # ── Main Entry Point ──────────────────────────────────────────

    def process_document(
        self,
        file_data: bytes,
        filename: str,
        user_id: Optional[str] = None,
        case_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Full document processing pipeline.
        
        Args:
            file_data: Raw file bytes
            filename: Original filename
            user_id: Authenticated user ID
            case_id: Optional case to link to
        
        Returns:
            {
                "text": str,           — Extracted text
                "classification": {},  — Document type, parties, etc.
                "pages": int,          — Number of pages processed
                "metadata": {},        — Processing stats
            }
        """
        start_time = time.time()

        # 1. Validate
        validation = self._validate_file(file_data, filename)
        if validation.get("error"):
            return validation

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        is_image = ext in SUPPORTED_IMAGE_FORMATS
        is_pdf = ext == "pdf"

        # 2. Extract text based on file type
        extracted_text = ""
        pages_processed = 0
        ocr_used = False

        if is_pdf:
            extracted_text, pages_processed, ocr_used = self._process_pdf(file_data, filename)
        elif is_image:
            extracted_text, ocr_used = self._process_image(file_data, filename, ext)
            pages_processed = 1
        elif ext in ("doc", "docx"):
            extracted_text = self._process_docx(file_data, filename)
            pages_processed = max(1, len(extracted_text) // 3000)  # Rough estimate
        else:
            return {"error": f"Unsupported format: .{ext}", "status": "unsupported_format"}

        if not extracted_text.strip():
            # Image-only PDF or failed text extraction — try OCR on first page
            if is_pdf and self._ocr_available:
                extracted_text, ocr_used = self._ocr_pdf_pages(file_data, filename)
                if not extracted_text.strip():
                    return {
                        "error": "Could not extract text from this document. The file may be empty or corrupted.",
                        "status": "no_text_extracted",
                    }

        # 3. Classify the document
        classification = self._classify_document(extracted_text)

        # 4. Build result
        total_ms = round((time.time() - start_time) * 1000)

        result = {
            "text": extracted_text,
            "classification": classification,
            "pages": pages_processed,
            "metadata": {
                "filename": filename,
                "file_size_bytes": len(file_data),
                "file_type": ext,
                "ocr_used": ocr_used,
                "processing_ms": total_ms,
                "word_count": len(extracted_text.split()),
                "char_count": len(extracted_text),
                "status": "success",
            },
        }

        logger.info(
            "Document processed: %s | %d pages | %d words | OCR=%s | %dms",
            filename, pages_processed, result["metadata"]["word_count"], ocr_used, total_ms,
        )
        return result

    # ── Validation ────────────────────────────────────────────────

    def _validate_file(self, file_data: bytes, filename: str) -> Dict:
        """Validate file format and size."""
        if not filename:
            return {"error": "No filename provided", "status": "invalid"}

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALL_SUPPORTED_FORMATS:
            return {
                "error": f"Unsupported file format: .{ext}. Accepted: {', '.join(sorted(ALL_SUPPORTED_FORMATS))}",
                "status": "unsupported_format",
            }

        size_mb = len(file_data) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            return {
                "error": f"File too large ({size_mb:.1f} MB). Maximum: {MAX_FILE_SIZE_MB} MB.",
                "status": "file_too_large",
            }

        if len(file_data) == 0:
            return {"error": "File is empty", "status": "empty_file"}

        return {}

    # ── PDF Processing ────────────────────────────────────────────

    def _process_pdf(self, file_data: bytes, filename: str) -> Tuple[str, int, bool]:
        """
        Extract text from PDF. First try native text extraction (PyMuPDF),
        if that fails (scanned PDF), fall back to OCR.
        
        Returns: (text, page_count, ocr_used)
        """
        if not _PYMUPDF_AVAILABLE:
            # No PyMuPDF — try OCR directly
            if self._ocr_available:
                text, ocr_used = self._ocr_pdf_pages(file_data, filename)
                return text, max(1, text.count('\n\n')), True
            return "", 0, False

        try:
            doc = pymupdf.open(stream=file_data, filetype="pdf")
            page_count = len(doc)
            text_parts = []

            for page_num in range(min(page_count, 100)):  # Limit to 100 pages
                page = doc[page_num]
                text = page.get_text("text")
                if text.strip():
                    text_parts.append(f"--- Page {page_num + 1} ---\n{text.strip()}")

            doc.close()
            full_text = "\n\n".join(text_parts)

            # If we got meaningful text, return it
            if len(full_text.strip()) > 50:
                return full_text, page_count, False

            # Scanned PDF — fall back to OCR
            if self._ocr_available:
                ocr_text, _ = self._ocr_pdf_pages(file_data, filename)
                return ocr_text, page_count, True

            return full_text, page_count, False

        except Exception as e:
            logger.error("PDF processing error: %s", e)
            if self._ocr_available:
                text, _ = self._ocr_pdf_pages(file_data, filename)
                return text, 1, True
            return "", 0, False

    def _ocr_pdf_pages(self, file_data: bytes, filename: str) -> Tuple[str, bool]:
        """
        Convert PDF pages to images and OCR them via OpenAI Vision.
        """
        if not _PYMUPDF_AVAILABLE or not self._ocr_available:
            return "", False

        try:
            doc = pymupdf.open(stream=file_data, filetype="pdf")
            page_count = min(len(doc), MAX_PAGES_FOR_OCR)
            text_parts = []

            for page_num in range(page_count):
                page = doc[page_num]
                # Render page to image at 200 DPI
                mat = pymupdf.Matrix(200 / 72, 200 / 72)
                pix = page.get_pixmap(matrix=mat)
                img_bytes = pix.tobytes("png")

                # OCR this page
                page_text = self._ocr_image_bytes(img_bytes, f"{filename}_page_{page_num + 1}.png")
                if page_text:
                    text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")

            doc.close()
            return "\n\n".join(text_parts), True

        except Exception as e:
            logger.error("PDF OCR error: %s", e)
            return "", False

    # ── Image Processing ──────────────────────────────────────────

    def _process_image(self, file_data: bytes, filename: str, ext: str) -> Tuple[str, bool]:
        """
        Process an image file: enhance then OCR.
        
        Returns: (text, ocr_used)
        """
        # Enhance image if Pillow is available
        enhanced_data = file_data
        if _PIL_AVAILABLE:
            enhanced_data = self._enhance_image(file_data, ext)

        # OCR via Vision API
        if self._ocr_available:
            text = self._ocr_image_bytes(enhanced_data, filename)
            return text, True

        return "", False

    def _enhance_image(self, file_data: bytes, ext: str) -> bytes:
        """
        Pre-process image for better OCR accuracy:
        - Convert to grayscale for documents
        - Enhance contrast
        - Sharpen
        - Remove noise
        """
        try:
            img = Image.open(io.BytesIO(file_data))

            # Convert to RGB if needed (TIFF can be CMYK)
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            # For documents, convert to grayscale
            gray = img.convert("L")

            # Enhance contrast
            enhancer = ImageEnhance.Contrast(gray)
            gray = enhancer.enhance(1.5)

            # Sharpen
            gray = gray.filter(ImageFilter.SHARPEN)

            # Adaptive threshold-like effect: enhance for clean text
            enhancer = ImageEnhance.Brightness(gray)
            gray = enhancer.enhance(1.1)

            # Resize if too small (< 1000px wide)
            if gray.width < 1000:
                ratio = 1500 / gray.width
                new_size = (int(gray.width * ratio), int(gray.height * ratio))
                gray = gray.resize(new_size, Image.LANCZOS)

            # Save to bytes
            output = io.BytesIO()
            gray.save(output, format="PNG", optimize=True)
            return output.getvalue()

        except Exception as e:
            logger.warning("Image enhancement failed, using original: %s", e)
            return file_data

    # ── OCR via OpenAI Vision ─────────────────────────────────────

    def _ocr_image_bytes(self, image_data: bytes, filename: str) -> str:
        """
        Send image to GPT-4o Vision for OCR.
        Returns extracted text.
        """
        if not self._ocr_available:
            return ""

        try:
            b64_image = base64.b64encode(image_data).decode("utf-8")

            # Detect MIME type
            mime = "image/png"
            lower_fn = filename.lower()
            if lower_fn.endswith((".jpg", ".jpeg")):
                mime = "image/jpeg"
            elif lower_fn.endswith(".webp"):
                mime = "image/webp"
            elif lower_fn.endswith(".gif"):
                mime = "image/gif"
            elif lower_fn.endswith((".tiff", ".tif")):
                mime = "image/tiff"

            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": OCR_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime};base64,{b64_image}",
                                    "detail": "high",
                                },
                            },
                            {
                                "type": "text",
                                "text": "Extract all text from this legal document image.",
                            },
                        ],
                    },
                ],
                max_tokens=4096,
                temperature=0.0,
            )

            text = response.choices[0].message.content.strip()
            return text

        except Exception as e:
            logger.error("Vision OCR failed for %s: %s", filename, e)
            return ""

    # ── DOCX Processing ───────────────────────────────────────────

    def _process_docx(self, file_data: bytes, filename: str) -> str:
        """Extract text from DOCX files."""
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_data))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n\n".join(paragraphs)
        except ImportError:
            logger.warning("python-docx not installed — DOCX text extraction unavailable")
            # Fall back to OCR if this is a DOCX? Not ideal but possible
            return ""
        except Exception as e:
            logger.error("DOCX processing error: %s", e)
            return ""

    # ── Document Classification ───────────────────────────────────

    def _classify_document(self, text: str) -> Dict[str, Any]:
        """
        Classify the document using keyword matching + LLM for accuracy.
        """
        # Quick keyword-based pre-classification
        text_lower = text.lower()
        keyword_scores = {}
        for doc_type, keywords in DOCUMENT_TYPES.items():
            score = sum(1 for kw in keywords if kw.lower() in text_lower)
            if score > 0:
                keyword_scores[doc_type] = score

        # Sort by score and get top match
        quick_type = "other"
        if keyword_scores:
            quick_type = max(keyword_scores, key=keyword_scores.get)

        # If we have LLM, do proper classification
        if self._ocr_available and len(text) > 50:
            try:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",  # Cheaper model for classification
                    messages=[
                        {"role": "system", "content": CLASSIFICATION_PROMPT},
                        {"role": "user", "content": f"Classify this document:\n\n{text[:4000]}"},
                    ],
                    max_tokens=1024,
                    temperature=0.1,
                    response_format={"type": "json_object"},
                )

                import json
                result = json.loads(response.choices[0].message.content)
                return result

            except Exception as e:
                logger.warning("LLM classification failed, using keyword match: %s", e)

        # Fallback: keyword-only classification
        return {
            "document_type": quick_type,
            "document_title": f"Scanned {quick_type.replace('_', ' ').title()}",
            "parties": {"petitioner": None, "respondent": None, "judge": None},
            "court": None,
            "case_number": None,
            "date": None,
            "key_sections": [],
            "summary": f"Document classified as {quick_type} based on keyword analysis.",
            "language": "English",
            "confidence": 0.5,
        }

    # ── Health Check ──────────────────────────────────────────────

    def get_status(self) -> Dict[str, Any]:
        """Return service capabilities."""
        return {
            "ocr_engine": "gpt-4o-vision" if self._ocr_available else "unavailable",
            "image_enhancement": "pillow" if _PIL_AVAILABLE else "unavailable",
            "pdf_processing": "pymupdf" if _PYMUPDF_AVAILABLE else "unavailable",
            "supported_formats": sorted(ALL_SUPPORTED_FORMATS),
            "max_file_size_mb": MAX_FILE_SIZE_MB,
            "max_ocr_pages": MAX_PAGES_FOR_OCR,
        }
