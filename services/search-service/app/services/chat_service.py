"""
Chat Service - LLM-led analytics with SQL guardrails.

Flow:
1. Use LLM to determine mode (table / analysis / both) and analysis dimensions
2. Extract structured filters using existing extraction service
3. Execute only parameterized, validated SQL
4. Optionally synthesize AI answer from SQL evidence
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Any

import google.generativeai as genai

from app.config.settings import settings
from app.database.connection import db_manager
from app.models.chat import ChatRequest, ChatResponse
from app.models.domain import ExtractedParams, Trade
from app.services.gemini_service import gemini_service as extraction_service
from app.services.kg_service import kg_service
from app.services.query_builder import query_builder
from app.services.query_history_service import query_history_service
from app.utils.logger import logger


class ChatService:
    """Chat orchestration for free-form analytics and row retrieval."""

    ALLOWED_DIMENSIONS = {
        "booking_system": "t.booking_system",
        "asset_type": "t.asset_type",
        "affirmation_system": "t.affirmation_system",
        "clearing_house": "t.clearing_house",
        "account": "t.account",
        "status": "t.status",
        "exception_message": "e.msg",
        "priority": "e.priority",
    }

    ALLOWED_PRIORITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}

    _SYSTEM_INSTRUCTION = (
        "You are an analytics assistant for a financial trade operations platform. "
        "Always call tools to fetch data before answering — never guess or fabricate numbers.\n\n"
        "MULTI-TOOL AND MULTI-CALL RULES — follow these strictly:\n"
        "- You MAY call the same tool more than once in the SAME turn with DIFFERENT arguments.\n"
        "- When a question asks to compare two dimensions (e.g. exception types AND asset types), "
        "call get_exception_analytics TWICE in the same turn: once with dimensions=['exception_message'] "
        "and again with dimensions=['asset_type'], then synthesise both results in your answer.\n"
        "- When a question asks for BOTH listing AND analysis, call get_trade_rows AND "
        "get_exception_analytics simultaneously in the same turn.\n"
        "- When a question asks for a breakdown AND a trend, call get_exception_analytics AND "
        "get_trade_timeseries simultaneously in the same turn.\n\n"
        "DIMENSION SELECTION RULES for get_exception_analytics:\n"
        "- User mentions 'booking system', 'trading platform', 'system' → dimensions: ['booking_system']\n"
        "- User mentions 'clearing house', 'cleared by', 'CCP' → dimensions: ['clearing_house']\n"
        "- User mentions 'asset type', 'asset class', 'CDS/IRS/FX/MBS' → dimensions: ['asset_type']\n"
        "- User mentions 'affirmation system' → dimensions: ['affirmation_system']\n"
        "- User mentions 'account' → dimensions: ['account']\n"
        "- User mentions 'status' → dimensions: ['status']\n"
        "- User mentions 'exception message', 'error message', 'error type' → dimensions: ['exception_message']\n"
        "- User mentions 'priority' → dimensions: ['priority']\n"
        "- When in doubt about a single grouping, default to ['booking_system']\n\n"
        "TOOL SELECTION RULES:\n"
        "- 'show', 'list', 'find', 'display', 'give me' → get_trade_rows\n"
        "- 'how many', 'which has most', 'breakdown', 'compare', 'top N', 'worst', 'rate' → get_exception_analytics\n"
        "- 'trend', 'chart', 'over time', 'monthly', 'weekly', 'by month' → get_trade_timeseries\n"
        "- 'counterparty', 'sent to', 'received from', 'transaction direction' → get_kg_analytics\n\n"
        "get_kg_analytics queries Neo4j for relationship-aware analytics across "
        "BookingSystem → Trade → Transaction → Exception paths.\n"
        "After receiving ALL tool results, synthesise them into one concise factual answer. "
        "If a specific filter returned no data, say so explicitly. Do not hallucinate data."
    )

    def __init__(self):
        self.query_builder = query_builder
        self.history = query_history_service
        self._chat_model = None
        self._fc_model = None

        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            # Basic model kept for the synthesis step in _generate_analysis_answer
            self._chat_model = genai.GenerativeModel(settings.GOOGLE_MODEL_ID)
            # Function-calling model drives the tool loop
            try:
                self._fc_model = genai.GenerativeModel(
                    model_name=settings.GOOGLE_MODEL_ID,
                    tools=[self._build_tool_declarations()],
                    system_instruction=self._SYSTEM_INSTRUCTION,
                )
                logger.info(
                    "ChatService initialised with native Gemini function calling",
                    extra={"model": settings.GOOGLE_MODEL_ID, "kg_enabled": bool(settings.NEO4J_URI)},
                )
            except Exception as exc:
                logger.warning(
                    "FC model init failed – tool loop will fall back to heuristics",
                    extra={"error": str(exc)},
                )
        else:
            logger.warning("GOOGLE_API_KEY missing - ChatService will use heuristic fallback")

    async def execute_chat(self, request: ChatRequest) -> ChatResponse:
        """Execute chat request and return table and/or analysis outputs."""
        start_time = time.time()
        query_id = 0

        try:
            query_id = await self.history.save_query(
                user_id=request.user_id,
                query_text=request.message,
                search_type="chat",
            )
        except Exception as exc:
            logger.warning("Failed to save chat query", extra={"error": str(exc)})

        try:
            # Convert conversation models to simple dicts for extraction
            conversation_context = [{"role": msg.role, "content": msg.content} for msg in request.conversation]

            extracted_params = await extraction_service.extract_parameters(
                query=request.message,
                user_id=request.user_id,
                current_date=datetime.now(),
                conversation=conversation_context,
            )
        except Exception as exc:
            logger.warning(
                "Extraction failed in chat flow, using empty filters",
                extra={"error": str(exc)},
            )
            extracted_params = ExtractedParams()

        loop_result = await self._run_tool_calling_loop(
            request=request,
            extracted_params=extracted_params,
        )

        mode = loop_result.get("mode", "both")
        table_results: list[Trade] = loop_result.get("table_results", [])
        evidence: dict[str, Any] = loop_result.get("evidence", {})
        ai_answer: str | None = loop_result.get("ai_answer")
        kg_evidence: dict[str, Any] = loop_result.get("kg_evidence", {})

        # Merge KG evidence into the evidence structure so it flows to the response
        if kg_evidence:
            evidence = {**evidence, "graph": kg_evidence} if isinstance(evidence, dict) else {"graph": kg_evidence}

        # The FC model produces ai_answer from the tool preview data directly.
        # Only invoke _generate_analysis_answer when the FC loop produced no text.
        if mode in ("analysis", "both") and not ai_answer:
            try:
                ai_answer = await self._generate_analysis_answer(
                    question=request.message,
                    evidence=evidence,
                    trades=table_results,
                    kg_evidence=kg_evidence,
                )
            except Exception as exc:
                logger.warning(
                    "AI answer generation failed",
                    extra={"error": str(exc)},
                )
                ai_answer = None

        follow_up_prompts = self._build_follow_up_prompts(
            mode=mode,
            evidence=evidence,
            has_table=bool(table_results),
        )

        execution_time_ms = (time.time() - start_time) * 1000

        return ChatResponse(
            mode=mode,
            query_id=query_id,
            total_results=len(table_results),
            results=table_results if mode in ("table", "both") else None,
            ai_answer=ai_answer,
            evidence=evidence if mode in ("analysis", "both") else None,
            follow_up_prompts=follow_up_prompts,
            execution_time_ms=execution_time_ms,
        )

    def _infer_mode_from_tools(self, tools_called: set[str]) -> str:
        """Infer the response mode based on which tools were invoked."""
        has_table = "get_trade_rows" in tools_called
        has_analysis = bool(
            {"get_exception_analytics", "get_trade_timeseries", "get_kg_analytics"} & tools_called
        )
        if has_table and has_analysis:
            return "both"
        if has_analysis:
            return "analysis"
        if has_table:
            return "table"
        return "both"

    def _accumulate_tool_result(
        self,
        fc_name: str,
        tool_result: dict[str, Any],
        table_results: list,
        analytics_evidence_list: list[dict[str, Any]],
        kg_evidence: dict[str, Any],
    ) -> tuple[list, list[dict[str, Any]], dict[str, Any]]:
        """Update accumulation state from a single tool call result."""
        if fc_name == "get_trade_rows":
            table_results = tool_result.get("table_results", table_results)
        elif fc_name in ("get_exception_analytics", "get_trade_timeseries"):
            ev = tool_result.get("evidence", {})
            if ev:
                analytics_evidence_list.append(ev)
        elif fc_name == "get_kg_analytics":
            kg_evidence = tool_result.get("kg_evidence", kg_evidence)
        return table_results, analytics_evidence_list, kg_evidence

    async def _run_tool_calling_loop(
        self,
        request: ChatRequest,
        extracted_params: ExtractedParams,
    ) -> dict[str, Any]:
        """
        Run the native Gemini function-calling loop.

        Gemini receives all tool definitions up-front and decides which to invoke
        (including in parallel within a single turn).  We execute every function
        call concurrently with asyncio.gather, send all results back in one turn,
        and repeat until Gemini emits a plain-text final answer.
        """
        if not self._fc_model:
            raise RuntimeError("ChatService: GOOGLE_API_KEY is not configured")

        table_results: list[Trade] = []
        analytics_evidence_list: list[dict[str, Any]] = []
        kg_evidence: dict[str, Any] = {}
        tools_called: set[str] = set()

        # Build the first user message: question + conversation history + SQL filters
        conversation_text = "\n".join(
            f"{m.role}: {m.content}" for m in request.conversation[-6:]
        )
        # Map extracted dimension hints so Gemini picks correct analytics grouping
        dimension_hint = self._infer_dimension_hint(request.message)

        initial_message = (
            f"INSTRUCTION: If you call get_exception_analytics, you MUST set "
            f"dimensions to {dimension_hint} because the user's question is about "
            f"{'and '.join(eval(dimension_hint))} — do not default to booking_system unless the user specifically asked about booking systems.\n\n"
            f"User question: {request.message}\n\n"
            f"Conversation history:\n{conversation_text or '(none)'}\n\n"
            f"Pre-extracted SQL filters (use these when calling SQL tools):\n"
            f"{extracted_params.model_dump_json()}\n\n"
            f"Today: {datetime.now().strftime('%Y-%m-%d')}"
        )

        chat = self._fc_model.start_chat(history=[])
        loop = asyncio.get_event_loop()

        def _send(content):
            return chat.send_message(
                content,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=1000,
                ),
            )

        try:
            response = await loop.run_in_executor(None, _send, initial_message)
        except Exception as exc:
            logger.warning(
                "FC model initial call failed",
                extra={"error": str(exc)},
            )
            raise

        for iteration in range(settings.CHAT_MAX_TOOL_ITERATIONS):
            # Collect every function call Gemini emitted in this turn
            function_calls = [
                part.function_call
                for part in response.parts
                if getattr(part, "function_call", None) and getattr(part.function_call, "name", None)
            ]

            if not function_calls:
                # No more tool calls — Gemini produced the final text answer
                break

            logger.info(
                "FC tool calls - iteration %d: %s",
                iteration + 1,
                [{
                    "name": fc.name,
                    "args": dict(fc.args)
                } for fc in function_calls],
            )

            # Pass args as a plain Python dict. Values that are proto ListComposite
            # (e.g. dimensions=[...]) are handled by the list() guard inside
            # _execute_tool_call rather than a broken deep-conversion here.
            converted_args_list = [dict(fc.args) for fc in function_calls]

            # Execute all tool calls for this turn concurrently
            tool_tasks = [
                self._execute_tool_call(
                    tool_name=fc.name,
                    args=args,
                    extracted_params=extracted_params,
                )
                for fc, args in zip(function_calls, converted_args_list, strict=False)
            ]
            tool_results_list = await asyncio.gather(*tool_tasks, return_exceptions=True)

            # Build function-response parts to send back
            fn_response_parts = []
            for fc, tool_result in zip(function_calls, tool_results_list, strict=False):
                tools_called.add(fc.name)

                if isinstance(tool_result, Exception):
                    logger.warning(
                        "Tool call %s raised an exception: %s", fc.name, str(tool_result)
                    )
                    result_payload: dict[str, Any] = {"error": str(tool_result)}
                else:
                    table_results, analytics_evidence_list, kg_evidence = (
                        self._accumulate_tool_result(
                            fc.name, tool_result,
                            table_results, analytics_evidence_list, kg_evidence,
                        )
                    )
                    result_payload = tool_result.get("result_preview", {})

                fn_response_parts.append(
                    genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=fc.name,
                            response={"result": json.dumps(result_payload, default=str)},
                        )
                    )
                )

            # Send all function results back to Gemini in a single turn
            try:
                response = await loop.run_in_executor(
                    None,
                    _send,
                    genai.protos.Content(role="user", parts=fn_response_parts),
                )
            except Exception as exc:
                logger.warning(
                    "FC model tool-response call failed", extra={"error": str(exc)}
                )
                break

        # Extract final answer text safely (response may not have .text if something went wrong)
        final_answer: str | None = None
        try:
            if response.text:
                final_answer = response.text.strip()
        except (ValueError, AttributeError):
            pass

        # Merge all analytics evidence collected across (possibly multiple) tool calls
        evidence = self._merge_analytics_evidence(analytics_evidence_list)

        # Infer mode from which tools were called rather than asking the LLM to declare it
        mode = self._infer_mode_from_tools(tools_called)

        return {
            "mode": mode,
            "ai_answer": final_answer,
            "table_results": table_results,
            "evidence": evidence,
            "kg_evidence": kg_evidence,
        }

    def _merge_analytics_evidence(self, evidence_list: list[dict[str, Any]]) -> dict[str, Any]:
        """Merge analytics evidence from multiple tool calls into one response dict.

        When Gemini calls get_exception_analytics twice in one turn (cross-dimensional
        analysis), this collects both results rather than letting the second overwrite
        the first.
        """
        if not evidence_list:
            return {}
        if len(evidence_list) == 1:
            return evidence_list[0]
        # Multiple calls — tag each row with its dimension group and merge into one list
        merged_rows: list[dict[str, Any]] = []
        all_dimensions: list[str] = []
        for ev in evidence_list:
            dim = ev.get("dimensions", ["unknown"])[0]
            if dim not in all_dimensions:
                all_dimensions.append(dim)
            for row in ev.get("rows", []):
                merged_rows.append({**row, "_dim_group": dim})
        return {
            "dimensions": all_dimensions,
            "rows": merged_rows,
            "chart": evidence_list[0].get("chart", {}),
            "metadata": {
                "sections": len(evidence_list),
                "row_count": len(merged_rows),
            },
            "sections": [
                {
                    "dimension": ev.get("dimensions", ["unknown"])[0],
                    "rows": ev.get("rows", []),
                    "chart": ev.get("chart", {}),
                }
                for ev in evidence_list
            ],
        }

    async def _execute_tool_call(
        self,
        tool_name: str,
        args: dict[str, Any],
        extracted_params: ExtractedParams,
    ) -> dict[str, Any]:
        """Execute approved tool call and return preview-safe output."""
        if tool_name == "get_trade_rows":
            sql_query, params = self.query_builder.build_from_extracted_params(extracted_params)
            self._validate_sql_or_raise(sql_query, params)
            records = await db_manager.fetch(sql_query, *params)
            trades = [Trade.from_db_record(record) for record in records]
            limit = int(args.get("limit", 20)) if args else 20
            limit = max(1, min(limit, 100))
            trades = trades[:limit]

            return {
                "table_results": trades,
                "result_preview": {
                    "row_count": len(trades),
                    "sample": [trade.model_dump() for trade in trades[:5]],
                },
            }

        if tool_name == "get_exception_analytics":
            dimensions = args.get("dimensions") or ["booking_system"]
            # Guard: proto ListComposite passes isinstance(list) after MessageToJson
            # conversion, but keep this as a fallback for any unexpected type
            if not isinstance(dimensions, list):
                try:
                    dimensions = list(dimensions)
                except TypeError:
                    dimensions = ["booking_system"]
            if not dimensions:
                dimensions = ["booking_system"]

            priority_filter = args.get("priority_filter")
            if priority_filter and not isinstance(priority_filter, list):
                priority_filter = None

            top_k = args.get("top_k", 10)
            try:
                top_k = int(top_k)
            except (TypeError, ValueError):
                top_k = 10
            top_k = max(1, min(top_k, 25))

            evidence = await self._build_analytics_evidence(
                extracted_params=extracted_params,
                dimensions=dimensions,
                priority_filter=priority_filter,
                top_k=top_k,
            )

            return {
                "evidence": evidence,
                "result_preview": {
                    "dimensions": evidence.get("dimensions", []),
                    "row_count": evidence.get("metadata", {}).get("row_count", 0),
                    "sample": evidence.get("rows", [])[:5],
                },
            }

        if tool_name == "get_trade_timeseries":
            year = args.get("year")
            try:
                year = int(year) if year is not None else None
            except (TypeError, ValueError):
                year = None

            status = args.get("status")
            status = str(status).upper().strip() if status else None
            if not status and "reject" in str(args.get("query", "")).lower():
                status = "REJECTED"
            if not status:
                status = "REJECTED"

            bucket = args.get("bucket", "month")
            if bucket not in {"month", "week"}:
                bucket = "month"

            evidence = await self._build_trade_timeseries_evidence(
                extracted_params=extracted_params,
                year=year,
                status=status,
                bucket=bucket,
            )

            return {
                "evidence": evidence,
                "result_preview": {
                    "dimensions": evidence.get("dimensions", []),
                    "row_count": evidence.get("metadata", {}).get("row_count", 0),
                    "sample": evidence.get("rows", [])[:5],
                },
            }

        if tool_name == "get_kg_analytics":
            if not settings.NEO4J_URI:
                return {"result_preview": {"error": "Knowledge graph not configured (NEO4J_URI missing)"}}
            kg_result = await kg_service.query(args)
            return {
                "kg_evidence": kg_result,
                "result_preview": {
                    "source": "knowledge_graph",
                    "dimension": kg_result.get("dimension"),
                    "row_count": kg_result.get("metadata", {}).get("row_count", 0),
                    "sample": kg_result.get("rows", [])[:5],
                },
            }

        return {"result_preview": {"error": f"Unsupported tool: {tool_name}"}}

    def _build_tool_declarations(self) -> "genai.protos.Tool":
        """Build native Gemini function declarations for all available tools."""
        S = genai.protos.Schema
        T = genai.protos.Type

        declarations = [
            genai.protos.FunctionDeclaration(
                name="get_trade_rows",
                description=(
                    "Fetch individual trade rows from the SQL database. "
                    "Use for 'show me', 'list', 'find', 'display' style requests."
                ),
                parameters=S(
                    type=T.OBJECT,
                    properties={
                        "limit": S(type=T.INTEGER, description="Max rows to return (1-100)"),
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_exception_analytics",
                description=(
                    "Aggregate exception counts from SQL grouped by one or two dimensions. "
                    "Use for 'which has most exceptions', 'breakdown by X', 'compare X vs Y', 'top N' questions. "
                    "IMPORTANT: always set dimensions to match what the user asked about — "
                    "e.g. clearing house questions → ['clearing_house'], asset type questions → ['asset_type'], "
                    "exception message questions → ['exception_message'], two dimensions → ['clearing_house', 'asset_type']."
                ),
                parameters=S(
                    type=T.OBJECT,
                    properties={
                        "dimensions": S(
                            type=T.ARRAY,
                            items=S(type=T.STRING),
                            description=(
                                "One or two dimensions to group by. "
                                "Must match the user's question topic exactly. "
                                "Allowed values: booking_system, asset_type, affirmation_system, "
                                "clearing_house, account, status, exception_message, priority. "
                                "Examples: user asks about clearing houses → ['clearing_house']; "
                                "user asks about asset types → ['asset_type']; "
                                "user asks to compare two things → ['clearing_house', 'asset_type']."
                            ),
                        ),
                        "priority_filter": S(
                            type=T.ARRAY,
                            items=S(type=T.STRING),
                            description="Filter by priorities: CRITICAL, HIGH, MEDIUM, LOW",
                        ),
                        "top_k": S(type=T.INTEGER, description="Number of top results to return (1-25)"),
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_trade_timeseries",
                description=(
                    "Get time-series trade counts bucketed by month or week from SQL. "
                    "Use for 'trend', 'chart', 'over time', 'monthly', 'weekly' requests."
                ),
                parameters=S(
                    type=T.OBJECT,
                    properties={
                        "year": S(type=T.INTEGER, description="Optional year filter"),
                        "status": S(type=T.STRING, description="Trade status e.g. REJECTED, CLEARED"),
                        "bucket": S(type=T.STRING, description="Time bucket: 'month' or 'week'"),
                        "query": S(type=T.STRING, description="Original user query for context"),
                    },
                ),
            ),
        ]

        # Only advertise the KG tool when Neo4j is configured
        if settings.NEO4J_URI:
            declarations.append(
                genai.protos.FunctionDeclaration(
                    name="get_kg_analytics",
                    description=(
                        "Query the knowledge graph (Neo4j) for relationship-aware analytics. "
                        "Use for counterparty analysis, transaction directions (sent/received), "
                        "or when graph traversal across BookingSystem \u2192 Trade \u2192 Transaction \u2192 Exception is needed."
                    ),
                    parameters=S(
                        type=T.OBJECT,
                        properties={
                            "dimension": S(
                                type=T.STRING,
                                description=(
                                    "Dimension to group by: BookingSystem, ClearingHouse, "
                                    "AffirmationSystem, Counterparty, Account, AssetType, TradeStatus, TransactionStatus. "
                                    "Use Counterparty to group by the entity transactions are sent to or received from."
                                ),
                            ),
                            "metric_target": S(
                                type=T.STRING,
                                description="What to count: Trade, Transaction, Exception",
                            ),
                            "asset_type_filter": S(type=T.STRING, description="CDS, IRS, FX, MBS, ABS"),
                            "trade_status_filter": S(
                                type=T.STRING, description="CLEARED, REJECTED, ALLEGED, CANCELLED"
                            ),
                            "exception_priority_filter": S(
                                type=T.STRING, description="CRITICAL, HIGH, MEDIUM, LOW"
                            ),
                            "exception_msg_filter": S(
                                type=T.STRING,
                                description="TIME OUT OF RANGE, INSUFFICIENT MARGIN, MAPPING ISSUE, MISSING BIC",
                            ),
                            "direction_filter": S(type=T.STRING, description="send or receive"),
                            "start_date": S(type=T.STRING, description="YYYY-MM-DD"),
                            "end_date": S(type=T.STRING, description="YYYY-MM-DD"),
                            "sort_order": S(type=T.STRING, description="ASC or DESC"),
                        },
                        required=["dimension", "metric_target"],
                    ),
                )
            )

        return genai.protos.Tool(function_declarations=declarations)

    def _infer_dimension_hint(self, message: str) -> str:
        """
        Map free-text keywords to the correct get_exception_analytics dimension value.
        Returns a comma-separated string hint passed to Gemini in the initial message.
        """
        lowered = message.lower()
        dims: list[str] = []

        if any(k in lowered for k in ("clearing house", "clearing_house", "ccp", "cleared by", "cms", "cme", "lch", "jscc", "otcchk")):
            dims.append("clearing_house")
        if any(k in lowered for k in ("asset type", "asset class", "cds", "irs", " fx ", "mbs", "abs")):
            dims.append("asset_type")
        if any(k in lowered for k in ("affirmation", "affirmed")):
            dims.append("affirmation_system")
        if any(k in lowered for k in ("booking system", "booking_system", "trading platform", "booked on")):
            dims.append("booking_system")
        if "account" in lowered:
            dims.append("account")
        if any(k in lowered for k in ("exception message", "error message", "error type", "exception msg", "missing bic", "mapping issue", "time out", "insufficient margin")):
            dims.append("exception_message")
        if "priority" in lowered:
            dims.append("priority")
        if any(k in lowered for k in ("status", "rejected", "cleared", "alleged", "cancelled")):
            dims.append("status")

        if not dims:
            dims = ["booking_system"]

        # Return at most two (the tool caps at 2 dimensions)
        return str(dims[:2])

    def _build_follow_up_prompts(
        self,
        mode: str,
        evidence: dict[str, Any],
        has_table: bool,
    ) -> list[str]:
        """Generate lightweight follow-up prompts for UI chips."""
        prompts: list[str] = []
        dimensions = evidence.get("dimensions", []) if isinstance(evidence, dict) else []

        if mode in ("analysis", "both"):
            if dimensions:
                first_dimension = dimensions[0].replace("_", " ")
                prompts.append(f"Break this down by {first_dimension} for CRITICAL only")
            prompts.append("Show top exception messages and impacted asset types")

        if mode in ("table", "both") and has_table:
            prompts.append("Explain why these trades are high risk")
            prompts.append("Filter these results to last 7 days")

        prompts.append("What trends do you see over time?")
        return prompts[:4]

    async def _build_analytics_evidence(
        self,
        extracted_params: ExtractedParams,
        dimensions: list[str],
        priority_filter: list[str] | None,
        top_k: int,
    ) -> dict[str, Any]:
        """Build grouped exception evidence using safe parameterized SQL."""
        safe_dimensions = [d for d in dimensions if d in self.ALLOWED_DIMENSIONS][:2]
        if not safe_dimensions:
            safe_dimensions = ["booking_system"]

        select_parts = []
        group_parts = []
        for idx, dimension in enumerate(safe_dimensions):
            sql_col = self.ALLOWED_DIMENSIONS[dimension]
            alias = f"dimension_{idx + 1}"
            select_parts.append(f"{sql_col} AS {alias}")
            group_parts.append(sql_col)

        query = f"""
            SELECT
                {', '.join(select_parts)},
                e.priority,
                COUNT(*) AS exception_count,
                COUNT(DISTINCT e.trade_id) AS affected_trades
            FROM exceptions e
            JOIN trades t ON t.id = e.trade_id
            WHERE 1=1
        """

        conditions = []
        values: list[Any] = []
        param_index = 1

        if extracted_params.accounts:
            conditions.append(f"t.account = ANY(${param_index}::text[])")
            values.append(extracted_params.accounts)
            param_index += 1

        if extracted_params.asset_types:
            conditions.append(f"t.asset_type = ANY(${param_index}::text[])")
            values.append(extracted_params.asset_types)
            param_index += 1

        if extracted_params.booking_systems:
            conditions.append(f"t.booking_system = ANY(${param_index}::text[])")
            values.append(extracted_params.booking_systems)
            param_index += 1

        if extracted_params.affirmation_systems:
            conditions.append(f"t.affirmation_system = ANY(${param_index}::text[])")
            values.append(extracted_params.affirmation_systems)
            param_index += 1

        if extracted_params.clearing_houses:
            conditions.append(f"t.clearing_house = ANY(${param_index}::text[])")
            values.append(extracted_params.clearing_houses)
            param_index += 1

        if extracted_params.statuses:
            conditions.append(f"t.status = ANY(${param_index}::text[])")
            values.append(extracted_params.statuses)
            param_index += 1

        if extracted_params.date_from:
            conditions.append(f"t.update_time >= ${param_index}::timestamp")
            values.append(datetime.strptime(extracted_params.date_from, "%Y-%m-%d").date())
            param_index += 1

        if extracted_params.date_to:
            conditions.append(f"t.update_time < (${param_index}::timestamp + INTERVAL '1 day')")
            values.append(datetime.strptime(extracted_params.date_to, "%Y-%m-%d").date())
            param_index += 1

        if priority_filter:
            conditions.append(f"e.priority = ANY(${param_index}::text[])")
            values.append(priority_filter)
            param_index += 1

        if conditions:
            query += " AND " + " AND ".join(conditions)

        query += f" GROUP BY {', '.join(group_parts)}, e.priority" " ORDER BY exception_count DESC" f" LIMIT {top_k}"

        self._validate_sql_or_raise(query, values)
        records = await db_manager.fetch(query, *values)

        evidence_rows: list[dict[str, Any]] = []
        for record in records:
            evidence_rows.append(dict(record))

        chart_labels: list[str] = []
        chart_values: list[int] = []

        for row in evidence_rows:
            first_dimension_value = str(row.get("dimension_1", "UNKNOWN"))
            if len(safe_dimensions) > 1:
                second_dimension_value = str(row.get("dimension_2", "UNKNOWN"))
                label = f"{first_dimension_value} · {second_dimension_value}"
            else:
                label = first_dimension_value

            chart_labels.append(label)
            chart_values.append(int(row.get("exception_count", 0) or 0))

        return {
            "dimensions": safe_dimensions,
            "rows": evidence_rows,
            "chart": {
                "title": "Exception Count by Dimension",
                "x_key": "label",
                "y_key": "exception_count",
                "labels": chart_labels,
                "series": [
                    {
                        "name": "exception_count",
                        "data": chart_values,
                    }
                ],
            },
            "metadata": {
                "top_k": top_k,
                "priority_filter": priority_filter,
                "row_count": len(evidence_rows),
            },
        }

    async def _generate_analysis_answer(
        self,
        question: str,
        evidence: dict[str, Any],
        trades: list[Trade],
        kg_evidence: dict[str, Any] | None = None,
    ) -> str:
        """Generate narrative answer from SQL evidence, KG evidence, and trade rows."""
        if not self._chat_model:
            raise RuntimeError("ChatService: GOOGLE_API_KEY is not configured")

        limited_trades = [trade.model_dump() for trade in trades[:30]]
        kg_rows = kg_evidence.get("rows", [])[:25] if kg_evidence else []

        # Multi-section evidence (cross-dimensional): render each section separately
        sections = evidence.get("sections", []) if isinstance(evidence, dict) else []
        if sections:
            sql_evidence_text = "\n".join(
                f"Section '{sec['dimension']}' rows:\n{json.dumps(sec['rows'][:20], default=str)}"
                for sec in sections
            )
        else:
            sql_rows = evidence.get("rows", []) if isinstance(evidence, dict) else []
            sql_evidence_text = json.dumps(sql_rows[:50], default=str)

        kg_section = (
            f"\nKnowledge graph evidence (relationship-aware analytics):\n"
            f"{json.dumps(kg_rows, default=str)}"
            if kg_rows
            else ""
        )

        prompt = f"""
You are a trade operations analytics assistant.
Answer the user question using ONLY the evidence provided below.
If evidence is sparse, explicitly say so.
Keep the response concise and factual.

User question:
{question}

SQL evidence rows (aggregated counts):
{sql_evidence_text}
{kg_section}
Trade sample rows:
{json.dumps(limited_trades, default=str)}
""".strip()

        response_text = await self._call_model(prompt)
        return response_text.strip()

    async def _build_trade_timeseries_evidence(
        self,
        extracted_params: ExtractedParams,
        year: int | None,
        status: str,
        bucket: str,
    ) -> dict[str, Any]:
        """Build time-series evidence from trades for graph-oriented prompts."""
        if bucket == "week":
            label_expr = "TO_CHAR(DATE_TRUNC('week', t.update_time), 'IYYY-\"W\"IW')"
            title_bucket = "Week"
            group_expr = "DATE_TRUNC('week', t.update_time)"
        else:
            label_expr = "TO_CHAR(DATE_TRUNC('month', t.update_time), 'YYYY-MM')"
            title_bucket = "Month"
            group_expr = "DATE_TRUNC('month', t.update_time)"

        query = f"""
            SELECT
                {label_expr} AS dimension_1,
                t.status AS priority,
                COUNT(*) AS exception_count,
                COUNT(DISTINCT t.id) AS affected_trades
            FROM trades t
            WHERE 1=1
        """

        conditions = ["t.status = $1::text"]
        values: list[Any] = [status]
        param_index = 2

        if extracted_params.accounts:
            conditions.append(f"t.account = ANY(${param_index}::text[])")
            values.append(extracted_params.accounts)
            param_index += 1

        if extracted_params.asset_types:
            conditions.append(f"t.asset_type = ANY(${param_index}::text[])")
            values.append(extracted_params.asset_types)
            param_index += 1

        if extracted_params.booking_systems:
            conditions.append(f"t.booking_system = ANY(${param_index}::text[])")
            values.append(extracted_params.booking_systems)
            param_index += 1

        if extracted_params.affirmation_systems:
            conditions.append(f"t.affirmation_system = ANY(${param_index}::text[])")
            values.append(extracted_params.affirmation_systems)
            param_index += 1

        if extracted_params.clearing_houses:
            conditions.append(f"t.clearing_house = ANY(${param_index}::text[])")
            values.append(extracted_params.clearing_houses)
            param_index += 1

        if year is not None:
            conditions.append(f"EXTRACT(YEAR FROM t.update_time) = ${param_index}::integer")
            values.append(year)
            param_index += 1

        if extracted_params.date_from:
            conditions.append(f"t.update_time >= ${param_index}::timestamp")
            values.append(datetime.strptime(extracted_params.date_from, "%Y-%m-%d").date())
            param_index += 1

        if extracted_params.date_to:
            conditions.append(f"t.update_time < (${param_index}::timestamp + INTERVAL '1 day')")
            values.append(datetime.strptime(extracted_params.date_to, "%Y-%m-%d").date())
            param_index += 1

        query += " AND " + " AND ".join(conditions)
        query += f" GROUP BY {group_expr}, {label_expr}, t.status ORDER BY {group_expr} ASC"

        self._validate_sql_or_raise(query, values)
        records = await db_manager.fetch(query, *values)

        evidence_rows = [dict(record) for record in records]
        chart_labels = [str(row.get("dimension_1", "")) for row in evidence_rows]
        chart_values = [int(row.get("exception_count", 0) or 0) for row in evidence_rows]

        title_suffix = f" ({year})" if year is not None else ""
        return {
            "dimensions": ["time", "status"],
            "rows": evidence_rows,
            "chart": {
                "title": f"{status.title()} Trades by {title_bucket}{title_suffix}",
                "x_key": "label",
                "y_key": "exception_count",
                "labels": chart_labels,
                "series": [
                    {
                        "name": "exception_count",
                        "data": chart_values,
                    }
                ],
            },
            "metadata": {
                "top_k": len(evidence_rows),
                "priority_filter": [status],
                "row_count": len(evidence_rows),
                "source": "trades_timeseries",
                "year": year,
                "status": status,
            },
        }

    async def _call_model(self, prompt: str) -> str:
        """Invoke Gemini model in executor to avoid blocking event loop."""

        def _sync_call() -> str:
            response = self._chat_model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=700,
                ),
            )
            if not response.text:
                return ""
            return response.text.strip()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_call)

    def _validate_sql_or_raise(self, query: str, values: list[Any]) -> None:
        """Ensure all chat SQL uses same safety validator as search flow."""
        if not self.query_builder.validate_query_safety(query, values):
            raise ValueError("Generated chat SQL failed safety validation")


chat_service = ChatService()
