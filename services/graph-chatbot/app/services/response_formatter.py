import json
import logging
from typing import List, Dict, Any
from app.models.schemas import AnalyticalIntent
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)

class ResponseFormatter:
    """Takes rich database results and uses Gemini to generate a human-readable summary."""

    SYSTEM_PROMPT = """
You are an expert Financial Data Communicator for a trading system chatbot.
Your job is to take raw database results and answer the user's original question clearly, accurately, and professionally.

DATA CONTEXT:
You will be provided with:
1. The User's Question.
2. The Analytical Intent (the filters and targets used to get the data).
3. The Database Results (JSON format).

UNDERSTANDING THE RESULTS JSON:
- 'dimension_value': The specific group being analyzed (e.g., a Booking System name, an Asset Type).
- 'metric': The primary aggregated number answering the user's question.
- Background Counts: 'trade_count', 'transaction_count', 'exception_count' provide overall scale.
- Sample Arrays: 'trade_details', 'transaction_details', 'exception_details' contain up to 10 actual raw records for that dimension.

RULES FOR YOUR RESPONSE:
1. Be Direct: Answer the question immediately in the first sentence using the aggregated 'metric'.
2. Provide Context: Use the background counts to provide a ratio if helpful (e.g., "Highgarden had 45 exceptions out of 1,200 total trades").
3. Cite Examples: Use the sample arrays to give concrete examples. (e.g., "For instance, trade TRD-1044 was rejected due to a MISSING BIC error.")
4. Be Professional: Use a clean, corporate financial tone. DO NOT mention "Cypher", "Neo4j", "Nodes", or "JSON arrays".
5. Handle Empty Data: If the results list is empty, politely inform the user that no records matched their criteria.
6. Formatting: Use bullet points if listing more than two dimension values to make it scannable.

Do not include conversational filler like "Hello" or "Here is the data." Just provide the analytical summary.
"""

    def __init__(self, gemini_service: GeminiService):
        self.gemini = gemini_service

    async def format_response(
        self, 
        user_question: str, 
        intent: AnalyticalIntent, 
        db_results: List[Dict[str, Any]]
    ) -> str:
        """Generate a natural language response based on DB results."""
        
        logger.info("Formatting response using LLM.")

        # 1. Handle completely empty results early to save LLM token costs
        if not db_results:
            target = intent.metric_target or "records"
            return f"I couldn't find any {target.lower()}s matching your criteria for the specified time period."

        # 2. Clean the intent to remove nulls (keeps the prompt context focused)
        clean_intent = {k: v for k, v in intent.model_dump().items() if v is not None}
        
        # 3. Prepare the payload
        user_prompt = f"""
        USER QUESTION: "{user_question}"
        
        ANALYTICAL INTENT (Filters applied):
        {json.dumps(clean_intent, indent=2)}
        
        DATABASE RESULTS:
        {json.dumps(db_results, default=str, indent=2)}
        
        Please provide the analytical summary and cite 1 or 2 specific examples from the details arrays if available.
        """

        try:
            # 4. Call Gemini to format the text
            response = await self.gemini.generate(
                system_prompt=self.SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.3,
                max_tokens=1000
            )
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"Failed to generate humanized response: {str(e)}")
            return self._generate_fallback_response(db_results, intent)

    def _generate_fallback_response(self, results: List[Dict], intent: AnalyticalIntent) -> str:
        """A simple string formatter if the LLM API is unreachable."""
        lines = [f"Here is the breakdown by {intent.dimension_to_group_by}:"]
        for row in results[:5]: # Show top 5
            dim = row.get("dimension_value", "Unknown")
            metric = row.get("metric", 0)
            target = intent.metric_target or "Items"
            lines.append(f"- {dim}: {metric} {target}s")
            
            # Optionally append one sample ID if it exists
            if row.get("exception_details") and len(row["exception_details"]) > 0:
                sample_id = row["exception_details"][0].get("id", "Unknown ID")
                lines.append(f"  (Example: {sample_id})")
                
        return "\n".join(lines)