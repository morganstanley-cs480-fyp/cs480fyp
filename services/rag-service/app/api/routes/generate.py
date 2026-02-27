"""
Generate solution routes for creating LLM-based solutions from similar cases.
"""
import logging
from typing import List, Dict, Any

from fastapi import APIRouter, Request, HTTPException, status
import httpx
from httpx import HTTPStatusError

from app.config.settings import settings
from app.services.bedrock_service import BedrockService
from app.services.gemini_service import GeminiService
from app.services.narrative_formatter import NarrativeFormatter
from app.schemas.document import (
    GenerateSolutionResponse,
    GeneratedSolution,
    HistoricalCase,
    SolutionData,
)

logging.basicConfig(level=logging.INFO)
router = APIRouter(prefix="/api/rag/generate", tags=["generate"])


@router.get("/{exception_id}", response_model=GenerateSolutionResponse)
async def generate_solution(
    request: Request,
    exception_id: str,
    limit: int = 3
) -> GenerateSolutionResponse:
    """
    Generate a custom solution for an exception based on similar historical cases.
    
    This endpoint:
    1. Performs similarity search to find top N similar exceptions from vector DB
    2. Retrieves exception narratives directly from vector DB (includes trade + transaction history)
    3. Fetches solution details for the similar exceptions from solution service
    4. Formats context with query and passes to LLM
    5. Generates solution for current exception
    
    Args:
        exception_id: The exception ID to generate solution for
        limit: Maximum number of similar cases to use as context (default: 3, max: 5)
        
    Returns:
        GenerateSolutionResponse with generated solution and historical context
        
    Raises:
        HTTPException 404: If exception_id not found
        HTTPException 400: If limit is invalid
    """
    # Validate limit
    if limit < 1 or limit > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 5"
        )
    
    try:
        # Step 1: Check if exception exists in Milvus, auto-ingest if not
        if not request.app.state.vector_store.exists_by_exception_id(exception_id):
            logging.info(f"Exception {exception_id} not found in Milvus, auto-ingesting...")
            
            try:
                # Fetch exception data
                async with httpx.AsyncClient(base_url=settings.EXCEPTION_SERVICE_URL) as client:
                    exception_response = await client.get(f"/api/exceptions/{exception_id}")
                    exception_response.raise_for_status()
                    exception_data = exception_response.json()
                    trade_id = exception_data.get("trade_id")

                # Fetch trade details
                async with httpx.AsyncClient(base_url=settings.TRADE_FLOW_SERVICE_URL) as client:
                    trade_response = await client.get(f"/api/trades/{trade_id}")
                    trade_response.raise_for_status()
                    trade_data = trade_response.json()

                # Fetch transaction history
                async with httpx.AsyncClient(base_url=settings.TRADE_FLOW_SERVICE_URL) as client:
                    history_response = await client.get(f"/api/trades/{trade_id}/history")
                    history_response.raise_for_status()
                    history_data = history_response.json()

                # Format narrative
                formatter = NarrativeFormatter()
                stitched_text = formatter.format_exception_narrative(
                    history_data, exception_data, trade_data, trade_id, exception_id
                )
                metadata = formatter.create_metadata(
                    history_data, exception_data, trade_data, trade_id, exception_id
                )

                # Generate embedding
                bedrock = BedrockService(
                    region_name=settings.AWS_REGION,
                    embed_model_id=settings.BEDROCK_EMBED_MODEL_ID,
                    chat_model_id=settings.BEDROCK_CHAT_MODEL_ID,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                )
                embedding = bedrock.get_embedding(stitched_text)

                # Store in Milvus
                request.app.state.vector_store.add_documents(
                    texts=[stitched_text],
                    embeddings=[embedding],
                    metadata=[metadata]
                )
                logging.info(f"Successfully auto-ingested exception {exception_id}")
                
            except HTTPStatusError as e:
                raise HTTPException(
                    status_code=e.response.status_code,
                    detail=f"Failed to fetch exception data: {e.response.text}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to auto-ingest exception: {str(e)}"
                )
        
        # Step 2: Find similar exceptions using vector store
        similar_docs = request.app.state.vector_store.find_similar_by_exception_id(
            exception_id=exception_id,
            limit=limit,
            exclude_self=True
        )
        
        if not similar_docs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No similar exceptions found for exception {exception_id}"
            )
        
        # Step 3: Fetch current exception narrative from vector DB
        current_exception_doc = request.app.state.vector_store.get_by_exception_id(exception_id)
        current_exception = {
            "exception_id": exception_id,
            "trade_id": current_exception_doc["metadata"].get("trade_id"),
            "narrative": current_exception_doc["text"]
        }
        
        # Step 4: Fetch historical cases (similar exceptions + their solutions)
        historical_cases = []
        for similar_doc in similar_docs:
            similar_exception_id = similar_doc["exception_id"]
            
            # Fetch solution for this exception
            solution = await _fetch_solution_by_exception_id(similar_exception_id)
            
            historical_cases.append(HistoricalCase(
                exception_id=similar_exception_id,
                trade_id=similar_doc["trade_id"],
                similarity_score=similar_doc["similarity_score"],
                exception_narrative=similar_doc["text"],
                solution=solution
            ))
        
        # Step 5: Format context and generate solution using LLM
        generated_solution = await _generate_solution_with_llm(
            current_exception=current_exception,
            historical_cases=historical_cases
        )
        
        return GenerateSolutionResponse(
            exception_id=exception_id,
            generated_solution=generated_solution,
            historical_cases=historical_cases,
            message=f"Successfully generated solution for exception {exception_id} based on {len(historical_cases)} historical case(s)"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in generate_solution: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating solution: {str(e)}"
        )





async def _fetch_solution_by_exception_id(exception_id: str) -> SolutionData | None:
    """
    Fetch solution for a given exception_id from solution service.
    
    Args:
        exception_id: The exception ID to fetch solution for
        
    Returns:
        SolutionData if found, None otherwise
    """
    try:
        # Fetch all solutions and filter by exception_id
        # Note: This is inefficient - ideally solution service should have GET /solutions/exception/{exception_id}
        async with httpx.AsyncClient(base_url=settings.SOLUTION_SERVICE_URL) as client:
            solutions_response = await client.get("/api/solutions/")
            solutions_response.raise_for_status()
            all_solutions = solutions_response.json()
            
            # Filter by exception_id (convert to int for comparison)
            exception_id_int = int(exception_id)
            matching_solutions = [s for s in all_solutions if s.get("exception_id") == exception_id_int]
            
            if matching_solutions:
                # Return the first matching solution
                solution_data = matching_solutions[0]
                return SolutionData(**solution_data)
            
            return None
            
    except HTTPStatusError as e:
        logging.warning(f"Failed to fetch solution for exception {exception_id}: {e.response.text}")
        return None
    except Exception as e:
        logging.warning(f"Error fetching solution for exception {exception_id}: {str(e)}")
        return None


async def _generate_solution_with_llm(
    current_exception: Dict[str, Any],
    historical_cases: List[HistoricalCase]
) -> GeneratedSolution:
    """
    Generate solution using LLM based on current exception and historical cases.
    
    Args:
        current_exception: Current exception with full context
        historical_cases: List of similar historical cases with solutions
        
    Returns:
        GeneratedSolution with structured analysis
    """
    # Build the prompt using the template provided
    system_prompt = """You are a senior OTC derivatives trade support analyst.
Your task is to analyze a new trade exception and propose the most appropriate resolution.
You are given:
1) The top 3 most similar historical exceptions with full transaction history and their confirmed solutions.
2) A new exception with its transaction history.

Use the historical cases as guidance, but do NOT copy blindly.
Analyze patterns, root causes, trade attributes, and lifecycle events.
If the new case differs materially from historical ones, explain why and adjust the solution accordingly.

Return your analysis in the following structured format:

ROOT CAUSE ANALYSIS:
[Your root cause analysis here]

RECOMMENDED RESOLUTION STEPS:
[Your recommended resolution steps here]

RISK CONSIDERATIONS:
[Your risk considerations here, or "None identified" if no significant risks]

CONFIDENCE LEVEL:
[High / Medium / Low]

Be precise, operational, and structured. Do not hallucinate missing trade data.
If information is insufficient, explicitly state what additional data is required."""

    # Format historical cases
    historical_context = "HISTORICAL EXCEPTIONS WITH CONFIRMED SOLUTIONS:\n\n"
    for i, case in enumerate(historical_cases, 1):
        historical_context += f"--- HISTORICAL CASE {i} (Similarity: {case.similarity_score:.1f}%) ---\n"
        historical_context += f"Exception ID: {case.exception_id}\n"
        historical_context += f"Trade ID: {case.trade_id}\n"
        historical_context += f"\nException Details:\n{case.exception_narrative}\n"
        
        if case.solution:
            historical_context += f"\nCONFIRMED SOLUTION:\n"
            historical_context += f"Title: {case.solution.title}\n"
            if case.solution.exception_description:
                historical_context += f"Exception Description: {case.solution.exception_description}\n"
            if case.solution.solution_description:
                historical_context += f"Solution: {case.solution.solution_description}\n"
            if case.solution.reference_event:
                historical_context += f"Reference Event: {case.solution.reference_event}\n"
            historical_context += f"Solution Score: {case.solution.scores}/27\n"
        else:
            historical_context += "\nCONFIRMED SOLUTION: No documented solution available\n"
        
        historical_context += "\n"
    
    # Format current exception (already formatted in vector DB)
    new_exception_context = f"""NEW EXCEPTION TO ANALYZE:
--- NEW CASE ---
Exception ID: {current_exception["exception_id"]}
Trade ID: {current_exception["trade_id"]}

Exception Details:
{current_exception["narrative"]}

Based on the historical cases above, provide your structured analysis below:"""

    # Combine into user prompt
    user_prompt = historical_context + "\n" + new_exception_context
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    # Call LLM based on provider
    if settings.LLM_PROVIDER == "google":
        gemini = GeminiService(
            model_id=settings.GOOGLE_MODEL_ID,
            google_api_key=settings.GOOGLE_API_KEY
        )
        llm_response = gemini.chat_completion(
            messages=messages,
            temperature=0.5,  # Lower temperature for more consistent analysis
            max_tokens=2000
        )
    else:
        bedrock = BedrockService(
            region_name=settings.AWS_REGION,
            embed_model_id=settings.BEDROCK_EMBED_MODEL_ID,
            chat_model_id=settings.BEDROCK_CHAT_MODEL_ID,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        llm_response = bedrock.chat_completion(
            messages=messages,
            temperature=0.5,
            max_tokens=2000
        )
    
    # Parse the structured response
    parsed_solution = _parse_llm_response(llm_response, current_exception["exception_id"])
    
    return parsed_solution


def _parse_llm_response(llm_response: str, exception_id: str) -> GeneratedSolution:
    """
    Parse LLM response into structured GeneratedSolution.
    
    Args:
        llm_response: Raw LLM response text
        exception_id: Exception ID for the solution
        
    Returns:
        GeneratedSolution with parsed fields
    """
    # Parse sections from the response
    root_cause = ""
    resolution_steps = ""
    risk_considerations = ""
    confidence_level = ""
    
    # Split by section headers
    sections = {
        "ROOT CAUSE ANALYSIS:": "root_cause",
        "RECOMMENDED RESOLUTION STEPS:": "resolution_steps",
        "RISK CONSIDERATIONS:": "risk_considerations",
        "CONFIDENCE LEVEL:": "confidence_level"
    }
    
    current_section = None
    section_content = {key: [] for key in sections.values()}
    
    for line in llm_response.split("\n"):
        line_stripped = line.strip()
        
        # Check if line is a section header
        section_found = False
        for header, section_key in sections.items():
            if header in line_stripped:
                current_section = section_key
                section_found = True
                # Capture any content after the header on the same line
                content_after_header = line_stripped.split(header, 1)[1].strip()
                if content_after_header:
                    section_content[section_key].append(content_after_header)
                break
        
        # If not a header and we're in a section, add to that section
        if not section_found and current_section and line_stripped:
            section_content[current_section].append(line_stripped)
    
    # Join content for each section
    root_cause = "\n".join(section_content["root_cause"]).strip() or "Not specified"
    resolution_steps = "\n".join(section_content["resolution_steps"]).strip() or "Not specified"
    risk_considerations = "\n".join(section_content["risk_considerations"]).strip() or "None identified"
    confidence_level = "\n".join(section_content["confidence_level"]).strip() or "Medium"
    
    return GeneratedSolution(
        exception_id=exception_id,
        root_cause_analysis=root_cause,
        recommended_resolution_steps=resolution_steps,
        risk_considerations=risk_considerations,
        confidence_level=confidence_level,
        raw_response=llm_response
    )
