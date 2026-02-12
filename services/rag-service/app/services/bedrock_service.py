"""
Internal Bedrock service wrapper.

This module provides helper methods to:
- Generate embeddings using Amazon Nova 2 embedding model
- Generate chat completions using Llama 2 Chat
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
        "BEDROCK_EMBED_MODEL_ID",
        "amazon.nova-2-embedding-v1",
    )

    DEFAULT_CHAT_MODEL_ID = os.getenv(
        "BEDROCK_CHAT_MODEL_ID",
        "meta.llama2-13b-chat-v1",
    )

    def __init__(
        self,
        region_name: Optional[str] = None,
        embed_model_id: Optional[str] = None,
        chat_model_id: Optional[str] = None,
    ) -> None:
        self.region_name = region_name or os.getenv("AWS_REGION", "us-east-1")
        self.embed_model_id = embed_model_id or self.DEFAULT_EMBED_MODEL_ID
        self.chat_model_id = chat_model_id or self.DEFAULT_CHAT_MODEL_ID

        self._client = boto3.client(
            service_name="bedrock-runtime",
            region_name=self.region_name,
        )

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
    # Embeddings (Amazon Nova 2)
    # -----------------------------

    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector using Amazon Nova 2 embedding model.
        """
        if not text:
            raise ValueError("Text for embedding cannot be empty.")

        payload = {
            "inputText": text
        }

        response = self._invoke_model(self.embed_model_id, payload)

        # Expected embedding field (may vary depending on model version)
        embedding = response.get("embedding") or response.get("vector")

        if embedding is None:
            raise RuntimeError("Embedding not found in Bedrock response.")

        return embedding

    # -----------------------------
    # Chat Completion (Llama 2)
    # -----------------------------

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> str:
        """
        Generate a chat completion using Llama 2 Chat.

        :param messages: List of messages in the format:
            [
                {"role": "system", "content": "..."},
                {"role": "user", "content": "..."}
            ]
        """

        if not messages:
            raise ValueError("Messages cannot be empty.")

        # Convert messages into Llama 2 prompt format
        prompt = self._format_llama2_prompt(messages)

        payload = {
            "prompt": prompt,
            "temperature": temperature,
            "max_gen_len": max_tokens,
        }

        response = self._invoke_model(self.chat_model_id, payload)

        # Expected output field (varies by model version)
        generation = (
            response.get("generation")
            or response.get("outputText")
            or response.get("completions", [{}])[0].get("data", {}).get("text")
        )

        if not generation:
            raise RuntimeError("No generation returned from Bedrock.")

        return generation.strip()

    # -----------------------------
    # Helpers
    # -----------------------------

    def _format_llama2_prompt(self, messages: List[Dict[str, str]]) -> str:
        """
        Formats chat messages into Llama 2 chat prompt structure.
        """
        system_prompt = ""
        conversation = []

        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")

            if role == "system":
                system_prompt = content
            elif role == "user":
                conversation.append(f"[INST] {content} [/INST]")
            elif role == "assistant":
                conversation.append(content)

        if system_prompt:
            return f"<<SYS>>\n{system_prompt}\n<</SYS>>\n\n" + "\n".join(conversation)

        return "\n".join(conversation)
