import json
import logging
import google.generativeai as genai

logger = logging.getLogger(__name__)


class GeminiService:
    """Google Gemini LLM integration (free)"""
    
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        
        self.model = genai.GenerativeModel("gemini-2.5-flash-lite")
    
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """Generate response from Gemini"""
        
        try:
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens
                )
            )
            
            logger.info("Generated response from Gemini")
            return response.text
        
        except Exception as e:
            logger.error(f"Gemini error: {str(e)}")
            raise