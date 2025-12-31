import fitz  # PyMuPDF
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Constants
MIN_TEXT_LENGTH = 50  # Minimum characters for valid CV
MAX_FILE_SIZE_MB = 10  # Maximum PDF size in MB


class PDFExtractionError(Exception):
    """Custom exception for PDF extraction failures"""
    pass


def extract_text_from_pdf(pdf_path: str, max_pages: Optional[int] = None) -> str:
    """
    Extract raw text from PDF using PyMuPDF.
    
    Args:
        pdf_path: Path to PDF file
        max_pages: Optional limit on pages to process (for huge PDFs)
        
    Returns:
        Extracted text string
        
    Raises:
        PDFExtractionError: If extraction fails
    """
    pdf_file = Path(pdf_path)
    
    # Validate file exists
    if not pdf_file.exists():
        raise PDFExtractionError(f"File not found: {pdf_path}")
    
    # Check file size
    file_size_mb = pdf_file.stat().st_size / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        logger.warning(f"Large PDF detected: {file_size_mb:.2f}MB")
    
    doc = None
    try:
        # Open PDF with error handling
        doc = fitz.open(pdf_path)
        
        # Check if encrypted/password protected
        if doc.is_encrypted:
            raise PDFExtractionError("PDF is password-protected")
        
        # Get page count
        page_count = len(doc)
        if page_count == 0:
            raise PDFExtractionError("PDF has no pages")
        
        logger.info(f"Processing PDF: {page_count} pages, {file_size_mb:.2f}MB")
        
        # Extract text with optional page limit
        text_parts = []
        pages_to_process = min(page_count, max_pages) if max_pages else page_count
        
        for page_num in range(pages_to_process):
            page = doc[page_num]
            page_text = page.get_text()
            
            if page_text.strip():  # Only add non-empty pages
                text_parts.append(page_text)
        
        text = "\n".join(text_parts)
        
        # Validate extracted content
        if len(text.strip()) < MIN_TEXT_LENGTH:
            raise PDFExtractionError(
                f"Extracted text too short ({len(text)} chars). "
                "PDF may be scanned image or corrupted."
            )
        
        logger.info(f"Successfully extracted {len(text)} characters")
        return text
        
    except fitz.fitz.FileDataError as e:
        raise PDFExtractionError(f"Corrupted PDF file: {e}")
    
    except fitz.fitz.EmptyFileError:
        raise PDFExtractionError("PDF file is empty")
    
    except PDFExtractionError:
        raise  # Re-raise our custom errors
    
    except Exception as e:
        logger.error(f"Unexpected error extracting PDF: {e}", exc_info=True)
        raise PDFExtractionError(f"Failed to extract PDF: {str(e)}")
    
    finally:
        # Always close document
        if doc is not None:
            doc.close()


def extract_text_with_fallback(pdf_path: str) -> str:
    """
    Extract text with fallback strategies for problematic PDFs.
    
    Tries:
    1. Normal extraction
    2. With text layout preservation
    3. OCR suggestion for scanned docs
    """
    try:
        # Try normal extraction first
        return extract_text_from_pdf(pdf_path)
    
    except PDFExtractionError as e:
        # If text too short, might be scanned PDF
        if "too short" in str(e).lower():
            logger.warning("Text extraction minimal - PDF may need OCR")
            
            # Try alternative extraction modes
            try:
                doc = fitz.open(pdf_path)
                text = ""
                for page in doc:
                    # Try with layout preservation
                    text += page.get_text("text")
                doc.close()
                
                if len(text.strip()) >= MIN_TEXT_LENGTH:
                    return text
                
            except:
                pass
            
            raise PDFExtractionError(
                "PDF appears to be scanned image. "
                "OCR processing required (use Tesseract/cloud OCR)."
            )
        
        raise  # Re-raise other errors