# Chat Service /api/chat

This file documents the chat analytics flow inside `services/search-service`, focusing on `/api/chat`, the analytics queries it uses, how it decides between SQL and Cypher, and the key functions in `app/services/chat_service.py` and `app/services/kg_service.py`.

## Endpoint

- `POST /api/chat`
- Request model: `app.models.chat.ChatRequest`
- Response model: `app.models.chat.ChatResponse`

### ChatRequest

- `user_id`: string
- `message`: free-form user question
- `conversation`: optional historical chat messages for context

### ChatResponse

- `mode`: `table`, `analysis`, or `both`
- `query_id`: history record id
- `total_results`: number of returned rows
- `results`: optional trade rows
- `ai_answer`: optional narrative answer
- `evidence`: optional analytics evidence
- `follow_up_prompts`: UI suggestions
- `execution_time_ms`: time taken

---

## High-level flow

1. `app/api/routes/chat.py` receives the request.
2. It calls `chat_service.execute_chat(request)`.
3. `ChatService.execute_chat()` saves the query to history.
4. It tries to extract structured filters from the question using `gemini_service.extract_parameters()`.
5. It enters the tool-calling loop `_run_tool_calling_loop()`.
6. The loop sends the question and extraction result to Gemini function-calling.
7. Gemini chooses tool(s) to invoke.
8. For each tool, `_execute_tool_call()` runs SQL or Cypher safely.
9. Tool outputs are returned to Gemini.
10. This repeats until Gemini returns a final text answer.
11. Final response is assembled and returned to the client.

---

## Key components

### `app/services/chat_service.py`

This is the orchestrator for chat analytics. It contains:

- `execute_chat()` — main entrypoint
- `_run_tool_calling_loop()` — native Gemini tool-call loop
- `_build_tool_declarations()` — declares available tools to Gemini
- `_execute_tool_call()` — runs tool functions
- `_build_analytics_evidence()` — SQL analytics for exception breakdowns
- `_build_trade_timeseries_evidence()` — SQL analytics for trends over time
- `_generate_analysis_answer()` — fallback narrative generation
- `_infer_dimension_hint()` — choose analytics dimensions from question text
- `_build_follow_up_prompts()` — create UI prompt suggestions
- `_validate_sql_or_raise()` — ensure SQL is safe
- `_merge_analytics_evidence()` — combine evidence from multiple calls

### `app/services/kg_service.py`

This service is used only when Neo4j is configured via `NEO4J_URI`.
It converts Gemini tool arguments into safe Cypher queries and returns graph analytics evidence.

Key functions:

- `KGService.query(args)` — builds and executes the Cypher query
- `KGService._build_where(args)` — creates a safe parameterized WHERE clause

---

## Which analytics function is used and why

`ChatService` exposes these tools to Gemini:

- `get_trade_rows` — use for requests that need rows or lists of trades
- `get_exception_analytics` — use for count/breakdown/comparison analytics
- `get_trade_timeseries` — use for trend/time-series analytics
- `get_kg_analytics` — use for graph-powered analytics when Neo4j is available

Gemini chooses tools based on the question intent and the tool declarations.
`ChatService` also helps steer Gemini by adding an initial instruction and a dimension hint.

### Tool selection rules in `ChatService`

The service defines a set of natural language signal rules in the `_SYSTEM_INSTRUCTION` text.
Examples:

- `show`, `list`, `find`, `display`, `give me` → `get_trade_rows`
- `how many`, `compare`, `top N`, `breakdown`, `worst` → `get_exception_analytics`
- `trend`, `chart`, `over time`, `monthly`, `weekly` → `get_trade_timeseries`
- `counterparty`, `sent to`, `received from`, `transaction direction` → `get_kg_analytics`

The actual tool selection is performed by Gemini based on its function-calling model, but these rules are encoded in the system instruction and prompt so the model makes safer choices.

### Dimension hints

`ChatService._infer_dimension_hint(message)` inspects the user question and returns a preferred analytics dimension for exception grouping.

It looks for keywords such as:

- `clearing house`, `CCP` → `clearing_house`
- `asset type`, `CDS`, `IRS`, `FX` → `asset_type`
- `affirmation` → `affirmation_system`
- `booking system`, `trading platform` → `booking_system`
- `account` → `account`
- `status`, `rejected`, `cleared`, `alleged`, `cancelled` → `status`
- `exception message`, `error message` → `exception_message`
- `priority` → `priority`

If no hint is found, it defaults to `booking_system`.

The dimension hint is included in the initial message sent to Gemini, which helps the tool loop choose the correct grouping for `get_exception_analytics`.

---

## Analytics query types

### 1. SQL analytics via `ChatService` tools

All SQL analytics in `ChatService` are built with parameterization and validated by `query_builder.validate_query_safety()`.

#### `get_trade_rows`

- Constructs SQL using `query_builder.build_from_extracted_params(extracted_params)`.
- Validates SQL safety.
- Executes against PostgreSQL via `db_manager.fetch()`.
- Returns a list of `Trade` objects and a preview containing row count and sample rows.

Use case: "show me the trades", "list pending trades", "display trades for account X".

#### `get_exception_analytics`

- Builds a SQL query on `exceptions e JOIN trades t`.
- Groups by one or two safe dimensions from `ChatService.ALLOWED_DIMENSIONS`:
  - `booking_system`
  - `asset_type`
  - `affirmation_system`
  - `clearing_house`
  - `account`
  - `status`
  - `exception_message`
  - `priority`
- Applies filters from `ExtractedParams` for account, asset type, booking system, affirmation system, clearing house, status, and date range.
- Optionally applies `priority_filter` if the tool args request it.
- Returns evidence including:
  - grouped rows
  - chart labels / series
  - metadata like `top_k`, `priority_filter`, `row_count`

Use case: "which booking system has the most exceptions?", "break down exceptions by asset type", "top 10 exception categories".

#### `get_trade_timeseries`

- Builds a SQL query on `trades t`.
- Filters by `status` (default `REJECTED` if missing).
- Supports `year`, `bucket` = `month` or `week`, and the same extracted param filters.
- Groups by truncated time (`DATE_TRUNC('month', t.update_time)` or `week`).
- Returns evidence with time-series rows, chart labels, and metadata.

Use case: "show the trend of rejected trades over time", "chart exception volume monthly".

### 2. Graph analytics via `KGService`

This is used only when `NEO4J_URI` is configured in the environment.

#### `get_kg_analytics`

- Delegates to `kg_service.query(args)`.
- `KGService` maps a requested dimension and metric target to a Cypher path using blueprints.
- Supported dimensions include:
  - `BookingSystem`
  - `ClearingHouse`
  - `AffirmationSystem`
  - `Counterparty`
  - `Account`
  - `AssetType`
  - `TradeStatus`
  - `TransactionStatus`
  - `ExceptionStatus`
- Supported metric targets include:
  - `Trade`
  - `Transaction`
  - `Exception`

The service builds a Cypher query with:
- a mandatory MATCH path from `BLUEPRINTS`
- optional matches for missing relationships
- a safe WHERE clause using named parameters
- aggregation over `dimension_value`, metric counts, trade counts, transaction counts, and exception counts

It returns evidence shaped similarly to SQL tools so the chat synthesis can merge results consistently.

Use case: "who are the top counterparties?", "which booking system has the most trade exceptions?", "analyze direction of transactions."

---

## Tool execution sequence

### `_run_tool_calling_loop()`

This method drives the chat tool workflow.

1. It starts a Gemini chat using the function-calling model configured in `_fc_model`.
2. It sends an initial message containing:
   - user question
   - last 6 conversation history messages
   - extracted SQL filters
   - current date
   - dimension hint for `get_exception_analytics`
3. It receives a Gemini response.
4. If Gemini returned function calls, it executes them in parallel using `asyncio.gather()`.
5. Each executed tool returns a result preview and structured output.
6. The service sends all tool results back to Gemini in a single user turn.
7. The loop repeats until Gemini emits a plain text answer with no further tool calls.

If there is no `_fc_model`, the service raises a runtime error. In practice, this means `GOOGLE_API_KEY` must be configured for `ChatService` to work.

### `_execute_tool_call(tool_name, args, extracted_params)`

This is the dispatcher for actual analytics work.

- `tool_name == "get_trade_rows"`
  - Builds SQL from extracted params.
  - Validates it.
  - Fetches rows.

- `tool_name == "get_exception_analytics"`
  - Normalizes tool args.
  - Validates allowed dimensions.
  - Builds grouped exception SQL and executes it.

- `tool_name == "get_trade_timeseries"`
  - Normalizes year/status/bucket args.
  - Builds time-series SQL and executes it.

- `tool_name == "get_kg_analytics"`
  - If Neo4j is configured, calls `kg_service.query(args)`.
  - Otherwise returns a safe no-op preview.

- Any unsupported tool returns an error preview.

### `_validate_sql_or_raise(query, values)`

This method uses the same query safety validator as search flow:
- `query_builder.validate_query_safety(query, values)`
- Raises `ValueError` if SQL is unsafe

This protects chat analytics from malformed or unsafe SQL.

---

## Evidence accumulation and final answer

### `_accumulate_tool_result()`

This helper collects results from each tool call:

- `get_trade_rows` appends table rows
- `get_exception_analytics` and `get_trade_timeseries` append analytics evidence
- `get_kg_analytics` stores graph evidence

### `_merge_analytics_evidence()`

If multiple analytics calls are made in the same conversation, this method merges them into a single evidence dict.
It preserves sections and tracks grouped dimensions.

### `_infer_mode_from_tools()`

Determines the response mode based on tools invoked:

- `table` if only `get_trade_rows` was called
- `analysis` if any analytics tool was called
- `both` if table and analytics tools were called

### Final answer generation

If Gemini does not already return a plain-text answer, the chat service falls back to `_generate_analysis_answer()`.
This method:

- formats the collected evidence
- includes trade row samples
- includes KG evidence if present
- sends a prompt to the standard Gemini chat model
- returns a concise factual answer

---

## When SQL vs Cypher is used

### SQL is used when:

- `get_trade_rows` is invoked
- `get_exception_analytics` is invoked
- `get_trade_timeseries` is invoked

Those tools are implemented directly inside `ChatService` and query PostgreSQL via `db_manager.fetch()`.

### Cypher is used when:

- `get_kg_analytics` is invoked and `NEO4J_URI` is configured

In that case, `kg_service.query(args)` builds a safe Cypher query and executes it against Neo4j.

If Neo4j is not configured, `get_kg_analytics` returns a warning preview and no graph evidence.

---

## Practical function call guide

### Call `get_trade_rows` when:

- the user asks to list trades, show rows, display trades, or find specific trades
- you need actual trade records rather than aggregated metrics

### Call `get_exception_analytics` when:

- the user asks for breakdowns by booking system, asset type, account, status, exception message, or priority
- the user asks "which has the most", "compare", "top N", "breakdown", or "worst"
- you need aggregated exception counts and grouped evidence

### Call `get_trade_timeseries` when:

- the user asks for trends, charts, or anything over time
- the user asks for weekly or monthly analytics
- you need time-series data for a specific status

### Call `get_kg_analytics` when:

- the user asks for relationship-driven analytics such as counterparties, transaction direction, or graph patterns
- Neo4j is configured and you want richer insights across BookingSystem → Trade → Transaction → Exception

---

## Developer notes

- `ChatService` depends on `GOOGLE_API_KEY` to initialize the Gemini models.
- The function-calling loop is the heart of the chat analytics flow.
- `ExtractedParams` are produced from the user question and are reused by all SQL analytics tools.
- All SQL builds use numeric parameters and safe JOIN/filter patterns.
- `KGService` builds Cypher using named parameters to avoid injection.
- The final response may include both `results` and `evidence` when multiple tools were used.

---

## Example /api/chat payload

```json
{
  "user_id": "user123",
  "message": "Show me the top booking systems with the most exceptions in the last month",
  "conversation": []
}
```

## Example response shape

```json
{
  "mode": "analysis",
  "query_id": 42,
  "total_results": 0,
  "results": null,
  "ai_answer": "The top booking systems by exception count in the last month are ...",
  "evidence": {
    "dimensions": ["booking_system"],
    "rows": [...],
    "chart": {...},
    "metadata": {...}
  },
  "follow_up_prompts": [
    "Break this down by booking system for CRITICAL only",
    "Show top exception messages and impacted asset types"
  ],
  "execution_time_ms": 512.3
}
```
