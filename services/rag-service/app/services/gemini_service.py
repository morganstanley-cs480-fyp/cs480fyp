"""
Google Gemini service wrapper for chat completion.
"""

import os
from typing import List, Dict, Optional

import google.generativeai as genai


class GeminiService:
    """
    Google Gemini service wrapper for LLM chat completion.
    """

    DEFAULT_MODEL_ID = os.getenv("GOOGLE_MODEL_ID", "gemini-2.5-flash-lite")

    def __init__(
        self,
        model_id: Optional[str] = None,
        google_api_key: Optional[str] = None,
    ) -> None:
        """
        Initialize Gemini service.
        
        Args:
            model_id: Gemini model ID (e.g., "gemini-2.5-flash-lite")
            google_api_key: Google AI API key
        """
        self.model_id = model_id or self.DEFAULT_MODEL_ID
        
        # Get API key
        api_key = google_api_key or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("Google API key is required. Set GOOGLE_API_KEY environment variable.")
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # Initialize model
        self.model = genai.GenerativeModel(self.model_id)

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> str:
        """
        Generate a chat completion using Google Gemini.
        
        Args:
            messages: List of messages in the format:
                [
                    {"role": "system", "content": "..."},
                    {"role": "user", "content": "..."},
                    {"role": "assistant", "content": "..."}
                ]
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
        
        Returns:
            Generated text completion
            
        Raises:
            ValueError: If messages are empty or invalid
            RuntimeError: If Gemini API call fails
        """
        if not messages:
            raise ValueError("Messages cannot be empty.")

        # Convert messages to Gemini format
        gemini_messages = self._convert_messages_to_gemini_format(messages)
        
        # Configure generation parameters
        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        
        try:
            # Generate response
            response = self.model.generate_content(
                gemini_messages,
                generation_config=generation_config,
            )
            
            # Extract text
            if not response.text:
                raise RuntimeError("No text generation returned from Gemini.")
            
            return response.text.strip()
            
        except Exception as e:
            raise RuntimeError(f"Gemini API call failed: {str(e)}") from e

    def _convert_messages_to_gemini_format(
        self, messages: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        Convert standard chat messages to Gemini format.
        
        Gemini expects:
        - System messages prepended to first user message
        - Only "user" and "model" roles (not "assistant")
        """
        gemini_messages = []
        system_content = ""
        
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")
            
            if role == "system":
                # Accumulate system messages
                system_content += content + "\n"
            elif role == "user":
                # Prepend system content to first user message
                if system_content:
                    content = f"{system_content.strip()}\n\n{content}"
                    system_content = ""  # Clear after prepending
                
                gemini_messages.append({
                    "role": "user",
                    "parts": [content]
                })
            elif role == "assistant":
                # Convert "assistant" to "model" for Gemini
                gemini_messages.append({
                    "role": "model",
                    "parts": [content]
                })
        
        return gemini_messages
    
    def batch_explain_similarities(
        self,
        source_text: str,
        similar_texts: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 1500,
    ) -> List[str]:
        """
        Generate explanations for why multiple documents are similar to a source document.
        
        Args:
            source_text: The source exception narrative
            similar_texts: List of dicts with 'exception_id' and 'text' keys
            temperature: Lower temperature for more factual explanations
            max_tokens: Max tokens for all explanations combined
            
        Returns:
            List of explanation strings, one per similar document
        """
        if not similar_texts:
            return []
        
        # Build a structured prompt for batch processing
        system_prompt = (
            "You are an expert at analyzing trade exception similarities. "
            "Given a source exception and multiple similar exceptions, "
            "explain WHY each similar exception is related to the source. "
            "Focus on: shared patterns, common error types, similar trade flows, "
            "matching securities/parties, or comparable settlement issues. "
            "Keep each explanation concise (2-3 sentences)."
        )
        
        # Build the comparison prompt
        user_prompt = f"SOURCE EXCEPTION:\n{source_text}\n\n---\n\n"
        user_prompt += "SIMILAR EXCEPTIONS TO ANALYZE:\n\n"
        
        for i, doc in enumerate(similar_texts, 1):
            user_prompt += f"[EXCEPTION {i}] (ID: {doc['exception_id']})\n"
            user_prompt += f"{doc['text']}\n\n"
        
        user_prompt += (
            "---\n\n"
            "For each similar exception above, provide a brief explanation of WHY it is similar "
            "to the source exception. Format your response EXACTLY as follows:\n\n"
            "[EXCEPTION 1]\n[Your explanation here]\n\n"
            "[EXCEPTION 2]\n[Your explanation here]\n\n"
            "[EXCEPTION 3]\n[Your explanation here]\n\n"
            "Do not include any other text or formatting."
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Call LLM
        response_text = self.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        # Parse the response to extract individual explanations
        explanations = self._parse_batch_explanations(response_text, len(similar_texts))
        
        return explanations
    
    def _parse_batch_explanations(self, response_text: str, expected_count: int) -> List[str]:
        """
        Parse batch explanation response into individual explanations.
        
        Expected format:
        [EXCEPTION 1]
        Explanation text here...
        
        [EXCEPTION 2]
        Explanation text here...
        """
        import re
        
        explanations = []
        
        # Split by exception markers
        parts = re.split(r'\[EXCEPTION \d+\]', response_text)
        
        # Skip the first part (before first marker) and clean each explanation
        for part in parts[1:]:
            explanation = part.strip()
            if explanation:
                explanations.append(explanation)
        
        # If parsing failed, fall back to splitting by double newlines
        if len(explanations) != expected_count:
            explanations = [
                ex.strip() 
                for ex in response_text.split('\n\n') 
                if ex.strip() and not ex.strip().startswith('[EXCEPTION')
            ]
        
        # Ensure we have the right number of explanations
        while len(explanations) < expected_count:
            explanations.append("Unable to generate explanation.")
        
        return explanations[:expected_count]