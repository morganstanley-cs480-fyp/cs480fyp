"""
Text cleaning utilities for document retrieval.
"""
import re


def clean_retrieved_text(text: str) -> str:
    """
    Clean and normalize text retrieved from vector store.
    
    This function addresses common formatting issues when retrieving
    documents from Milvus, including:
    - Literal \\n strings instead of actual newlines
    - Inconsistent whitespace
    - Irregular pipe separator spacing
    - Extra blank lines between sections
    
    Args:
        text: Raw text from Milvus
        
    Returns:
        Cleaned and normalized text
    """
    if not text:
        return ""
    
    # Handle literal \n strings (convert to actual newlines)
    # This is the key step - we need to convert the string "\n" to actual newline character
    text = text.replace('\\n', '\n')
    
    # Also handle case where it might be double-escaped
    text = text.replace('\\\\n', '\n')
    
    # Normalize problem category pipe separators (ensure single space on each side)
    text = re.sub(r'\s*\|\s*', ' | ', text)
    
    # Remove excessive newlines (max 2 consecutive newlines = 1 blank line)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Remove excessive spaces (max 1)
    text = re.sub(r' {2,}', ' ', text)
    
    # Add blank line before major section headers for better readability
    text = re.sub(r'\n(Problem Category:|Trade Context:|Exception Details:|Timeline:|Business Context:)', r'\n\n\1', text)
    
    # But keep "Exception:" on same line group as Problem Category
    text = re.sub(r'\n\n(Exception:)', r'\n\1', text)
    
    # Ensure single newline after section header colons (not blank line)
    text = re.sub(r'(Asset Type:|Clearing House:|Priority:|Current Action:|The failure point)', r'\1', text)
    
    # Clean up each line (remove trailing/leading whitespace per line)
    lines = [line.strip() for line in text.split('\n')]
    
    # Join lines back together
    text = '\n'.join(lines)
    
    # Remove any leading/trailing whitespace from entire text
    text = text.strip()
    
    # Final cleanup: ensure we don't have more than one consecutive blank line
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text


def extract_exception_summary(text: str) -> str:
    """
    Extract just the exception message (without metadata).
    
    Useful for getting a concise description of the exception
    without all the contextual information.
    
    Args:
        text: Full formatted narrative
        
    Returns:
        Just the exception message portion
    """
    if not text:
        return ""
    
    # Look for "Exception:" line and extract until next section
    match = re.search(r'Exception:\s*(.+?)(?:\n[A-Z][a-z]+ (?:Category|Context|Details|Timeline|Business Context):|$)', text, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    return text