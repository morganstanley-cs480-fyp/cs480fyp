"""
Internal Bedrock service wrapper.

This module provides helper methods to:
- Generate embeddings using Cohere embedding model
- Generate chat completions using AWS Bedrock models via Converse API
"""

import json
import os
from typing import List, Dict, Any, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError


class BedrockService:
    """
    Internal AWS Bedrock service wrapper.
    """

    # You can override these via environment variables if needed
    DEFAULT_EMBED_MODEL_ID = os.getenv(
        "BEDROCK_EMBED_MODEL_ID"
    )

    DEFAULT_CHAT_MODEL_ID = os.getenv(
        "BEDROCK_CHAT_MODEL_ID"
    )

    def __init__(
        self,
        region_name: Optional[str] = None,
        embed_model_id: Optional[str] = None,
        chat_model_id: Optional[str] = None,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
    ) -> None:
        self.region_name = region_name or os.getenv("AWS_REGION", "ap-southeast-1")
        self.embed_model_id = embed_model_id or self.DEFAULT_EMBED_MODEL_ID
        self.chat_model_id = chat_model_id or self.DEFAULT_CHAT_MODEL_ID

        # Build client kwargs
        client_kwargs = {
            "service_name": "bedrock-runtime",
            "region_name": self.region_name,
        }

        # Add credentials if provided (fallback to environment variables)
        access_key = aws_access_key_id or os.getenv("AWS_ACCESS_KEY_ID")
        secret_key = aws_secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY")

        if access_key and secret_key:
            client_kwargs["aws_access_key_id"] = access_key
            client_kwargs["aws_secret_access_key"] = secret_key

        self._client = boto3.client(**client_kwargs)

    # -----------------------------
    # Internal low-level invocation
    # -----------------------------

    def _invoke_model(self, model_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
        """
        Internal method to invoke a Bedrock model.
        """
        try:
            response = self._client.invoke_model(
                modelId=model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )

            response_body = json.loads(response["body"].read())
            return response_body

        except (BotoCoreError, ClientError) as e:
            raise RuntimeError(f"Bedrock invocation failed: {str(e)}") from e

    # -----------------------------
    # Embeddings
    # -----------------------------

    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector
        """
        if not text:
            raise ValueError("Text for embedding cannot be empty.")

        # Cohere format
        payload = {
            "texts": [text],
            "input_type": "search_document"  # or "search_query" for queries
        }

        response = self._invoke_model(self.embed_model_id, payload)

        # Cohere returns embeddings array
        embeddings = response.get("embeddings", [])
        if embeddings and len(embeddings) > 0:
            embedding = embeddings[0]
        else:
            raise RuntimeError("Embedding not found in Cohere response.")

        return embedding

    # -----------------------------
    # Chat Completion
    # -----------------------------

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> str:
        """
        Generate a chat completion using AWS Bedrock models.
        
        Automatically uses the appropriate API based on model type:
        - InvokeModel API for Amazon Nova models
        - Converse API for other models (Claude, etc.)

        :param messages: List of messages in the format:
            [
                {"role": "system", "content": "..."},
                {"role": "user", "content": "..."},
                {"role": "assistant", "content": "..."}
            ]
        """

        if not messages:
            raise ValueError("Messages cannot be empty.")

        # Check if using Nova model (use InvokeModel API)
        if "nova" in self.chat_model_id.lower():
            return self._chat_completion_invoke_model(messages, temperature, max_tokens)
        else:
            return self._chat_completion_converse(messages, temperature, max_tokens)

    def _chat_completion_invoke_model(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> str:
        """
        Chat completion using InvokeModel API (for Amazon Nova models).
        """
        # Separate system messages from conversation
        system_text = ""
        formatted_messages = []
        
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")
            
            if role == "system":
                # Collect system messages
                system_text += content + "\n"
            elif role in ["user", "assistant"]:
                formatted_messages.append({
                    "role": role,
                    "content": [{"text": content}]
                })

        # Prepend system message to first user message if exists
        if system_text and formatted_messages:
            for i, msg in enumerate(formatted_messages):
                if msg["role"] == "user":
                    original_text = msg["content"][0]["text"]
                    msg["content"][0]["text"] = f"{system_text.strip()}\n\n{original_text}"
                    break

        payload = {
            "messages": formatted_messages,
            "inferenceConfig": {
                "temperature": temperature,
                "max_new_tokens": max_tokens,
            }
        }

        try:
            response = self._invoke_model(self.chat_model_id, payload)
            
            # Extract text from Nova response
            output = response.get("output", {})
            message = output.get("message", {})
            content_blocks = message.get("content", [])
            
            if not content_blocks:
                raise RuntimeError("No content returned from Nova model.")
            
            generation = content_blocks[0].get("text", "")
            
            if not generation:
                raise RuntimeError("No text generation returned from Nova model.")
            
            return generation.strip()
            
        except RuntimeError:
            raise
        except Exception as e:
            raise RuntimeError(f"Nova InvokeModel API failed: {str(e)}") from e

    def _chat_completion_converse(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> str:
        """
        Chat completion using Converse API (for Claude and other models).
        """
        # Separate system messages from conversation messages
        system_prompts = []
        conversation_messages = []

        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")

            if role == "system":
                system_prompts.append({"text": content})
            else:
                # Format for Converse API
                conversation_messages.append({
                    "role": role,
                    "content": [{"text": content}]
                })

        try:
            # Build converse request
            converse_kwargs = {
                "modelId": self.chat_model_id,
                "messages": conversation_messages,
                "inferenceConfig": {
                    "temperature": temperature,
                    "maxTokens": max_tokens,
                }
            }

            # Add system prompts if present
            if system_prompts:
                converse_kwargs["system"] = system_prompts

            # Call Converse API
            response = self._client.converse(**converse_kwargs)

            # Extract the generated text
            output_message = response.get("output", {}).get("message", {})
            content_blocks = output_message.get("content", [])

            if not content_blocks:
                raise RuntimeError("No content returned from Bedrock Converse API.")

            # Get the first text block
            generation = content_blocks[0].get("text", "")

            if not generation:
                raise RuntimeError("No text generation returned from Bedrock.")

            return generation.strip()

        except (BotoCoreError, ClientError) as e:
            raise RuntimeError(f"Bedrock Converse API failed: {str(e)}") from e
