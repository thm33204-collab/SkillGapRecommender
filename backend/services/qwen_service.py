import requests
import json
import logging
import re
from typing import List, Dict, Any
from requests.exceptions import ConnectionError, Timeout

logger = logging.getLogger(__name__)

# Configuration
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5:3b"
MAX_CV_LENGTH = 8000  # chars - prevent context overflow
REQUEST_TIMEOUT = 120  # seconds
MAX_RETRIES = 2


class QwenExtractionError(Exception):
    """Custom exception for Qwen extraction failures"""
    pass


def check_ollama_available() -> bool:
    """Check if Ollama service is running"""
    try:
        response = requests.get(
            "http://localhost:11434/api/tags",
            timeout=5
        )
        return response.status_code == 200
    except:
        return False


def clean_json_from_llm_output(raw_text: str) -> str:
    """
    Extract JSON from LLM output that may contain markdown or extra text.
    
    Handles cases like:
    - "Here is the JSON:\n```json\n{...}\n```"
    - "Sure! {... }"
    - "{...}\n\nI extracted these skills..."
    """
    # Try to find JSON in markdown code blocks first
    json_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
    if json_block_match:
        return json_block_match.group(1)
    
    # Try to find JSON object (first { to last })
    json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if json_match:
        return json_match.group(0)
    
    # If no JSON found, return original (will fail in json.loads)
    return raw_text


def validate_skills(skills: List[str]) -> List[str]:
    """
    Validate and clean extracted skills.
    
    Removes:
    - Empty strings
    - Very long "skills" (likely garbage)
    - Duplicates (case-insensitive)
    """
    if not isinstance(skills, list):
        return []
    
    cleaned = []
    seen = set()
    
    for skill in skills:
        if not isinstance(skill, str):
            continue
            
        # Clean whitespace
        skill = skill.strip()
        
        # Skip invalid skills
        if not skill or len(skill) > 100 or len(skill) < 2:
            continue
        
        # Remove duplicates (case-insensitive)
        skill_lower = skill.lower()
        if skill_lower in seen:
            continue
        
        seen.add(skill_lower)
        cleaned.append(skill)
    
    return cleaned


def truncate_cv_text(cv_text: str, max_length: int = MAX_CV_LENGTH) -> str:
    """
    Truncate CV text if too long, prioritizing top sections.
    """
    if len(cv_text) <= max_length:
        return cv_text
    
    logger.warning(f"CV text truncated from {len(cv_text)} to {max_length} chars")
    
    # Try to keep complete sentences
    truncated = cv_text[:max_length]
    last_period = truncated.rfind('.')
    
    if last_period > max_length * 0.8:  # If we can salvage 80%+
        return truncated[:last_period + 1]
    
    return truncated


def extract_skills_with_qwen(
    cv_text: str,
    retries: int = MAX_RETRIES
) -> Dict[str, Any]:
    """
    Use Qwen LLM to extract skills from CV text.
    
    Args:
        cv_text: Raw CV text
        retries: Number of retry attempts for failed extractions
        
    Returns:
        Dict with keys:
            - "skills": List[str] - Extracted skills
            - "method": str - Extraction method used
            - "model": str - LLM model name
            - "success": bool - Whether extraction succeeded
        
    Raises:
        QwenExtractionError: If extraction fails after retries
    """
    # Check Ollama is running
    if not check_ollama_available():
        raise QwenExtractionError(
            "Ollama service not available. "
            "Start it with: ollama serve"
        )
    
    # Truncate if needed
    cv_text = truncate_cv_text(cv_text)
    
    # Optimized prompt for structured output
    prompt = f"""Extract ALL technical and professional skills from this CV.

RULES:
- Return ONLY valid JSON, no other text
- Format: {{"skills": ["skill1", "skill2"]}}
- Include: programming languages, frameworks, tools, technologies, soft skills, methodologies
- Exclude: job titles, company names, responsibilities, generic words
- Be specific: use exact technology names (e.g., "React" not "frontend")

CV TEXT:
\"\"\"
{cv_text}
\"\"\"

JSON OUTPUT:"""

    last_error = None
    
    for attempt in range(retries + 1):
        try:
            # Call Ollama API
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,  # Low temp for consistent output
                        "num_predict": 500   # Limit output length
                    }
                },
                timeout=REQUEST_TIMEOUT
            )
            
            response.raise_for_status()
            raw_output = response.json()["response"]
            
            logger.debug(f"Raw LLM output (attempt {attempt + 1}): {raw_output[:200]}...")
            
            # Clean and parse JSON
            cleaned_json = clean_json_from_llm_output(raw_output)
            data = json.loads(cleaned_json)
            
            # Extract and validate skills
            raw_skills = data.get("skills", [])
            skills = validate_skills(raw_skills)
            
            if not skills:
                raise QwenExtractionError("No valid skills extracted")
            
            logger.info(f"✅ Successfully extracted {len(skills)} skills with Qwen")
            
            # Return dict matching contract
            return {
                "skills": skills,
                "method": "llm",
                "model": MODEL_NAME,
                "success": True,
                "num_skills": len(skills),
                "cv_length": len(cv_text)
            }
            
        except ConnectionError as e:
            last_error = QwenExtractionError(
                "Cannot connect to Ollama. Is it running?"
            )
            logger.error(f"Connection error (attempt {attempt + 1}): {e}")
            
        except Timeout as e:
            last_error = QwenExtractionError(
                f"Ollama request timed out after {REQUEST_TIMEOUT}s"
            )
            logger.error(f"Timeout (attempt {attempt + 1}): {e}")
            
        except json.JSONDecodeError as e:
            last_error = QwenExtractionError(
                f"LLM returned invalid JSON: {cleaned_json[:100]}"
            )
            logger.error(f"JSON parse error (attempt {attempt + 1}): {e}")
            
        except KeyError as e:
            last_error = QwenExtractionError(
                "LLM response missing 'skills' field"
            )
            logger.error(f"Missing field (attempt {attempt + 1}): {e}")
            
        except Exception as e:
            last_error = QwenExtractionError(f"Unexpected error: {str(e)}")
            logger.error(f"Unexpected error (attempt {attempt + 1}): {e}")
        
        # Don't retry on last attempt
        if attempt < retries:
            logger.info(f"Retrying... ({attempt + 1}/{retries})")
    
    # All retries exhausted
    raise last_error


def extract_skills_batch(cv_texts: List[str]) -> List[Dict[str, Any]]:
    """
    Extract skills from multiple CVs.
    
    Args:
        cv_texts: List of CV text strings
        
    Returns:
        List of dicts, each containing:
            - "skills": List[str] or empty list if failed
            - "success": bool
            - "error": str (if failed)
    """
    results = []
    
    for i, cv_text in enumerate(cv_texts):
        try:
            result = extract_skills_with_qwen(cv_text)
            results.append(result)
            logger.info(f"✅ Processed CV {i + 1}/{len(cv_texts)}")
        except QwenExtractionError as e:
            logger.error(f"❌ Failed CV {i + 1}: {e}")
            results.append({
                "skills": [],
                "success": False,
                "error": str(e),
                "method": "failed"
            })
    
    return results


# ========================================
# UTILITY FUNCTIONS
# ========================================

def test_ollama_connection() -> Dict[str, Any]:
    """
    Test Ollama connection and return status info.
    
    Returns:
        Dict with connection status and available models
    """
    try:
        # Check if service is running
        if not check_ollama_available():
            return {
                "status": "offline",
                "message": "Ollama service is not running",
                "available": False
            }
        
        # Get available models
        response = requests.get(
            "http://localhost:11434/api/tags",
            timeout=5
        )
        models = response.json().get("models", [])
        model_names = [m.get("name") for m in models]
        
        # Check if our model is available
        model_available = any(MODEL_NAME in name for name in model_names)
        
        return {
            "status": "online",
            "available": True,
            "models": model_names,
            "target_model": MODEL_NAME,
            "target_model_available": model_available,
            "message": f"Ollama is running with {len(models)} models"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "available": False,
            "error": str(e),
            "message": "Error checking Ollama status"
        }


def extract_skills_with_fallback(cv_text: str) -> Dict[str, Any]:
    """
    Extract skills with automatic fallback if LLM fails.
    
    This is a convenience wrapper that won't raise exceptions.
    Instead returns success=False if extraction fails.
    
    Args:
        cv_text: Raw CV text
        
    Returns:
        Dict with extraction results or error info
    """
    try:
        return extract_skills_with_qwen(cv_text)
    except QwenExtractionError as e:
        logger.warning(f"⚠️ LLM extraction failed: {e}")
        return {
            "skills": [],
            "success": False,
            "error": str(e),
            "method": "failed",
            "message": "LLM extraction failed, use rule-based fallback"
        }
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return {
            "skills": [],
            "success": False,
            "error": str(e),
            "method": "failed",
            "message": "Unexpected error during extraction"
        }