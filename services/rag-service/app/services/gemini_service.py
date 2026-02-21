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