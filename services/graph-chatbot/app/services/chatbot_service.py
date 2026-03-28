import logging
import time
from app.models.schemas import ChatMessage, ChatResponse
from app.services.intent_extractor import IntentExtractor
from app.services.generic_query_builder import GenericQueryBuilder
from app.services.response_formatter import ResponseFormatter
from app.database.neo4j_client import Neo4jClient

logger = logging.getLogger(__name__)


class AnalyticalChatbot:
    """Main chatbot orchestrator"""
    
    def __init__(
        self,
        intent_extractor: IntentExtractor,
        query_builder: GenericQueryBuilder,
        response_formatter: ResponseFormatter,
        neo4j_client: Neo4jClient
    ):
        self.intent_extractor = intent_extractor
        self.query_builder = query_builder
        self.response_formatter = response_formatter
        self.neo4j = neo4j_client
    
    async def chat(self, message: ChatMessage) -> ChatResponse:
        """Process user message and return response"""
        
        start_time = time.time()
        
        try:
            logger.info(f"Processing query from user {message.user_id}: {message.question}")
            
            # Step 1: Extract intent
            intent = await self.intent_extractor.extract(message.question)
            logger.info(f"Intent extracted: {intent.dimension_to_group_by}")
            
            # Step 2: Build Cypher query
            cypher, params = await self.query_builder.build(intent)
            logger.info("Cypher query built")
            
            # Step 3: Execute Neo4j query
            raw_results = await self.neo4j.run(cypher, params)
            logger.info(f"Query executed, returned {len(raw_results)} records")
            
            # Step 4: Format response
            response_text = await self.response_formatter.format_response(
                raw_results,
                intent,
                message.question
            )
            logger.info("Response formatted")
            
            execution_time = time.time() - start_time
            
            return ChatResponse(
                user_id=message.user_id,
                question=message.question,
                response=response_text,
                intent=intent,
                raw_results=raw_results,
                execution_time_ms=execution_time * 1000
            )
        
        except ValueError as e:
            logger.warning(f"Validation error: {str(e)}")
            execution_time = time.time() - start_time
            return ChatResponse(
                user_id=message.user_id,
                question=message.question,
                response=f"I couldn't understand your question. {str(e)}",
                execution_time_ms=execution_time * 1000
            )
        
        except Exception as e:
            logger.error(f"Chatbot error: {str(e)}")
            execution_time = time.time() - start_time
            return ChatResponse(
                user_id=message.user_id,
                question=message.question,
                response=f"An error occurred: {str(e)}",
                execution_time_ms=execution_time * 1000
            )