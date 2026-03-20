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
import re
import time
from datetime import datetime
from typing import Any

import google.generativeai as genai

from app.config.settings import settings
from app.database.connection import db_manager
from app.models.chat import ChatRequest, ChatResponse
from app.models.domain import ExtractedParams, Trade
from app.services.gemini_service import gemini_service as extraction_service
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
    TIME_SERIES_KEYWORDS = {
        "graph",
        "chart",
        "time series",
        "timeseries",
        "trend",
        "monthly",
        "month",
        "weekly",
        "week",
        "over time",
    }

    def __init__(self):
        self.query_builder = query_builder
        self.history = query_history_service
        self._chat_model = None

        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self._chat_model = genai.GenerativeModel(settings.GOOGLE_MODEL_ID)
            logger.info(
                "ChatService initialized with Gemini",
                extra={"model": settings.GOOGLE_MODEL_ID},
            )
        else:
            logger.warning(
                "GOOGLE_API_KEY missing - ChatService will use heuristic fallback"
            )

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
            conversation_context = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation
            ]

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

        try:
            loop_result = await self._run_tool_calling_loop(
                request=request,
                extracted_params=extracted_params,
            )
        except Exception as exc:
            logger.warning(
                "Tool-calling loop failed, falling back to heuristic flow",
                extra={"error": str(exc)},
            )
            loop_result = await self._fallback_non_tool_flow(request, extracted_params)

        mode = loop_result.get("mode", "both")
        table_results: list[Trade] = loop_result.get("table_results", [])
        evidence: dict[str, Any] = loop_result.get("evidence", {})
        ai_answer: str | None = loop_result.get("ai_answer")

        pre_context_table_count = len(table_results)
        pre_context_evidence_count = len(evidence.get("rows", [])) if evidence else 0

        if self._is_time_series_query(request.message) and mode == "table":
            mode = "both"

        table_results, evidence = await self._ensure_dual_data_context(
            request=request,
            extracted_params=extracted_params,
            table_results=table_results,
            evidence=evidence,
        )

        has_more_context = (
            len(table_results) > pre_context_table_count
            or (len(evidence.get("rows", [])) if evidence else 0)
            > pre_context_evidence_count
        )

        if mode in ("analysis", "both") and (not ai_answer or has_more_context):
            try:
                ai_answer = await self._generate_analysis_answer(
                    question=request.message,
                    evidence=evidence,
                    trades=table_results,
                )
            except Exception as exc:
                logger.warning(
                    "AI answer generation failed, using heuristic summary",
                    extra={"error": str(exc)},
                )
                ai_answer = self._heuristic_summary(evidence, table_results)

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

    async def _run_tool_calling_loop(
        self,
        request: ChatRequest,
        extracted_params: ExtractedParams,
    ) -> dict[str, Any]:
        """Run iterative LLM tool-calling loop with strict cap and logging."""
        if not self._chat_model:
            return await self._fallback_non_tool_flow(request, extracted_params)

        tool_outputs: list[dict[str, Any]] = []
        table_results: list[Trade] = []
        evidence: dict[str, Any] = {}
        final_mode = "both"
        final_answer: str | None = None

        for iteration in range(1, settings.CHAT_MAX_TOOL_ITERATIONS + 1):
            prompt = self._build_tool_loop_prompt(
                request=request,
                extracted_params=extracted_params,
                tool_outputs=tool_outputs,
                iteration=iteration,
                max_iterations=settings.CHAT_MAX_TOOL_ITERATIONS,
            )

            try:
                response_text = await self._call_model(prompt)
            except Exception as exc:
                logger.warning(
                    "LLM call failed inside tool loop iteration",
                    extra={"iteration": iteration, "error": str(exc)},
                )
                break
            parsed = self._safe_json_parse(response_text)
            response_type = parsed.get("type")

            logger.info(
                "Chat tool loop iteration",
                extra={
                    "iteration": iteration,
                    "response_type": response_type,
                    "has_tool_outputs": bool(tool_outputs),
                },
            )

            if response_type == "final":
                mode = parsed.get("mode", "both")
                if mode in {"table", "analysis", "both"}:
                    final_mode = mode
                final_answer = parsed.get("ai_answer")
                break

            if response_type != "tool_call":
                continue

            tool_name = parsed.get("tool")
            tool_args = parsed.get("args") or {}

            tool_result = await self._execute_tool_call(
                tool_name=tool_name,
                args=tool_args,
                extracted_params=extracted_params,
            )

            if tool_name == "get_trade_rows":
                table_results = tool_result.get("table_results", table_results)
            if tool_name == "get_exception_analytics":
                evidence = tool_result.get("evidence", evidence)

            tool_outputs.append(
                {
                    "tool": tool_name,
                    "args": tool_args,
                    "result": tool_result.get("result_preview", {}),
                }
            )

        if not final_answer and final_mode in ("analysis", "both"):
            final_answer = await self._generate_analysis_answer(
                question=request.message,
                evidence=evidence,
                trades=table_results,
            )

        return {
            "mode": final_mode,
            "ai_answer": final_answer,
            "table_results": table_results,
            "evidence": evidence,
        }

    async def _execute_tool_call(
        self,
        tool_name: str,
        args: dict[str, Any],
        extracted_params: ExtractedParams,
    ) -> dict[str, Any]:
        """Execute approved tool call and return preview-safe output."""
        if tool_name == "get_trade_rows":
            sql_query, params = self.query_builder.build_from_extracted_params(
                extracted_params
            )
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
            if not isinstance(dimensions, list):
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

        return {"result_preview": {"error": f"Unsupported tool: {tool_name}"}}

    def _build_tool_loop_prompt(
        self,
        request: ChatRequest,
        extracted_params: ExtractedParams,
        tool_outputs: list[dict[str, Any]],
        iteration: int,
        max_iterations: int,
    ) -> str:
        """Build strict JSON tool-loop prompt for Gemini."""
        conversation_lines = [f"{msg.role}: {msg.content}" for msg in request.conversation[-6:]]
        conversation_text = "\n".join(conversation_lines) if conversation_lines else "(none)"

        return f"""
You are an assistant that must decide one next action for analytics chat.

Available tools:
1) get_trade_rows(args: {{"limit": number}})
2) get_exception_analytics(args: {{"dimensions": string[], "priority_filter": string[] | null, "top_k": number}})
3) get_trade_timeseries(args: {{"year": number | null, "status": string | null, "bucket": "month" | "week", "query": string | null}})

Allowed dimensions: booking_system, asset_type, affirmation_system, clearing_house, account, status, exception_message, priority.
Allowed priorities: CRITICAL, HIGH, MEDIUM, LOW.

Current iteration: {iteration} / {max_iterations}
User query: {request.message}
Conversation context:
{conversation_text}

Extracted trade filters JSON:
{extracted_params.model_dump_json()}

Tool outputs so far:
{json.dumps(tool_outputs, default=str)}

Respond ONLY valid JSON in one of these forms:

Tool call:
{{
  "type": "tool_call",
    "tool": "get_trade_rows" | "get_exception_analytics" | "get_trade_timeseries",
  "args": {{...}}
}}

Final answer:
{{
  "type": "final",
  "mode": "table" | "analysis" | "both",
  "ai_answer": "string"
}}

Rules:
- Prefer tool_call when you need data.
- For graph/trend/time-series requests, prefer get_trade_timeseries.
- Use final only when confident.
- Keep ai_answer concise and factual.
""".strip()

    async def _fallback_non_tool_flow(
        self,
        request: ChatRequest,
        extracted_params: ExtractedParams,
    ) -> dict[str, Any]:
        """Fallback non-tool path when Gemini chat model is unavailable."""
        mode_info = self._heuristic_mode(request.message)
        mode = mode_info.get("mode", "both")
        dimensions = mode_info.get("analysis_dimensions", ["booking_system"])
        priority_filter = mode_info.get("priority_filter")
        top_k = mode_info.get("top_k", 10)

        table_results: list[Trade] = []
        evidence: dict[str, Any] = {}

        if mode in ("table", "both"):
            sql_query, params = self.query_builder.build_from_extracted_params(
                extracted_params
            )
            self._validate_sql_or_raise(sql_query, params)
            records = await db_manager.fetch(sql_query, *params)
            table_results = [Trade.from_db_record(record) for record in records]

        if mode in ("analysis", "both"):
            evidence = await self._build_analytics_evidence(
                extracted_params=extracted_params,
                dimensions=dimensions,
                priority_filter=priority_filter,
                top_k=top_k,
            )

        ai_answer = None
        if mode in ("analysis", "both"):
            ai_answer = self._heuristic_summary(evidence, table_results)

        return {
            "mode": mode,
            "ai_answer": ai_answer,
            "table_results": table_results,
            "evidence": evidence,
        }

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

    async def _determine_mode(self, request: ChatRequest) -> dict[str, Any]:
        """Use LLM to decide mode and analysis intent, with strict JSON response."""
        if not self._chat_model:
            return self._heuristic_mode(request.message)

        history_lines = [
            f"{msg.role}: {msg.content}" for msg in request.conversation[-6:]
        ]
        history_text = "\n".join(history_lines) if history_lines else "(none)"

        prompt = f"""
You are a routing assistant for a trade analytics chatbot.
Return ONLY valid JSON with this schema:
{{
  "mode": "table" | "analysis" | "both",
  "analysis_dimensions": ["booking_system"|"asset_type"|"affirmation_system"|"clearing_house"|"account"|"status"|"exception_message"|"priority"],
  "priority_filter": ["CRITICAL"|"HIGH"|"MEDIUM"|"LOW"] | null,
  "top_k": integer
}}

Routing guidance:
- "table": user is asking to list/show/find trades.
- "analysis": user asks why/pattern/trend/common/highest/risk/comparison.
- "both": user asks for listing plus explanation.

Conversation:
{history_text}

Latest user query:
{request.message}
""".strip()

        response_text = await self._call_model(prompt)
        parsed = self._safe_json_parse(response_text)

        mode = parsed.get("mode", "both")
        if mode not in {"table", "analysis", "both"}:
            mode = "both"

        dimensions = parsed.get("analysis_dimensions") or ["booking_system"]
        cleaned_dimensions = [
            dim for dim in dimensions if dim in self.ALLOWED_DIMENSIONS
        ]
        if not cleaned_dimensions:
            cleaned_dimensions = ["booking_system"]

        priority_filter = parsed.get("priority_filter")
        if priority_filter:
            priority_filter = [
                value
                for value in priority_filter
                if value in self.ALLOWED_PRIORITIES
            ]
        else:
            priority_filter = None

        top_k = parsed.get("top_k", 10)
        try:
            top_k = int(top_k)
        except (TypeError, ValueError):
            top_k = 10
        top_k = max(1, min(top_k, 25))

        return {
            "mode": mode,
            "analysis_dimensions": cleaned_dimensions[:2],
            "priority_filter": priority_filter,
            "top_k": top_k,
        }

    def _heuristic_mode(self, message: str) -> dict[str, Any]:
        """Fallback mode routing if chat model is unavailable."""
        lowered = message.lower()
        analysis_words = [
            "highest",
            "common",
            "why",
            "trend",
            "risk",
            "compare",
            "summary",
            "analyze",
            "analysis",
        ]
        table_words = ["show", "list", "find", "get", "display"]

        has_analysis = any(word in lowered for word in analysis_words)
        has_table = any(word in lowered for word in table_words)

        if has_analysis and has_table:
            mode = "both"
        elif has_analysis:
            mode = "analysis"
        else:
            mode = "table"

        return {
            "mode": mode,
            "analysis_dimensions": ["booking_system"],
            "priority_filter": None,
            "top_k": 10,
        }

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
            conditions.append(
                f"t.update_time < (${param_index}::timestamp + INTERVAL '1 day')"
            )
            values.append(datetime.strptime(extracted_params.date_to, "%Y-%m-%d").date())
            param_index += 1

        if priority_filter:
            conditions.append(f"e.priority = ANY(${param_index}::text[])")
            values.append(priority_filter)
            param_index += 1

        if conditions:
            query += " AND " + " AND ".join(conditions)

        query += (
            f" GROUP BY {', '.join(group_parts)}, e.priority"
            " ORDER BY exception_count DESC"
            f" LIMIT {top_k}"
        )

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
    ) -> str:
        """Generate narrative answer based on SQL evidence and optional table rows."""
        if not self._chat_model:
            return self._heuristic_summary(evidence, trades)

        limited_trades = [trade.model_dump() for trade in trades[:30]]
        evidence_rows = evidence.get("rows", []) if isinstance(evidence, dict) else []
        evidence_preview = evidence_rows[:50]

        prompt = f"""
You are a trade operations analytics assistant.
Answer the user question using ONLY the evidence and trade rows provided.
If evidence is sparse, explicitly say so.
Keep response concise and factual.

User question:
{question}

Evidence rows:
{json.dumps(evidence_preview, default=str)}

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
            conditions.append(
                f"t.update_time < (${param_index}::timestamp + INTERVAL '1 day')"
            )
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

    async def _ensure_dual_data_context(
        self,
        request: ChatRequest,
        extracted_params: ExtractedParams,
        table_results: list[Trade],
        evidence: dict[str, Any],
    ) -> tuple[list[Trade], dict[str, Any]]:
        """Ensure chat answer is grounded with both table rows and analytics evidence."""
        if not table_results:
            try:
                trade_result = await self._execute_tool_call(
                    tool_name="get_trade_rows",
                    args={"limit": 100},
                    extracted_params=extracted_params,
                )
                table_results = trade_result.get("table_results", table_results)
            except Exception as exc:
                logger.warning("Dual-context trade fetch failed", extra={"error": str(exc)})

        if not evidence or not evidence.get("rows"):
            try:
                if self._is_time_series_query(request.message):
                    evidence_result = await self._execute_tool_call(
                        tool_name="get_trade_timeseries",
                        args={
                            "year": self._infer_year_from_context(request),
                            "status": self._infer_status_from_context(request),
                            "bucket": "month",
                            "query": request.message,
                        },
                        extracted_params=extracted_params,
                    )
                else:
                    evidence_result = await self._execute_tool_call(
                        tool_name="get_exception_analytics",
                        args={
                            "dimensions": ["booking_system", "asset_type"],
                            "priority_filter": None,
                            "top_k": 10,
                        },
                        extracted_params=extracted_params,
                    )

                evidence = evidence_result.get("evidence", evidence)
            except Exception as exc:
                logger.warning("Dual-context evidence fetch failed", extra={"error": str(exc)})

        return table_results, evidence

    def _is_time_series_query(self, message: str) -> bool:
        """Detect if user asks for graph/trend/time-series style output."""
        lowered = message.lower()
        return any(keyword in lowered for keyword in self.TIME_SERIES_KEYWORDS)

    def _infer_year_from_query(self, message: str) -> int | None:
        """Extract likely year from query text (e.g., 2025)."""
        match = re.search(r"\b(20\d{2})\b", message)
        if not match:
            return None

        try:
            year = int(match.group(1))
        except ValueError:
            return None

        if 2000 <= year <= 2100:
            return year
        return None

    def _infer_year_from_context(self, request: ChatRequest) -> int | None:
        """Infer likely year from latest message, then recent conversation context."""
        year = self._infer_year_from_query(request.message)
        if year is not None:
            return year

        for message in reversed(request.conversation[-8:]):
            year = self._infer_year_from_query(message.content)
            if year is not None:
                return year

        return None

    def _infer_status_from_context(self, request: ChatRequest) -> str | None:
        """Infer likely status token from current message and recent conversation."""

        def _extract_status(text: str) -> str | None:
            lowered = text.lower()
            if "reject" in lowered:
                return "REJECTED"
            if "alleged" in lowered:
                return "ALLEGED"
            if "cancel" in lowered:
                return "CANCELLED"
            if "clear" in lowered:
                return "CLEARED"
            return None

        status = _extract_status(request.message)
        if status:
            return status

        for message in reversed(request.conversation[-8:]):
            status = _extract_status(message.content)
            if status:
                return status

        return None

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

    def _safe_json_parse(self, text: str) -> dict[str, Any]:
        """Parse JSON with defensive cleanup for markdown wrappers."""
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if not match:
                return {}
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}

    def _validate_sql_or_raise(self, query: str, values: list[Any]) -> None:
        """Ensure all chat SQL uses same safety validator as search flow."""
        if not self.query_builder.validate_query_safety(query, values):
            raise ValueError("Generated chat SQL failed safety validation")

    def _heuristic_summary(self, evidence: dict[str, Any], trades: list[Trade]) -> str:
        """Fallback summary when model is unavailable."""
        if evidence and evidence.get("rows"):
            top = evidence["rows"][0]
            return (
                "I analyzed exception evidence and found the top pattern as "
                f"{top}. Results are based on current filters and available data."
            )
        if trades:
            return (
                f"I found {len(trades)} matching trades. "
                "Use a follow-up question for pattern analysis by system, priority, or asset type."
            )
        return "I could not find enough data to produce an analysis for this question."


chat_service = ChatService()
