# Search Service Pipeline - Complete Beginner's Guide

**Last Updated:** March 17, 2026  
**Status:** Production Ready ✅  
**Version:** 1.0.0

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Service Architecture](#2-service-architecture)
3. [Complete Project Structure](#3-complete-project-structure)
4. [Data Flow: From Query to Results](#4-data-flow-from-query-to-results)
5. [Key Components Deep Dive](#5-key-components-deep-dive)
6. [AI Integration: Parameter Extraction](#6-ai-integration-parameter-extraction)
7. [SQL Query Generation & Safety](#7-sql-query-generation--safety)
8. [Intelligent Ranking Algorithm](#8-intelligent-ranking-algorithm)
9. [Database Architecture](#9-database-architecture)
10. [Caching Strategy](#10-caching-strategy)
11. [System Prompts & Prompt Engineering](#11-system-prompts--prompt-engineering)
12. [Configuration Management](#12-configuration-management)
13. [API Endpoints Reference](#13-api-endpoints-reference)
14. [Example: Complete Request-Response Flow](#14-example-complete-request-response-flow)
15. [Testing & Deployment](#15-testing--deployment)

---

## 1. High-Level Overview

### What Does the Search Service Do?

The Search Service is an **AI-powered financial trade search engine** that allows users to find trades in a database using two methods:

1. **Natural Language Search** - "Show me all pending FX trades from last week"
   - Natural language query → AI extracts structured parameters → SQL executed
   
2. **Manual Filter Search** - Dropdown selections with specific criteria
   - Manual filters → SQL query directly → executed

### Why Is It Needed?

In production trading environments, users need to quickly search for trades based on complex criteria:
- Without this service, users would need to write SQL queries manually (error-prone, slow)
- This service abstracts away the complexity and allows intuitive searching
- AI makes complex queries natural and easy for business users

### General Flow

```
┌─────────────────────────┐
│   User Query/Filters    │
└────────────┬────────────┘
             │
             ├─── Natural Language Path ───────────────┐
             │                                         │
             └─── Manual Filter Path ────────────────┐
                                                     │
                                   ┌─────────────────▼──────────┐
                                   │  AI Extraction (Bedrock)   │
                                   │  (for Natural Language)    │
                                   └─────────────────┬──────────┘
                                                     │
                                   ┌─────────────────▼──────────┐
                                   │  Build Safe SQL Query      │
                                   │  (Parameterized)           │
                                   └─────────────────┬──────────┘
                                                     │
                                   ┌─────────────────▼──────────┐
                                   │ Execute Against PostgreSQL │
                                   │ (with Connection Pool)     │
                                   └─────────────────┬──────────┘
                                                     │
                                   ┌─────────────────▼──────────┐
                                   │  Apply Intelligent Ranking │
                                   │  (Multi-factor scoring)    │
                                   └─────────────────┬──────────┘
                                                     │
                                   ┌─────────────────▼──────────┐
                                   │  Save to Query History     │
                                   │  (with Redis Cache)        │
                                   └─────────────────┬──────────┘
                                                     │
                                   ┌─────────────────▼──────────┐
                                   │  Return Results to Frontend│
                                   │  (with Metadata)           │
                                   └────────────────────────────┘
```

---

## 2. Service Architecture

### High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        FastAPI Application                    │
│                    (app/main.py - Startup/Shutdown)           │
└──────────────────────────┬───────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌────────┐         ┌──────────┐     ┌──────────────┐
   │  Cache │         │ Database │     │ API Routers  │
   │ (Redis)│         │(PostgreSQL)    │  (FastAPI)   │
   └────────┘         └──────────┘     └──────┬───────┘
        │                  │                   │
        │                  │        ┌──────────┴──────────┬──────────┐
        │                  │        │                     │          │
        ▼                  ▼        ▼                     ▼          ▼
   ┌────────────────────────────────────────────────────────────────┐
   │           Service Layer (Business Logic)                       │
   │  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐ │
   │  │ Search           │  │ Query        │  │ Ranking          │ │
   │  │ Orchestrator     │  │ Builder      │  │ Service          │ │
   │  │                  │  │              │  │                  │ │
   │  │ Coordinates      │  │ Builds safe  │  │ Multi-factor     │ │
   │  │ entire search    │  │ SQL with     │  │ relevance        │ │
   │  │ pipeline         │  │ parameters   │  │ scoring          │ │
   │  └──────────────────┘  └──────────────┘  └──────────────────┘ │
   │                                                                  │
   │  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐ │
   │  │ Bedrock Service  │  │ Gemini       │  │ Query History    │ │
   │  │                  │  │ Service      │  │ Service          │ │
   │  │ Parameter        │  │              │  │                  │ │
   │  │ extraction from  │  │ Alternative  │  │ CRUD for query   │ │
   │  │ natural language │  │ to Bedrock   │  │ history & caching│ │
   │  │ (AWS Claude)     │  │ (Google AI)  │  │                  │ │
   │  └──────────────────┘  └──────────────┘  └──────────────────┘ │
   └────────────────────────────────────────────────────────────────┘
        │                                           │
        └──── Cache Queries/Results ────────────────┘
        │
        └──── Extract Parameters via AI ───────────────────────┐
        │                                                       │
        └───────────────────────────────────────────────────────┤
                                                                 │
                                    ┌────────────────────────────┴─────┐
                                    │                                  │
                                    ▼                                  ▼
                        ┌──────────────────────┐    ┌──────────────────┐
                        │ AWS Bedrock Claude   │    │ Google Gemini    │
                        │ (Production)         │    │ (Dev Alternative)│
                        │ Parameter Extraction │    │ Parameter Extract│
                        └──────────────────────┘    └──────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI 0.109.0 | Async HTTP API framework |
| **Server** | Uvicorn | ASGI server for FastAPI |
| **Database** | PostgreSQL + asyncpg | SQL database with async driver |
| **Cache** | Redis | In-memory cache for AI responses |
| **AI - Production** | AWS Bedrock Claude 3.5 Sonnet | Natural language parameter extraction |
| **AI - Development** | Google Gemini 2.5 Flash | Alternative AI provider (when Bedrock unavailable) |
| **Async** | asyncio | Async I/O operations |
| **Data Validation** | Pydantic 2.5.0 | Type hints & validation |
| **Logging** | python-json-logger | JSON structured logging |

---

## 3. Complete Project Structure

### Directory Tree with Descriptions

```
search-service/
│
├── app/                                 # Main application package
│   │
│   ├── main.py                         # FastAPI app initialization, lifespan management
│   │                                    # - Startup: Connect DB, Redis, verify health checks
│   │                                    # - Shutdown: Close connections gracefully
│   │
│   ├── api/                            # HTTP API routes and endpoints
│   │   └── routes/
│   │       ├── search.py              # POST /api/search - Main search endpoint
│   │       ├── history.py             # GET/PUT/DELETE /api/history - Query history
│   │       ├── health.py              # GET /health - ECS health checks
│   │       └── filters.py             # GET /api/filters - Dropdown options
│   │
│   ├── services/                       # Business logic (core search pipeline)
│   │   ├── search_orchestrator.py     # Orchestrates entire search flow
│   │   │                              # - Routes: Natural Language vs Manual
│   │   │                              # - Coordinates: AI extraction, query building, 
│   │   │                              #   query execution, ranking, history saving
│   │   │
│   │   ├── bedrock_service.py         # AWS Bedrock integration (PRODUCTION)
│   │   │                              # - Calls Claude 3.5 Sonnet for parameter extraction
│   │   │                              # - With caching (Redis) and retry logic (tenacity)
│   │   │                              # - Token counting and cost tracking
│   │   │
│   │   ├── gemini_service.py          # Google Gemini integration (DEV ALTERNATIVE)
│   │   │                              # - Same interface as Bedrock for easy swapping
│   │   │                              # - Used when Bedrock unavailable
│   │   │
│   │   ├── query_builder.py           # SQL query generation
│   │   │                              # - Converts extracted params → parameterized SQL
│   │   │                              # - Supports: ANY() for lists, date ranges, safety
│   │   │                              #   validation
│   │   │
│   │   ├── query_history_service.py   # Query history CRUD
│   │   │                              # - Save, retrieve, update, delete history
│   │   │                              # - Ownership validation (users can't access other's history)
│   │   │
│   │   └── ranking_service.py         # Intelligent result ranking
│   │                                  # - Multi-factor relevance scoring
│   │                                  # - Configurable weights (JSON config)
│   │                                  # - Status urgency, recency, volume, asset type
│   │
│   ├── models/                         # Data models (Pydantic)
│   │   ├── domain.py                  # Business domain models
│   │   │                              # - Trade (maps to trades table)
│   │   │                              # - QueryHistory (maps to query_history table)
│   │   │                              # - ExtractedParams (AI output)
│   │   │
│   │   ├── request.py                 # API request schemas
│   │   │                              # - SearchRequest (NL or manual)
│   │   │                              # - ManualSearchFilters (dropdown selections)
│   │   │                              # - UpdateHistoryRequest (save/rename)
│   │   │
│   │   └── response.py                # API response schemas
│   │                                  # - SearchResponse (results + metadata)
│   │                                  # - HistoryListResponse (paginated history)
│   │
│   ├── database/                       # Database layer
│   │   └── connection.py              # PostgreSQL connection pool (asyncpg)
│   │                                  # - Pool management (min 2, max 10 connections)
│   │                                  # - Query execution helpers (fetch, fetchrow, execute)
│   │                                  # - Health checks for ECS monitoring
│   │
│   ├── cache/                          # Redis caching layer
│   │   └── redis_client.py            # Redis connection and cache operations
│   │                                  # - Get/Set/Delete with TTL
│   │                                  # - JSON serialization for complex objects
│   │                                  # - Used for AI extraction caching (1 hour TTL)
│   │
│   ├── config/                         # Configuration management
│   │   ├── settings.py                # Environment-based settings (pydantic-settings)
│   │   │                              # - DB host, port, credentials
│   │   │                              # - Redis connection details
│   │   │                              # - Bedrock/Gemini API keys and regions
│   │   │                              # - Cache TTLs, retry policies
│   │   │
│   │   └── ranking_config.json        # Ranking algorithm configuration (hot-reloadable)
│   │                                  # - Weights for 4 scoring factors
│   │                                  # - Status priority scores
│   │                                  # - Asset type priority scores
│   │                                  # - Recency decay settings
│   │
│   ├── prompts/                        # AI prompt templates
│   │   └── extraction_prompt.py       # Bedrock/Gemini parameter extraction prompts
│   │                                  # - SYSTEM_PROMPT: AI role and capabilities
│   │                                  # - build_user_prompt(): Dynamic prompt with dates
│   │                                  # - Examples for each parameter type
│   │
│   └── utils/                          # Utilities and helpers
│       ├── exceptions.py             # Custom exception classes
│       │                             # - DatabaseConnectionError
│       │                             # - BedrockAPIError, BedrockResponseError
│       │                             # - CacheConnectionError, CacheOperationError
│       │                             # - InvalidSearchRequestError
│       │
│       └── logger.py                 # JSON structured logging setup
│                                     # - Logs to stdout (for CloudWatch)
│                                     # - Context tags for request tracing
│
├── tests/                              # Test suite
│   ├── test_*                          # Unit tests for each component
│   └── test_integration_*              # Integration tests with LocalStack
│
├── requirements.txt                    # Python dependencies
├── Dockerfile                          # Container image definition
├── Makefile                           # Development commands
├── pyproject.toml                     # Python project metadata
└── pytest.ini                         # Pytest configuration
```

### Key Files Breakdown

#### **api/routes/search.py** - Main Search Endpoint
```python
POST /api/search
```
- Accepts SearchRequest (natural language or manual)
- Calls search_orchestrator.execute_search()
- Returns SearchResponse with results, metadata, execution time
- Handles 5 types of exceptions with proper HTTP status codes

#### **api/routes/history.py** - Query History Endpoints
```python
GET /api/history?user_id=X&limit=50&saved_only=false
PUT /api/history/{query_id}  # Save/rename
DELETE /api/history/{query_id}
GET /api/history/saved-queries  # Bookmarked queries only
POST /api/history/typeahead  # Search suggestions
```

#### **services/search_orchestrator.py** - The Conductor
- **execute_search()** - Main entry point for any search request
  - Route to NL or manual handler
  - Build SQL (with AI for NL)
  - Execute query
  - Apply ranking
  - Save history
  - Return response

#### **services/query_builder.py** - Safe SQL Generation
- **build_from_extracted_params()** - NL → SQL
- **build_from_manual_filters()** - Manual → SQL
- **validate_query_safety()** - Checks for SQL injection patterns
- Uses PostgreSQL parameterized queries ($1, $2, etc.)

#### **services/bedrock_service.py** - AI Integration
- **extract_parameters()** - Main method
- **_invoke_bedrock()** - Call Claude API with retry logic
- **_parse_and_validate_response()** - Convert JSON response
- Caching layer with 1-hour TTL

#### **config/settings.py** - Centralized Configuration
```python
# Example environment variables:
RDS_HOST=localhost
RDS_PORT=5432
RDS_DB=trades
RDS_USER=postgres
RDS_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
BEDROCK_REGION=ap-southeast-2
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
GOOGLE_API_KEY=sk-...  # For Gemini
MAX_SEARCH_RESULTS=1000
```

---

## 4. Data Flow: From Query to Results

### Step-by-Step Natural Language Search Flow

Let's trace the journey of a query: **"Show me pending FX trades from last week"**

#### **Step 1: Request Reception (api/routes/search.py)**

```json
POST /api/search
{
  "user_id": "trader_alice",
  "search_type": "natural_language",
  "query_text": "Show me pending FX trades from last week"
}
```

**What happens:**
- FastAPI validates the request against `SearchRequest` model
- Checks: user_id exists, search_type is valid, query_text is 3+ characters
- Passes valid request to `search_orchestrator.execute_search()`

---

#### **Step 2: Save to Query History (query_history_service.py)**

**Before executing**:
```python
query_id = await query_history_service.save_query(
    user_id="trader_alice",
    query_text="Show me pending FX trades from last week",
    search_type="natural_language"
)
# Returns: query_id = 12345 (auto-generated)
```

**Database:**
```sql
INSERT INTO query_history 
(user_id, query_text, is_saved, query_name, create_time, last_use_time)
VALUES ('trader_alice', 'Show me pending FX trades from last week', 
        FALSE, NULL, NOW(), NOW())
RETURNING id
```

**Why early?** Failed searches are still tracked for analytics.

---

#### **Step 3: Parameter Extraction with AI**

**Routes to:** `bedrock_service.extract_parameters()`

**Cache Check:**
```python
cache_key = md5("show me pending fx trades from last week")
cached_params = await redis_manager.get(cache_key)
if cached_params:
    return cached_params  # Cache hit! Return immediately
```

**Cache Miss → Call Bedrock API:**

The system sends Claude 3.5 Sonnet this:

**System Prompt** (defines AI's role):
```
You are a trade search parameter extraction assistant.
Extract ONLY what is explicitly mentioned.
If a query is specific, return only those parameters.
Return ONLY valid JSON. No explanatory text.
```

**User Prompt** (dynamic, with date context):
```
Extract trade search parameters from this query and return them as JSON.

Query: "Show me pending FX trades from last week"

Today's date: 2026-03-17 (Monday)

Extract these parameters (use null if not mentioned):
{
  "trade_id": integer or null,
  "accounts": [...] or null,
  "asset_types": [...] or null,
  "booking_systems": [...] or null,
  "affirmation_systems": [...] or null,
  "clearing_houses": [...] or null,
  "statuses": [...] or null,
  "date_from": "YYYY-MM-DD" or null,
  "date_to": "YYYY-MM-DD" or null,
  "with_exceptions_only": true or false
}

[Extraction rules and examples follow...]
```

**Bedrock Response (Claude processes):**
```json
{
  "trade_id": null,
  "accounts": null,
  "asset_types": ["FX"],
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": ["ALLEGED"],
  "date_from": "2026-03-10",
  "date_to": "2026-03-17",
  "with_exceptions_only": false
}
```

**Parsing & Validation:**
```python
extracted_params = ExtractedParams(
    asset_types=["FX"],
    statuses=["ALLEGED"],
    date_from="2026-03-10",
    date_to="2026-03-17"
)
```

**Cache Result** (1-hour TTL):
```python
redis_manager.set(
    key="extract_params:show me pending fx trades from last week",
    value=extracted_params,
    ttl=3600  # 1 hour
)
```

---

#### **Step 4: Build Safe SQL Query**

**Routes to:** `query_builder.build_from_extracted_params(extracted_params)`

**Input:**
```python
ExtractedParams(
    asset_types=["FX"],
    statuses=["ALLEGED"],
    date_from="2026-03-10",
    date_to="2026-03-17"
)
```

**Process:**
```python
# Start with base query template
BASE_QUERY = """
SELECT id, account, asset_type, booking_system, affirmation_system,
       clearing_house, create_time, update_time, status
FROM trades
WHERE 1=1
"""

# Build conditions with placeholders (NOT string concatenation!)
conditions = []
values = []

# Asset type filter
conditions.append("asset_type = ANY($1::text[])")
values.append(["FX"])

# Status filter
conditions.append("status = ANY($2::text[])")  
values.append(["ALLEGED"])

# Date from filter
conditions.append("update_time >= $3::timestamp")
values.append(datetime.strptime("2026-03-10", "%Y-%m-%d").date())

# Date to filter (add 1 day for inclusive)
conditions.append("update_time < ($4::timestamp + INTERVAL '1 day')")
values.append(datetime.strptime("2026-03-17", "%Y-%m-%d").date())
```

**Generated SQL:**
```sql
SELECT id, account, asset_type, booking_system, affirmation_system,
       clearing_house, create_time, update_time, status
FROM trades
WHERE 1=1 
  AND asset_type = ANY($1::text[])
  AND status = ANY($2::text[])
  AND update_time >= $3::timestamp
  AND update_time < ($4::timestamp + INTERVAL '1 day')
ORDER BY update_time DESC
LIMIT 1000
```

**Parameters (kept separate):**
```python
params = [["FX"], ["ALLEGED"], date(2026, 3, 10), date(2026, 3, 17)]
```

**Why this is safe:**
- ✅ No string concatenation
- ✅ No user input directly in SQL
- ✅ All values in separate `params` list
- ✅ asyncpg handles escaping automatically
- ✅ 100% SQL injection proof

---

#### **Step 5: Validate Query Safety**

**Routes to:** `query_builder.validate_query_safety(sql_query, params)`

```python
def validate_query_safety(query: str, values: list[Any]) -> bool:
    # Check for dangerous patterns
    dangerous_patterns = ["' + ", '" + ', "format(", ".format", "%s", "{}"]
    
    for pattern in dangerous_patterns:
        if pattern in query:
            return False  # SQL injection detected!
    
    # Count placeholders
    placeholder_count = query.count("$")
    if placeholder_count != len(values):
        return False  # Mismatch between placeholders and values
    
    return True  # Query is safe!
```

**Result:** ✅ Query passed validation

---

#### **Step 6: Execute Query Against Database**

**Routes to:** `search_orchestrator._execute_query(sql_query, params)`

**Database Connection (from pool):**
```python
# AsyncPG connection pool is already initialized at startup
# Pool is configured: min 2, max 10 connections, 60-second timeout
async with db_manager.acquire() as conn:
    # asyncpg executes the parameterized query
    records = await conn.fetch(sql_query, *params)
    
    # asyncpg safety features:
    # - Parameters are prepared separately
    # - Automatic type conversion
    # - Escape handling
    # - Result streaming for large result sets
```

**Database Query Execution:**
```sql
EXECUTE (parameterized)
  asset_type = $1::text[] with ["FX"]
  status = $2::text[] with ["ALLEGED"]
  update_time >= $3::timestamp with 2026-03-10
  update_time < ($4::timestamp + ...) with 2026-03-17
```

**Sample Results:** (5 trades found)
```python
[
  Record(id=1001, account="ACC123", asset_type="FX", status="ALLEGED", ...),
  Record(id=1002, account="ACC124", asset_type="FX", status="ALLEGED", ...),
  Record(id=1003, account="ACC125", asset_type="FX", status="ALLEGED", ...),
  Record(id=1004, account="ACC123", asset_type="FX", status="ALLEGED", ...),
  Record(id=1005, account="ACC126", asset_type="FX", status="ALLEGED", ...)
]
```

**Convert to Trade Models:**
```python
trades = [Trade.from_db_record(record) for record in records]
# Each record becomes: Trade(trade_id=1001, account="ACC123", ...)
```

---

#### **Step 7: Apply Intelligent Ranking**

**Routes to:** `search_orchestrator._apply_ranking(trades, user_id)`

**Why Ranking?**
When you search for "pending FX trades," all 5 trades match equally by the database query. But business logic says some are MORE important than others.

**Ranking Factors:**

| Factor | Weight | Logic | Score (0-100) |
|--------|--------|-------|---|
| Status Urgency | 45% | ALLEGED trades need attention | 75/100 |
| Recency | 30% | Newer trades more relevant | 60/100 |
| Transaction Volume | 15% | Complex trades (many steps) | 50/100 |
| Asset Type Risk | 10% | FX is moderate risk | 70/100 |

**Configuration** (from `ranking_config.json`):
```json
{
  "weights": {
    "status_urgency": 0.45,
    "recency": 0.30,
    "transaction_volume": 0.15,
    "asset_type_risk": 0.10
  },
  "status_priority": {
    "REJECTED": 100,
    "ALLEGED": 75,
    "CANCELLED": 50,
    "CLEARED": 25
  },
  "asset_type_priority": {
    "CDS": 100,
    "IRS": 95,
    "FX": 70,
    "EQUITY": 50
  }
}
```

**Ranking Calculation for Trade #1001:**
```python
# 1. Status Score (ALLEGED = 75)
status_score = 75

# 2. Recency Score (created 2 days ago)
# Formula: 100 * (0.5 ^ (age_days / half_life_days))
# = 100 * (0.5 ^ (2 / 14))
# = 100 * 0.953
# = 95.3
recency_score = 95.3

# 3. Transaction Volume (5 transactions)
# min_transactions=5, max=20
# Score = 25 + ((5-5)/(20-5) * 75) = 25
transaction_score = 25

# 4. Asset Type (FX = 70)
asset_type_score = 70

# Total Relevance Score (weighted average)
total = (0.45 * 75) + (0.30 * 95.3) + (0.15 * 25) + (0.10 * 70)
      = 33.75 + 28.59 + 3.75 + 7.00
      = 73.09
```

**All Trades Ranked:**
```
Trade #1001: 73.09 ⭐⭐⭐
Trade #1004: 71.55 ⭐⭐⭐
Trade #1002: 68.20 ⭐⭐
Trade #1003: 65.41 ⭐⭐
Trade #1005: 62.80 ⭐
```

**Output:** Trades sorted by score (highest first)

---

#### **Step 8: Format Response**

**Time Elapsed:** 234.5 ms (including Bedrock API call)

**Response to Frontend:**
```json
{
  "query_id": 12345,
  "total_results": 5,
  "search_type": "natural_language",
  "cached": false,
  "execution_time_ms": 234.5,
  "extracted_params": {
    "asset_types": ["FX"],
    "statuses": ["ALLEGED"],
    "date_from": "2026-03-10",
    "date_to": "2026-03-17",
    "trade_id": null,
    "accounts": null,
    "booking_systems": null,
    "affirmation_systems": null,
    "clearing_houses": null,
    "with_exceptions_only": false
  },
  "results": [
    {
      "trade_id": 1001,
      "account": "ACC123",
      "asset_type": "FX",
      "booking_system": "HIGHGARDEN",
      "affirmation_system": "TRAI",
      "clearing_house": "DTCC",
      "create_time": "2026-03-15T09:30:00Z",
      "update_time": "2026-03-15T10:00:00Z",
      "status": "ALLEGED"
    },
    {
      "trade_id": 1004,
      "account": "ACC123",
      "asset_type": "FX",
      "booking_system": "WINTERFELL",
      "affirmation_system": "MARC",
      "clearing_house": "LCH",
      "create_time": "2026-03-14T14:15:00Z",
      "update_time": "2026-03-14T15:30:00Z",
      "status": "ALLEGED"
    },
    // ... 3 more trades ...
  ]
}
```

---

### Step-by-Step Manual Filter Search Flow

For **manual searches**, steps 3 (AI extraction) and 7 (ranking enriched data) differ:

**Manual Search Request:**
```json
POST /api/search
{
  "user_id": "trader_bob",
  "search_type": "manual",
  "filters": {
    "asset_type": "FX",
    "status": ["ALLEGED", "CLEARED"],
    "date_type": "update_time",
    "date_from": "2026-03-10",
    "date_to": "2026-03-17",
    "cleared_trades_only": false
  }
}
```

**Differences:**
1. **No AI extraction** - Filters already structured, go directly to SQL builder
2. **Different SQL builder** - `build_from_manual_filters()` instead of `build_from_extracted_params()`
3. **Ranking still applied** - Uses same multi-factor algorithm
4. **History saved** - Query filters are JSON-serialized and saved

**Response** includes:
- `extracted_params: null` (since no AI was used)
- Results ranked by relevance
- Everything else identical

---

## 5. Key Components Deep Dive

### 5.1 Search Orchestrator (search_orchestrator.py)

**Purpose:** Conductor of the entire search symphony

**Class:** `SearchOrchestrator`

**Core Method:** `execute_search(request: SearchRequest) → SearchResponse`

**Flow:**
```python
async def execute_search(self, request: SearchRequest) -> SearchResponse:
    # 1. Save query to history (tracking failed searches too)
    query_id = await self.history.save_query(...)
    
    # 2. Branch on search type
    if request.search_type == "natural_language":
        sql_query, params, extracted_params = \
            await self._handle_natural_language_search(request)
    else:  # manual
        sql_query, params, extracted_params = \
            await self._handle_manual_search(request)
    
    # 3. Validate query safety (prevent SQL injection)
    if not self.builder.validate_query_safety(sql_query, params):
        raise InvalidSearchRequestError(...)
    
    # 4. Execute query
    trades = await self._execute_query(sql_query, params, request.user_id)
    
    # 5. Apply ranking
    trades = await self._apply_ranking(trades, request.user_id)
    
    # 6. Format response
    response = SearchResponse(
        query_id=query_id,
        total_results=len(trades),
        results=trades,
        search_type=request.search_type,
        execution_time_ms=elapsed_time,
        extracted_params=extracted_params  # None for manual searches
    )
    
    return response
```

**Private Methods:**

| Method | Purpose |
|--------|---------|
| `_handle_natural_language_search()` | Route: Extract params via AI, then build SQL |
| `_handle_manual_search()` | Route: Build SQL directly from manual filters |
| `_execute_query()` | Execute parameterized SQL, convert records to Trade models |
| `_apply_ranking()` | Fetch enriched data, rank by relevance score |

**Error Handling:**
- Query history save failures are logged but don't fail the search
- Query execution errors are propagated (critical)
- Ranking failures fall back to original order (graceful degradation)

---

### 5.2 Query Builder (query_builder.py)

**Purpose:** Converts search parameters to safe, parameterized SQL

**Key Classes & Methods:**

```python
class QueryBuilder:
    BASE_QUERY = """
        SELECT id, account, asset_type, booking_system, 
               affirmation_system, clearing_house, 
               create_time, update_time, status
        FROM trades
        WHERE 1=1
    """
    
    def build_from_extracted_params(params: ExtractedParams) -> (str, list)
    def build_from_manual_filters(filters: ManualSearchFilters) -> (str, list)
    def validate_query_safety(query: str, values: list) -> bool
    def build_enriched_data_query(trade_ids: list) -> (str, list)
```

**SQL Generation Strategy:**

```python
# Never do this ❌
query = f"SELECT * FROM trades WHERE status = '{status}'"  # SQL injection!

# Always do this ✅
query = "SELECT * FROM trades WHERE status = $1::text"
params = [status]  # asyncpg handles escaping
```

**PostgreSQL ANY() for Lists:**
```python
# For multiple values:
conditions.append("status = ANY($1::text[])")  # $1 is array of text
values.append(["ALLEGED", "CLEARED"])

# Generates: status IN ('ALLEGED', 'CLEARED')
```

**Date Handling:**
```python
# Date range inclusive on both ends
date_from: "2026-03-10" → WHERE update_time >= 2026-03-10 00:00:00
date_to: "2026-03-17" → WHERE update_time < 2026-03-18 00:00:00 (add 1 day)
```

**Result Limits:**
```python
LIMIT {settings.MAX_SEARCH_RESULTS}  # Default: 1000
# Prevents massive result sets from crashing the system
```

---

### 5.3 Bedrock Service (bedrock_service.py)

**Purpose:** AI-powered parameter extraction using AWS Claude

**Flow:**

```
Query: "Show me pending FX trades from last week"
    ↓
Check Redis Cache (key = md5(normalized_query))
    ↓
Cache Miss
    ↓
Build Prompts (system + user with date context)
    ↓
Invoke AWS Bedrock Claude API (with retry logic)
    ↓
Parse JSON Response
    ↓
Validate Against Schema
    ↓
Save to Redis Cache (1-hour TTL)
    ↓
Return ExtractedParams Object
```

**Retry Strategy** (using Tenacity library):
```python
@retry(
    stop=stop_after_attempt(3),  # Max 3 attempts
    wait=wait_exponential(
        multiplier=2,  # First wait: 2^1 = 2 seconds
        max=10         # Never wait more than 10 seconds
    ),
    retry=retry_if_exception_type((ClientError, BotoCoreError))
)
async def _invoke_bedrock(self, query: str, ...):
    # Attempt 1: fail immediately with retriable error
    # Wait 2 seconds
    # Attempt 2: fail with retriable error
    # Wait 4-10 seconds (capped at max)
    # Attempt 3: fail → raise BedrockAPIError
```

**Configuration:**
```python
BEDROCK_REGION = "ap-southeast-2"  # Sydney region
BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
BEDROCK_MAX_TOKENS = 500  # Response limit
BEDROCK_TEMPERATURE = 0.0  # Deterministic (not creative)
AWS_ACCESS_KEY_ID = "..."  # For dev/test
AWS_SECRET_ACCESS_KEY = "..."  # Or use IAM role in production
```

**Token Counting:**
```python
# Using TikToken (OpenAI's tokenizer)
encoding = tiktoken.get_encoding("cl100k_base")
system_tokens = len(encoding.encode(SYSTEM_PROMPT))
user_tokens = len(encoding.encode(user_prompt))

# Logs token usage for cost tracking
# Example: "system: 480 tokens, user: 320 tokens, max_output: 500"
```

---

### 5.4 Query History Service (query_history_service.py)

**Purpose:** CRUD operations for user query history

**Database Table Schema:**
```sql
CREATE TABLE query_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    query_text TEXT NOT NULL,
    is_saved BOOLEAN DEFAULT FALSE,
    query_name VARCHAR(255),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_use_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: if saved, must have a name
    CONSTRAINT chk_query_name_when_saved 
        CHECK ((is_saved = FALSE AND query_name IS NULL) 
               OR is_saved = TRUE)
);

-- Indexes for common queries
CREATE INDEX idx_query_history_user_id ON query_history(user_id);
CREATE INDEX idx_query_history_last_use_time ON query_history(last_use_time DESC);
CREATE INDEX idx_query_history_is_saved ON query_history(is_saved);
CREATE INDEX idx_query_history_user_saved ON query_history(user_id, is_saved);
```

**Methods:**

| Method | SQL Operation | Permission |
|--------|--------------|-----------|
| `save_query()` | INSERT | Create new (no auth needed initially) |
| `get_user_history()` | SELECT WHERE user_id | Read own |
| `get_history_stats()` | SELECT with aggregates | Read own |
| `update_query()` | UPDATE | Own records only (validated) |
| `delete_query()` | DELETE | Own records only (validated) |
| `delete_all_user_queries()` | DELETE WHERE user_id | Own records only |

**Ownership Validation:**
```python
async def _verify_ownership(self, query_id: int, user_id: str) -> None:
    """Ensure user owns this query before allowing updates/deletes"""
    query = "SELECT user_id FROM query_history WHERE id = $1"
    record = await db_manager.fetchrow(query, query_id)
    
    if not record:
        raise QueryHistoryNotFoundError(...)
    
    if record['user_id'] != user_id:
        raise UnauthorizedAccessError(...)  # User can't access other users' data!
```

---

### 5.5 Ranking Service (ranking_service.py)

**Purpose:** Intelligent multi-factor relevance scoring

**Algorithm Overview:**

$$\text{Relevance Score} = 0.45 \times S_u + 0.30 \times S_r + 0.15 \times S_v + 0.10 \times S_a$$

Where:
- $S_u$ = Status Urgency Score (0-100)
- $S_r$ = Recency Score (0-100)  
- $S_v$ = Transaction Volume Score (0-100)
- $S_a$ = Asset Type Risk Score (0-100)

**Scoring Factors:**

#### 1. Status Urgency (Weight: 45%)
```
REJECTED  → 100  (Highest - needs immediate attention)
ALLEGED   → 75   (Medium - needs verification)
CANCELLED → 50   (Low - already handled)
CLEARED   → 25   (Lowest - completed)
```

#### 2. Recency (Weight: 30%)
```
Formula: score = 100 × (0.5 ^ (age_days / half_life_days))

Example (half_life = 14 days):
Age 0 days    → 100.0  (Today's trade)
Age 7 days    → 70.7   (Half life decay)
Age 14 days   → 50.0   (One half life)
Age 28 days   → 25.0   (Two half-lives)
Age 90+ days  → 0.0    (Too old)
```

#### 3. Transaction Volume (Weight: 15%)
```
Logic: More complex trades (more steps) may warrant attention

Transactions ≤ 4        → 25.0  (Simple)
Transactions 5-19       → 25.0 to 100.0  (Linear)
Transactions ≥ 20       → 100.0 (Complex)
```

#### 4. Asset Type Risk (Weight: 10%)
```
CDS       → 100  (Highest complexity/risk)
IRS       → 95   (High complexity)
EQUITY    → 50   (Medium)
FX        → 70   (Medium-high)
BOND      → 50   (Medium)
COMMODITY → 50   (Medium)
```

**Hot-Reload Configuration:**

The ranking config can be changed **without restarting the service**:

```python
# Call this periodically or on demand
config.reload_if_modified()  # Checks file timestamp

# If changed:
# 1. Reload JSON from disk
# 2. Validate values
# 3. Apply to subsequent ranking operations
# 4. Log the change
```

**Example: Adjusting Weights**

Before updating:
```json
{
  "weights": {
    "status_urgency": 0.45,
    "recency": 0.30,
    "transaction_volume": 0.15,
    "asset_type_risk": 0.10
  }
}
```

Want to deprioritize old trades? Update to:
```json
{
  "weights": {
    "status_urgency": 0.40,
    "recency": 0.40,  // Increased from 0.30
    "transaction_volume": 0.15,
    "asset_type_risk": 0.05  // Decreased
  }
}
```

Next search automatically uses new weights!

---

## 6. AI Integration: Parameter Extraction

### 6.1 Why AI + Bedrock?

**The Problem:**
Users can't write SQL queries. They think in business terms: "Show me pending FX trades from last week"

**The Solution:**
AWS Bedrock + Claude AI interprets natural language and extracts structured parameters:
```
Input:  "Show me pending FX trades from last week"
        ↓
Output: {
  "asset_types": ["FX"],
  "statuses": ["ALLEGED"],
  "date_from": "2026-03-10",
  "date_to": "2026-03-17"
}
```

These params are then used to build SQL safely.

### 6.2 Why Claude 3.5 Sonnet?

| Metric | Why It's Chosen |
|--------|-----------------|
| **Accuracy** | Claude 3.5 is SOTA for instruction-following |
| **Cost** | Haiku model = cheapest tier (~$0.80 per 1M input tokens) |
| **Speed** | Fast enough for real-time searches |
| **Deterministic** | Temperature 0.0 = exact same output for same input |
| **JSON Output** | Excellent at structured JSON generation |

### 6.3 Prompting Strategy

**Key Principle:** "Few-shot learning" - Give examples, not rules

**System Prompt (Role Definition):**
```
You are a trade search parameter extraction assistant.
You understand financial terminology and trade statuses.
Extract ONLY what is explicitly mentioned.
Return ONLY valid JSON.
```

**User Prompt (Dynamic + Examples):**

```
Extract trade search parameters from this query and return them as JSON.

Query: "show me alleged FX trades from last week"

Today's date: 2026-03-17 (Monday)

Extract these parameters (use null if not mentioned):
{
  "trade_id": integer or null,
  "accounts": ["list of account IDs"] or null,
  "asset_types": ["list of asset types"] or null,
  ...
}

EXTRACTION RULES:

Trade ID (HIGHEST PRIORITY - if present, nullify all other fields):
- "trade id 99202386", "trade 99202386" → trade_id: 99202386
- When trade_id is set, all other fields must be null/false

Status (fixed set only):
- "alleged", "pending", "unconfirmed" → ["ALLEGED"]
- "cleared", "confirmed", "settled" → ["CLEARED"]
- "rejected", "failed" → ["REJECTED"]
- "cancelled", "canceled" → ["CANCELLED"]

Asset Types (extract exactly as user says, uppercase):
- "FX", "foreign exchange" → ["FX"]
- "IRS", "interest rate swap" → ["IRS"]
- Exactly as mentioned → extract as-is, uppercase

Date References (today is 2026-03-17):
- "today" → date_from: "2026-03-17", date_to: "2026-03-17"
- "yesterday" → date_from: "2026-03-16", date_to: "2026-03-16"
- "last week" → date_from: "2026-03-10", date_to: "2026-03-17"
- "last month" → date_from: "2026-02-15", date_to: "2026-03-17"
- "from X to Y" → date_from: "X", date_to: "Y"

EXAMPLES:

Query: "trade id 77194044"
Output: {
  "trade_id": 77194044,
  "accounts": null,
  "asset_types": null,
  [all others]: null,
  "with_exceptions_only": false
}

Query: "show me alleged FX trades from last week"
Output: {
  "trade_id": null,
  "accounts": null,
  "asset_types": ["FX"],
  "statuses": ["ALLEGED"],
  "date_from": "2026-03-10",
  "date_to": "2026-03-17",
  "with_exceptions_only": false,
  [others]: null
}
```

**Why This Works:**
1. ✅ Examples show exact format
2. ✅ Rules disambiguate edge cases
3. ✅ Trade ID rule prevents over-extraction
4. ✅ Fixed date calculations remove ambiguity
5. ✅ Tells Claude what to output and how

### 6.4 Caching Strategy

**Problem:** Same queries (e.g., "pending FX trades") asked repeatedly, each hits Bedrock API = high cost + latency

**Solution:** Cache extracted parameters in Redis

```python
# Normalize query for consistency
normalized = query.strip().lower()
# "Show me pending FX trades" → "show me pending fx trades"

# Generate cache key
cache_key = md5(normalized).hexdigest()
# md5("show me pending fx trades") = "abc123def456..."

# Check cache (TTL: 1 hour)
cached_params = await redis.get(f"extract_params:{cache_key}")
if cached_params:
    return cached_params  # Cache hit! Instant, no API call

# Cache miss → Call Bedrock (expensive)
extracted_params = await bedrock.invoke_model(...)

# Save to cache
await redis.setex(
    f"extract_params:{cache_key}",
    3600,  # 1 hour TTL
    json.dumps(extracted_params)
)

return extracted_params
```

**Cache Performance:**
- **Cache Hit:** ~5ms (Redis roundtrip)
- **Cache Miss:** ~500ms-1s (Bedrock API call)
- **Typical Hit Rate:** 60-70% in production

---

## 7. SQL Query Generation & Safety

### 7.1 Parameterized Queries (The Safe Way)

**The Danger Zone (DON'T DO THIS):**

```python
# ❌ DANGEROUS - SQL INJECTION VULNERABILITY
query = f"SELECT * FROM trades WHERE status = '{status}'"
# If status = "ALLEGED'; DROP TABLE trades; --"
# Real query becomes: SELECT * FROM trades WHERE status = 'ALLEGED'; DROP TABLE trades; --'
# BOOM! Table deleted!
```

**The Safe Zone (DO THIS):**

```python
# ✅ SAFE - PARAMETERIZED QUERY
query = "SELECT * FROM trades WHERE status = $1::text"
params = [status]
# asyncpg escapes and handles this securely
await db.fetch(query, status)  # Status value passed safely
```

### 7.2 Why PostgreSQL + asyncpg?

**PostgreSQL Parameterized Queries:**
```sql
-- Placeholders use $1, $2, etc. (not ? like MySQL)
SELECT * FROM trades 
WHERE status = $1::text AND asset_type = $2::text
```

**asyncpg Driver:**
```python
# asyncpg handles the parameterization
import asyncpg

# Prepare query with placeholders
query = "SELECT * FROM trades WHERE status = $1::text AND asset_type = $2::text"

# Pass values separately - asyncpg escapes them
records = await connection.fetch(query, "ALLEGED", "FX")

# asyncpg does:
# 1. Prepare query with placeholders (one-time parse)
# 2. Bind parameters (escapes and type-converts)
# 3. Execute (safe, fast)
```

### 7.3 Handling Lists (ANY operator)

**Problem:** How to filter Status IN ("ALLEGED", "CLEARED")?

**Solution:** PostgreSQL ANY() with array types

```python
# Single value:
conditions.append("status = $1::text")
params.append("ALLEGED")

# Multiple values (list):
conditions.append("status = ANY($1::text[])")  # Array of text
params.append(["ALLEGED", "CLEARED"])

# Generated SQL:
# status = ANY(ARRAY['ALLEGED', 'CLEARED'])
# Which is equivalent to: status IN ('ALLEGED', 'CLEARED')
```

### 7.4 Date Range Queries

**Inclusive on Both Ends:**

```python
# User input: from "2026-03-10" to "2026-03-17"
# Want: All of March 10 through end of March 17

# Problem: If we do:
# WHERE date_field >= 2026-03-10 AND date_field <= 2026-03-17 00:00:00
# We miss all trades on March 17 after midnight!

# Solution: Add 1 day to end date
conditions.append("update_time >= $1::timestamp")  # 2026-03-10 00:00:00
conditions.append("update_time < ($2::timestamp + INTERVAL '1 day')")
# Which is: update_time < 2026-03-18 00:00:00
# Includes all of March 17!

params.append(date(2026, 3, 10))
params.append(date(2026, 3, 17))
```

### 7.5 Safety Validation

```python
def validate_query_safety(query: str, values: list) -> bool:
    """Validate query is safe"""
    
    # 1. Check for dangerous patterns (attempted string concat)
    dangerous = ["' + ", '" + ', "format(", ".format", "%s", "{}"]
    for pattern in dangerous:
        if pattern in query:
            logger.error(f"Unsafe pattern: {pattern}")
            return False
    
    # 2. Check placeholder count matches values
    placeholder_count = query.count("$")
    if placeholder_count != len(values):
        logger.error(f"Mismatch: {placeholder_count} placeholders, {len(values)} values")
        return False
    
    # 3. Check for NULL values in placeholders (caught by asyncpg anyway)
    # But good to log for debugging
    for i, val in enumerate(values):
        if val is None and i in [0, 1]:  # First couple params should exist
            logger.warning(f"Null value at parameter ${i+1}")
    
    return True
```

---

## 8. Intelligent Ranking Algorithm

### 8.1 Why Ranking Matters

**Scenario:** User searches for "FX trades"
- Returns 1,000 matching trades
- Are all equally important? NO!
- Some trades need urgent attention (REJECTED, ALLEGED)
- Some are old (less relevant than recent)
- Some are complex (many transaction steps)

**Ranking Solution:** Automatically sort by business importance

### 8.2 Four-Factor Scoring Model

#### Factor 1: Status Urgency (45% weight)

**Logic:** Some statuses indicate problems needing attention

```
REJECTED  → 100  (Trade was rejected - needs investigation)
ALLEGED   → 75   (Trade not yet confirmed)
CANCELLED → 50   (Cancelled but documented)
CLEARED   → 25   (Successfully cleared - no action needed)
```

**Why 45% weight?**
Status is the primary indicator of a trade needing attention.

#### Factor 2: Recency (30% weight)

**Logic:** Newer trades are more relevant than old ones

**Formula (Exponential Decay):**
$$\text{Score} = 100 \times \left(0.5^{\frac{\text{age\_days}}{\text{half\_life\_days}}}\right)$$

**Example (half_life = 14 days):**

| Age in Days | Decay | Score |
|---|---|---|
| 0 | 1.0 | 100.0 |
| 7 | 0.707 | 70.7 |
| 14 | 0.5 | 50.0 |
| 21 | 0.354 | 35.4 |
| 28 | 0.25 | 25.0 |
| 90+ | 0.0 | 0.0 |

**Why exponential?**
- Recently updated trades get high score
- Score decays smoothly, not abruptly
- Old trades (>90 days) get penalized to 0

#### Factor 3: Transaction Volume (15% weight)

**Logic:** Complex trades (many transaction steps) may need attention

```python
Transactions:           Score:
≤ 4                    25   (Simple transaction)
5-19                   25-100 (Linear interpolation)
≥ 20                   100   (Complex, many steps)
```

**Why lower weight?** Less important than status/recency, but still meaningful

#### Factor 4: Asset Type Risk (10% weight)

**Logic:** Some asset types are higher risk/complexity

```
CDS       → 100  (Credit Default Swaps - complex)
IRS       → 95   (Interest Rate Swaps - complex)
FX        → 70   (Foreign Exchange - medium)
EQUITY    → 50   (Equities - simpler)
BOND      → 50   (Bonds - simpler)
COMMODITY → 50   (Commodities - simpler)
```

**Why lowest weight?** Asset type is less variable than status/recency

### 8.3 Worked Example

**Query:** Show me all FX trades  
**Database Returns:** 3 trades

| Trade ID | Status | Age | Transactions | Asset | Urgency | Recency | Volume | Type | Score |
|---|---|---|---|---|---|---|---|---|---|
| 1001 | ALLEGED | 2 days | 5 | FX | 75 | 95.3 | 25 | 70 | **73.1** |
| 1002 | CLEARED | 5 days | 3 | FX | 25 | 84.1 | 25 | 70 | **48.0** |
| 1003 | ALLEGED | 30 days | 8 | FX | 75 | 6.3 | 60 | 70 | **37.8** |

**Score Calculation for Trade 1001:**

$$\text{Score} = 0.45 \times 75 + 0.30 \times 95.3 + 0.15 \times 25 + 0.10 \times 70$$

$$= 33.75 + 28.59 + 3.75 + 7.00 = 73.09$$

**Ranked Results:**
1. **Trade 1001** - Score 73.1 (ALLEGED, recent, 5 transactions)
2. **Trade 1002** - Score 48.0 (CLEARED, recent, simple)
3. **Trade 1003** - Score 37.8 (ALLEGED, old, complex)

### 8.4 Configuration (ranking_config.json)

```json
{
  "ranking_enabled": true,
  
  "weights": {
    "status_urgency": 0.45,
    "recency": 0.30,
    "transaction_volume": 0.15,
    "asset_type_risk": 0.10
  },
  
  "status_priority": {
    "REJECTED": 100,
    "ALLEGED": 75,
    "CANCELLED": 50,
    "CLEARED": 25
  },
  
  "asset_type_priority": {
    "CDS": 100,
    "IRS": 95,
    "FX": 70,
    "EQUITY": 50,
    "BOND": 50,
    "COMMODITY": 50
  },
  
  "recency_config": {
    "max_age_days": 90,
    "decay_type": "exponential",
    "half_life_days": 14
  },
  
  "transaction_config": {
    "min_transactions_for_bonus": 5,
    "max_transaction_count": 20
  }
}
```

### 8.5 Hot-Reload (Update Without Restart!)

**Change weights dynamically:**

```python
# Edit ranking_config.json:
# Change "status_urgency" weight from 0.45 to 0.50

# Next search automatically:
# 1. Checks if file was modified
# 2. Reloads new config
# 3. Uses new weights
# 4. Logs the reload

# No restart needed!
```

---

## 9. Database Architecture

### 9.1 PostgreSQL Schema

**Trades Table:**
```sql
CREATE TABLE trades (
    id INTEGER PRIMARY KEY,
    account VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,      -- FX, IRS, CDS, EQUITY, BOND, COMMODITY
    booking_system VARCHAR(255) NOT NULL, -- System name
    affirmation_system VARCHAR(255) NOT NULL,
    clearing_house VARCHAR(255) NOT NULL, -- DTCC, LCH, CME, NSCC, JSCC, OTCCHK
    create_time TIMESTAMP NOT NULL,
    update_time TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,          -- ALLEGED, CLEARED, REJECTED, CANCELLED
    
    -- Indexes for common queries
    INDEX idx_status ON trades(status),
    INDEX idx_asset_type ON trades(asset_type),
    INDEX idx_account ON trades(account),
    INDEX idx_update_time ON trades(update_time DESC),
    INDEX idx_create_time ON trades(create_time),
    
    -- Composite indexes for common searches
    INDEX idx_asset_status ON trades(asset_type, status),
    INDEX idx_account_status ON trades(account, status),
    INDEX idx_update_time_status ON trades(update_time DESC, status)
);
```

**Query History Table:**
```sql
CREATE TABLE query_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    query_text TEXT NOT NULL,
    is_saved BOOLEAN DEFAULT FALSE,
    query_name VARCHAR(255),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_use_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_query_name_when_saved
        CHECK ((is_saved = FALSE AND query_name IS NULL) 
               OR is_saved = TRUE),
    
    INDEX idx_user_id ON query_history(user_id),
    INDEX idx_last_use_time ON query_history(last_use_time DESC),
    INDEX idx_is_saved ON query_history(is_saved),
    INDEX idx_user_saved ON query_history(user_id, is_saved)
);
```

### 9.2 Connection Pooling with asyncpg

**Why Connection Pooling?**

Without pooling:
```
Request 1: Create DB connection     (200ms) → Query (100ms) → Close → Total: 300ms
Request 2: Create DB connection     (200ms) → Query (100ms) → Close → Total: 300ms
Request 3: Create DB connection     (200ms) → Query (100ms) → Close → Total: 300ms
```

With pooling:
```
Initial Pool Setup: Create 2-10 connections (one-time)
Request 1: Use pooled connection    (0ms) → Query (100ms) → Return to pool → Total: 100ms
Request 2: Use pooled connection    (0ms) → Query (100ms) → Return to pool → Total: 100ms
Request 3: Use pooled connection    (0ms) → Query (100ms) → Return to pool → Total: 100ms
```

**asyncpg Pool Configuration:**

```python
pool = await asyncpg.create_pool(
    host="localhost",
    port=5432,
    database="trades",
    user="postgres",
    password="postgres",
    min_size=2,          # Always keep 2 connections open
    max_size=10,         # Never exceed 10 connections
    command_timeout=60   # 60-second hard limit on queries
)
```

**Pool Lifecycle:**

```python
# Startup (main.py)
await db_manager.connect()  # Creates pool with min_size connections
# → 2 connections created immediately

# Request 1 (concurrent)
async with db_manager.acquire() as conn:
    await conn.fetch(query)  # Gets conn from pool (or creates new if none available)

# Request 2 (concurrent)
async with db_manager.acquire() as conn:
    await conn.fetch(query)  # Gets different conn from pool

# When pool is full (10 connections) and all in use:
# New request waits for one to become available

# Shutdown (main.py)
await db_manager.disconnect()  # Closes all pooled connections
```

### 9.3 Query Execution Examples

**Simple Single-Value Query:**
```python
# Find specific trade
records = await db.fetch(
    "SELECT * FROM trades WHERE id = $1::integer",
    12345
)
# asyncpg handles type conversion: $1::integer means convert param to int
```

**List Filter Query:**
```python
# Find trades in multiple statuses
records = await db.fetch(
    "SELECT * FROM trades WHERE status = ANY($1::text[])",
    ["ALLEGED", "CLEARED"]
)
# asyncpg handles array type: $1::text[] means array of text
```

**Date Range Query:**
```python
# Trades between dates
from datetime import date

records = await db.fetch(
    """SELECT * FROM trades 
       WHERE update_time >= $1::timestamp 
       AND update_time < ($2::timestamp + INTERVAL '1 day')
       ORDER BY update_time DESC
       LIMIT $3::integer""",
    date(2026, 3, 10),
    date(2026, 3, 17),
    1000
)
# $1, $2, $3 passed as separate values - asyncpg escapes them
```

**Complex Query with Multiple Filters:**
```python
records = await db.fetch(
    """SELECT * FROM trades 
       WHERE asset_type = ANY($1::text[])
       AND status = ANY($2::text[])
       AND update_time >= $3::timestamp
       AND accounting = $4::text
       ORDER BY update_time DESC
       LIMIT $5::integer""",
    ["FX", "IRS"],  # $1 - asset types
    ["ALLEGED"],    # $2 - statuses
    date(2026, 3, 10),  # $3 - date from
    "ACC123",       # $4 - account
    1000            # $5 - limit
)
```

---

## 10. Caching Strategy

### 10.1 Redis Architecture

**Purpose:** Cache expensive computations

| What | TTL | Key Pattern | Use Case |
|-----|-----|-----|-----|
| AI Extractions | 1 hour | `extract_params:{md5(query)}` | Same NL query asked multiple times |
| Search Results | 5 mins | `search_results:{query_id}` | Quick re-runs |
| Query History | 15 mins | `history:{user_id}` | Frequent GET /history calls |

### 10.2 AI Extraction Caching

**Why Cache?**
- Bedrock API calls cost ~$0.80 per 1M input tokens
- Same queries asked repeatedly (e.g., "pending FX trades")
- 500-1000ms latency per API call

**Strategy:**

```python
# 1. Normalize query for consistency
normalized_query = query.strip().lower()
# "Show me FX trades"  →  "show me fx trades"
# "show me fx trades"  →  "show me fx trades"  (same)

# 2. Generate deterministic cache key
cache_key = f"extract_params:{md5(normalized_query).hexdigest()}"

# 3. Check cache
async def extract_parameters(query: str) -> ExtractedParams:
    cache_key = _generate_cache_key(query)
    
    # Cache hit? Return immediately (5ms)
    cached = await redis.get(cache_key)
    if cached:
        logger.info("Cache hit", extra={"cache_key": cache_key})
        return cached
    
    # Cache miss → Call Bedrock API (500-1000ms)
    logger.info("Cache miss - calling Bedrock")
    extracted = await bedrock.invoke_model(...)
    
    # 4. Save to cache (1-hour TTL)
    await redis.setex(cache_key, 3600, json.dumps(extracted))
    
    return extracted
```

**Normalized Query Examples:**

```
Input 1: "Show me FX trades from last week"
Input 2: "show me fx trades from last week"
Input 3: "Show Me FX Trades From Last Week"

Normalized: "show me fx trades from last week"
Cache Key: extract_params:a1b2c3d4e5f6  (same for all 3)

Result: All 3 queries hit the same cache entry!
```

### 10.3 Serialization

**Problem:** Redis stores strings, we need complex objects

**Solution:** JSON serialization

```python
# Saving to cache
extracted_params = ExtractedParams(
    asset_types=["FX"],
    statuses=["ALLEGED"],
    date_from="2026-03-10"
)

# Serialize to JSON before saving
json_str = json.dumps(extracted_params.model_dump())
# {"asset_types": ["FX"], "statuses": ["ALLEGED"], "date_from": "2026-03-10"}

await redis.setex(cache_key, 3600, json_str)

# Retrieving from cache
json_str = await redis.get(cache_key)
# {"asset_types": ["FX"], "statuses": ["ALLEGED"], "date_from": "2026-03-10"}

extracted_params = ExtractedParams(**json.loads(json_str))
# Back to ExtractedParams object
```

### 10.4 TTL (Time To Live) Configuration

```python
# In settings.py
CACHE_TTL_AI_EXTRACTION: int = 3600  # 1 hour
# Same NL query asked within 1-hour window → cache hit
# After 1 hour → cache expires, new Bedrock call

CACHE_TTL_SEARCH_RESULTS: int = 300   # 5 minutes
# Quick re-runs use cached results

CACHE_TTL_QUERY_HISTORY: int = 900    # 15 minutes
# GET /history endpoint results cached
```

### 10.5 Cache Invalidation

**Strategy:** TTL-based expiration (simpler than event-based)

```python
# When user updates a query:
await history_service.update_query(query_id, ...)
# Don't manually delete cache
# Let it expire naturally after TTL

# Why TTL?
# - Simpler (one source of truth: time)
# - No race conditions (all nodes in cluster eventually consistent)
# - Trade-off: Slight stale data until TTL expires
```

---

## 11. System Prompts & Prompt Engineering

### 11.1 System Prompt (SYSTEM_PROMPT)

Located in: `app/prompts/extraction_prompt.py`

```
You are a trade search parameter extraction assistant. Your role is to 
extract structured search parameters from natural language queries about 
financial trades.

You understand:
- Financial terminology and asset types (e.g. FX, IRS, CDS, equity, bonds, etc.)
- Trade statuses: ALLEGED, CLEARED, REJECTED, CANCELLED
- Date references (relative and absolute)
- Account identifiers (format: ACC followed by numbers, e.g. ACC123)
- System names (booking systems, affirmation systems, clearing houses)

RULES:
- Extract ONLY what is explicitly mentioned in the query. Do not infer or 
  add filters that are not stated.
- If a query is specific (e.g. a single trade ID, a single status), return 
  only those parameters and null for everything else.
- If a query is broad (e.g. "show me all FX trades"), extract all relevant 
  filters mentioned.
- Do NOT over-extract. A query about a trade ID should not also set 
  statuses or asset types.

CRITICAL: You must ONLY return valid JSON. No explanatory text, no markdown 
formatting, just pure JSON.
```

**Purpose:**
- Defines AI's persona (parameter extractor)
- Establishes constraints (JSON only, no explanations)
- Lists domain knowledge (financial terms)
- Sets expectations (explicit only, no inference)

### 11.2 User Prompt (Dynamic)

Generated by `build_user_prompt(query, current_date)`

```python
def build_user_prompt(query: str, current_date: datetime = None) -> str:
    """Build the user prompt with dynamic date context"""
    
    if current_date is None:
        current_date = datetime.now()
    
    # Calculate reference dates
    today = current_date.strftime("%Y-%m-%d")        # "2026-03-17"
    yesterday = (current_date - timedelta(1)).strftime("%Y-%m-%d")  # "2026-03-16"
    one_week_ago = (current_date - timedelta(7)).strftime("%Y-%m-%d")  # "2026-03-10"
    one_month_ago = (current_date - timedelta(30)).strftime("%Y-%m-%d")  # "2026-02-15"
    
    prompt = f"""Extract trade search parameters from this query. Return as JSON.

Query: "{query}"

Today's date: {today}

Extract (use null if not mentioned):
{{
  "trade_id": integer or null,
  "accounts": ["list of accounts"] or null,
  "asset_types": ["list"] or null,
  "booking_systems": ["list"] or null,
  "affirmation_systems": ["list"] or null,
  "clearing_houses": ["list"] or null,
  "statuses": ["list"] or null,
  "date_from": "YYYY-MM-DD" or null,
  "date_to": "YYYY-MM-DD" or null,
  "with_exceptions_only": boolean
}}

EXTRACTION RULES:

Trade ID (HIGHEST PRIORITY):
- If numeric ID mentioned, extract it and set all other fields to null
- Examples: "trade id 99202386", "trade 99202386", "find 99202386"

Status (fixed set only):
- "alleged", "pending" → ["ALLEGED"]
- "cleared", "confirmed" → ["CLEARED"]
- "rejected", "failed" → ["REJECTED"]
- "cancelled" → ["CANCELLED"]

Asset Types (extract as mentioned, uppercase):
- User says "FX", extract ["FX"]
- User says "interest rate swap", extract ["IRS"]

Date References:
- "today" → "{today}"
- "yesterday" → "{yesterday}"
- "last week" → from: "{one_week_ago}", to: "{today}"
- "last month" → from: "{one_month_ago}", to: "{today}"
- "from X to Y" → parse absolute dates

EXAMPLES:

Query: "trade id 77194044"
Output: {{
  "trade_id": 77194044,
  "accounts": null,
  "asset_types": null,
  ...all others null...,
  "with_exceptions_only": false
}}

Query: "show me alleged FX trades from last week"
Output: {{
  "trade_id": null,
  "accounts": null,
  "asset_types": ["FX"],
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": ["ALLEGED"],
  "date_from": "{one_week_ago}",
  "date_to": "{today}",
  "with_exceptions_only": false
}}

Query: "cleared IRS trades for ACC012345"
Output: {{
  "trade_id": null,
  "accounts": ["ACC012345"],
  "asset_types": ["IRS"],
  [other systems]: null,
  "statuses": ["CLEARED"],
  "date_from": null,
  "date_to": null,
  "with_exceptions_only": false
}}
"""
    return prompt
```

**Why Dynamic?**
- Relative dates ("last week") need today's date
- Examples help Claude understand expected behavior
- Prompts are deterministic (same input → same output)

### 11.3 Prompt Engineering Best Practices

| Practice | Why | Example |
|----------|-----|---------|
| **Few-Shot Learning** | Examples teach format better than rules | Show 5 example (query, output) pairs |
| **Role Definition** | Clarifies AI responsibility | "You are a parameter extractor" |
| **Constraints** | Prevents hallucination | "Return ONLY JSON, no text" |
| **Explicit > Implicit** | Removes ambiguity | "Extract ONLY explicitly mentioned" |
| **Fixed Enums** | Limits output space | "Statuses: ALLEGED, CLEARED, REJECTED, CANCELLED" |
| **Formatting** | Helps parsing | "Use ISO date format: YYYY-MM-DD" |
| **Temperature 0.0** | Deterministic | Same input → same output (ideal for extraction) |

### 11.4 Validation Rules (build_validation_rules)

After AI extracts, validate response:

```python
def build_validation_rules():
    return {
        "trade_id": {
            "type": "integer",
            "nullable": True,
            "min": 1
        },
        "accounts": {
            "type": "array",
            "items_type": "string",
            "nullable": True,
            "pattern": "^ACC\\d+$"  # Must be ACC followed by digits
        },
        "statuses": {
            "type": "array",
            "items_type": "string",
            "nullable": True,
            "allowed_values": ["ALLEGED", "CLEARED", "REJECTED", "CANCELLED"]
        },
        "date_from": {
            "type": "string",
            "nullable": True,
            "format": "YYYY-MM-DD"
        },
        "date_to": {
            "type": "string",
            "nullable": True,
            "format": "YYYY-MM-DD"
        },
        "with_exceptions_only": {
            "type": "boolean"
        }
    }
```

---

## 12. Configuration Management

### 12.1 Settings (app/config/settings.py)

**Pydantic Settings Pattern** (12-factor app methodology):

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Service Info
    SERVICE_NAME: str = "search-service"
    VERSION: str = "1.0.0"
    
    # Database
    RDS_HOST: str  # Required, no default
    RDS_PORT: int = 5432  # Default: 5432
    RDS_DB: str  # Required
    RDS_USER: str  # Required
    RDS_PASSWORD: str  # Required
    DB_POOL_MIN_SIZE: int = 2
    DB_POOL_MAX_SIZE: int = 10
    DB_COMMAND_TIMEOUT: int = 60
    
    # Redis
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    
    # Bedrock
    BEDROCK_REGION: str = "ap-southeast-2"
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-haiku-20240307-v1:0"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    BEDROCK_MAX_TOKENS: int = 500
    BEDROCK_TEMPERATURE: float = 0.0
    
    # Google Gemini
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_MODEL_ID: str = "gemini-2.5-flash-lite"
    
    # Cache TTLs
    CACHE_TTL_AI_EXTRACTION: int = 3600  # 1 hour
    CACHE_TTL_SEARCH_RESULTS: int = 300  # 5 minutes
    CACHE_TTL_QUERY_HISTORY: int = 900   # 15 minutes
    
    # Application
    MAX_SEARCH_RESULTS: int = 1000
    LOG_LEVEL: str = "INFO"
    ENABLE_CORS: bool = True
    CORS_ORIGINS: list[str] = ["*"]
    
    # Retry
    BEDROCK_RETRY_ATTEMPTS: int = 3
    BEDROCK_RETRY_MIN_WAIT: int = 2
    BEDROCK_RETRY_MAX_WAIT: int = 10
    
    # Helper properties
    @property
    def database_url(self) -> str:
        """Construct PostgreSQL URL"""
        return f"postgresql://{self.RDS_USER}:{self.RDS_PASSWORD}@{self.RDS_HOST}:{self.RDS_PORT}/{self.RDS_DB}"
    
    @property
    def redis_url(self) -> str:
        """Construct Redis URL"""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

# Global instance
settings = Settings()
```

### 12.2 Environment Variables (Local Dev)

**Create `.env` file:**
```bash
# Database (PostgreSQL)
RDS_HOST=localhost
RDS_PORT=5432
RDS_DB=trades
RDS_USER=postgres
RDS_PASSWORD=postgres

# Cache (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS (Optional for local dev - use Google Gemini instead)
# BEDROCK_REGION=ap-southeast-2
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...

# Google (for local dev - Gemini as Bedrock replacement)
GOOGLE_API_KEY=sk-...

# Application
LOG_LEVEL=DEBUG
MAX_SEARCH_RESULTS=1000
```

### 12.3 Environment Variables (Production - ECS)

**In AWS ECS Task Definition:**
```json
{
  "containerDefinitions": [
    {
      "name": "search-service",
      "environment": [
        {"name": "RDS_HOST", "value": "prod-db.rds.amazonaws.com"},
        {"name": "RDS_PORT", "value": "5432"},
        {"name": "RDS_DB", "value": "trades"},
        {"name": "RDS_USER", "value": "produser"},
        {"name": "RDS_PASSWORD", "value": "..."},  // Or use SecureString in Parameter Store
        {"name": "REDIS_HOST", "value": "prod-redis.elasticache.amazonaws.com"},
        {"name": "REDIS_PORT", "value": "6379"},
        {"name": "BEDROCK_REGION", "value": "ap-southeast-2"},
        {"name": "BEDROCK_MODEL_ID", "value": "anthropic.claude-3-haiku-20240307-v1:0"},
        // AWS credentials come from IAM task role, not env vars
        {"name": "LOG_LEVEL", "value": "INFO"},
        {"name": "ENABLE_CORS", "value": "true"}
      ]
    }
  ]
}
```

### 12.4 Ranking Configuration (ranking_config.json)

**JSON File** (hot-reloadable):
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "ranking_enabled": true,
  
  "weights": {
    "status_urgency": 0.45,
    "recency": 0.30,
    "transaction_volume": 0.15,
    "asset_type_risk": 0.10
  },
  
  "status_priority": {
    "REJECTED": 100,
    "ALLEGED": 75,
    "CANCELLED": 50,
    "CLEARED": 25
  },
  
  "asset_type_priority": {
    "CDS": 100,
    "IRS": 95,
    "FX": 70,
    "EQUITY": 50,
    "BOND": 50,
    "COMMODITY": 50
  },
  
  "recency_config": {
    "max_age_days": 90,
    "decay_type": "exponential",
    "half_life_days": 14
  },
  
  "transaction_config": {
    "min_transactions_for_bonus": 5,
    "max_transaction_count": 20
  }
}
```

---

## 13. API Endpoints Reference

### 13.1 Search Endpoint

**POST /api/search**

**Purpose:** Execute a trade search

**Natural Language Request:**
```json
{
  "user_id": "trader_alice",
  "search_type": "natural_language",
  "query_text": "Show me pending FX trades from last week"
}
```

**Manual Search Request:**
```json
{
  "user_id": "trader_bob",
  "search_type": "manual",
  "filters": {
    "asset_type": "FX",
    "status": ["ALLEGED", "CLEARED"],
    "date_type": "update_time",
    "date_from": "2026-03-10",
    "date_to": "2026-03-20",
    "cleared_trades_only": false,
    "with_exceptions_only": false
  }
}
```

**Response (200 OK):**
```json
{
  "query_id": 12345,
  "total_results": 5,
  "search_type": "natural_language",
  "cached": false,
  "execution_time_ms": 234.5,
  "extracted_params": {
    "asset_types": ["FX"],
    "statuses": ["ALLEGED"],
    "date_from": "2026-03-10",
    "date_to": "2026-03-20",
    "trade_id": null,
    "accounts": null,
    "booking_systems": null,
    "affirmation_systems": null,
    "clearing_houses": null,
    "with_exceptions_only": false
  },
  "results": [
    {
      "trade_id": 1001,
      "account": "ACC123",
      "asset_type": "FX",
      "booking_system": "HIGHGARDEN",
      "affirmation_system": "TRAI",
      "clearing_house": "DTCC",
      "create_time": "2026-03-15T09:30:00Z",
      "update_time": "2026-03-15T10:00:00Z",
      "status": "ALLEGED"
    }
    // ... 4 more trades ...
  ]
}
```

**Error Responses:**

| Code | Scenario | Example |
|------|----------|---------|
| 400 | Invalid request | Missing user_id, query_text too short |
| 422 | Validation failed | Invalid status value, malformed date |
| 500 | Database error | Connection pool exhausted |
| 502 | Bedrock API down | AWS service unavailable |
| 503 | Service degraded | Redis unavailable (non-critical) |

---

### 13.2 Query History Endpoints

**GET /api/history**

```
Query Params:
- user_id: Required, the user's ID
- limit: Optional (default 50, max 100)
- saved_only: Optional (default false)

Response: List[QueryHistory]
```

**Example:**
```bash
curl "http://localhost:8000/api/history?user_id=trader_alice&limit=20&saved_only=true"
```

Response:
```json
[
  {
    "query_id": 42,
    "user_id": "trader_alice",
    "query_text": "show me pending FX trades from last week",
    "is_saved": true,
    "query_name": "Weekly FX Review",
    "create_time": "2026-03-18T10:00:00Z",
    "last_use_time": "2026-03-20T09:00:00Z"
  }
]
```

---

**PUT /api/history/{query_id}**

```
Save or rename a query

Request:
{
  "is_saved": true,
  "query_name": "My FX Trades"
}

Response:
{
  "query_id": 42,
  "user_id": "trader_alice",
  "query_text": "show me pending FX trades from last week",
  "is_saved": true,
  "query_name": "My FX Trades",
  "create_time": "2026-03-18T10:00:00Z",
  "last_use_time": "2026-03-20T12:30:00Z",
  "message": "Query saved successfully"
}
```

---

**DELETE /api/history/{query_id}**

```
Delete a query from history

Response:
{
  "query_id": 42,
  "message": "Query deleted successfully"
}
```

---

### 13.3 Health Check Endpoint

**GET /health**

```
Purpose: ECS target group health check

Response (200 OK):
{
  "status": "healthy",
  "service": "search-service",
  "version": "1.0.0",
  "timestamp": "2026-03-20T14:22:00Z",
  "checks": {
    "database": {
      "status": "ok",
      "required": true
    },
    "cache": {
      "status": "ok",
      "required": false
    }
  }
}
```

**Status Rules:**
- Returns 200 if database is healthy (required)
- Returns 503 if database is down
- Continues even if Redis is down (non-critical)

---

## 14. Example: Complete Request-Response Flow

### Scenario: Trader Alice searches for problematic FX trades

**Step 1: Frontend builds request**
```json
{
  "user_id": "alice_trader_123",
  "search_type": "natural_language",
  "query_text": "show me disputed FX trades that were rejected in the past month"
}
```

---

**Step 2: API receives & validates**

`POST /api/search` → FastAPI validates against `SearchRequest` model
- ✅ user_id: Valid (non-empty string)
- ✅ search_type: Valid ("natural_language")
- ✅ query_text: Valid (>3 chars)

---

**Step 3: Save to query history**

```sql
INSERT INTO query_history 
(user_id, query_text, is_saved, query_name, create_time, last_use_time)
VALUES ('alice_trader_123', 'show me disputed FX trades...', FALSE, NULL, NOW(), NOW())
RETURNING id
```
Returns: `query_id = 99999`

---

**Step 4: Parameter extraction (AI)**

**Cache Check:**
```
cache_key = md5("show me disputed fx trades that were rejected in the past month")
           = "xyz789abc123..."
redis.get("extract_params:xyz789abc123...") → Miss (first time)
```

**Call Bedrock Claude:**

**System Prompt:**
```
You are a trade search parameter extraction assistant...
[Role definition, rules, etc.]
```

**User Prompt** (with dynamic dates):
```
Extract trade search parameters from this query:

Query: "show me disputed FX trades that were rejected in the past month"

Today: 2026-03-20 (Wednesday)

Extract:
{
  "trade_id": null,
  "accounts": null,
  "asset_types": ["FX"],
  "statuses": ["REJECTED"],
  "date_from": "2026-02-18",
  "date_to": "2026-03-20",
  ...
}

[Examples and extraction rules...]
```

**Claude's Response:**
```json
{
  "trade_id": null,
  "accounts": null,
  "asset_types": ["FX"],
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": ["REJECTED"],
  "date_from": "2026-02-18",
  "date_to": "2026-03-20",
  "with_exceptions_only": false
}
```

**Cache Save** (1-hour TTL):
```
redis.setex(
  "extract_params:xyz789abc123...",
  3600,
  '{"asset_types": ["FX"], "statuses": ["REJECTED"], ...}'
)
```

---

**Step 5: Build SQL Query**

```python
# Input:
ExtractedParams(
    asset_types=["FX"],
    statuses=["REJECTED"],
    date_from="2026-02-18",
    date_to="2026-03-20"
)

# Build:
conditions = [
    "asset_type = ANY($1::text[])",      # $1 = ["FX"]
    "status = ANY($2::text[])",          # $2 = ["REJECTED"]
    "update_time >= $3::timestamp",      # $3 = 2026-02-18
    "update_time < ($4::timestamp + INTERVAL '1 day')"  # $4 = 2026-03-20
]

query = """
SELECT id, account, asset_type, booking_system, affirmation_system,
       clearing_house, create_time, update_time, status
FROM trades
WHERE 1=1 
  AND asset_type = ANY($1::text[])
  AND status = ANY($2::text[])
  AND update_time >= $3::timestamp
  AND update_time < ($4::timestamp + INTERVAL '1 day')
ORDER BY update_time DESC
LIMIT 1000
"""

params = [
    ["FX"],                         # $1
    ["REJECTED"],                   # $2
    date(2026, 2, 18),             # $3
    date(2026, 3, 20)              # $4
]
```

**Safety Validation:**
- ✅ No dangerous patterns ("' +", format(), etc.)
- ✅ Placeholder count (4) matches params count (4)
- ✅ No string concatenation

---

**Step 6: Execute Query**

```python
# Get connection from pool
async with db_manager.acquire() as conn:
    # asyncpg prepares and binds parameters securely
    records = await conn.fetch(query, *params)
```

**Database executes:**
```sql
SELECT id, account, asset_type, booking_system, affirmation_system,
       clearing_house, create_time, update_time, status
FROM trades
WHERE asset_type = $1  [= 'FX']
  AND status = $2      [= 'REJECTED']
  AND update_time >= $3 [≥ 2026-02-18]
  AND update_time < ($4 + 1 day)  [< 2026-03-21]
ORDER BY update_time DESC
LIMIT 1000
```

**Returns:** 8 matching trade records

---

**Step 7: Apply Intelligent Ranking**

**Fetch enriched data (transaction counts):**
```sql
SELECT 
    t.id AS trade_id,
    COUNT(tx.id) AS transaction_count
FROM trades t
LEFT JOIN transactions tx ON t.id = tx.trade_id
WHERE t.id = ANY([1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012])
GROUP BY t.id
```

**Calculate relevance scores:**

| Trade | Status | Age | Transactions | Score |
|-------|--------|-----|---|---|
| 1005 | REJECTED | 3 days | 12 | **72.3** |
| 1006 | REJECTED | 5 days | 8 | **69.5** |
| 1007 | REJECTED | 15 days | 6 | **51.2** |
| 1008 | REJECTED | 25 days | 4 | **35.8** |
| 1009 | REJECTED | 40 days | 15 | **28.4** |
| 1010 | REJECTED | 50 days | 3 | **18.2** |
| 1011 | REJECTED | 60 days | 20 | **15.0** |
| 1012 | REJECTED | 65 days | 2 | **8.1** |

**Ranked Output:** Trade 1005 → 1006 → 1007 → ... → 1012

---

**Step 8: Format Response**

```json
{
  "query_id": 99999,
  "total_results": 8,
  "search_type": "natural_language",
  "cached": false,
  "execution_time_ms": 412.3,
  "extracted_params": {
    "trade_id": null,
    "accounts": null,
    "asset_types": ["FX"],
    "booking_systems": null,
    "affirmation_systems": null,
    "clearing_houses": null,
    "statuses": ["REJECTED"],
    "date_from": "2026-02-18",
    "date_to": "2026-03-20",
    "with_exceptions_only": false
  },
  "results": [
    {
      "trade_id": 1005,
      "account": "ACC123",
      "asset_type": "FX",
      "booking_system": "HIGHGARDEN",
      "affirmation_system": "TRAI",
      "clearing_house": "DTCC",
      "create_time": "2026-03-17T09:30:00Z",
      "update_time": "2026-03-17T14:15:00Z",
      "status": "REJECTED"
    },
    {
      "trade_id": 1006,
      "account": "ACC456",
      "asset_type": "FX",
      "booking_system": "WINTERFELL",
      "affirmation_system": "MARC",
      "clearing_house": "LCH",
      "create_time": "2026-03-15T11:45:00Z",
      "update_time": "2026-03-15T13:20:00Z",
      "status": "REJECTED"
    },
    // ... 6 more trades ranked by relevance ...
  ]
}
```

---

**Step 9: Frontend receives & displays**

Frontend receives top 8 rejected FX trades, sorted by business relevance:
1. **Most recent + complex** = Most attention needed
2. Next most relevant
3. ... continuing in order of business importance

Alice can immediately see which rejected trades need investigation first.

---

## 15. Testing & Deployment

### 15.1 Testing Strategy

**Test Coverage:**

| Category | Tests | Location |
|----------|-------|----------|
| **Unit** | Query builder, SQL generation, ranking | `tests/test_query_builder.py` |
| | Parameter extraction validation | `tests/test_bedrock_service.py` |
| | Model validation | `tests/test_models.py` |
| **Integration** | End-to-end search flow | `tests/test_search_orchestrator.py` |
| | Database queries (LocalStack) | `tests/test_db_integration.py` |
| **API** | HTTP endpoints with httpx | `tests/test_api_search.py` |
| | Health check endpoints | `tests/test_api_health.py` |

**Running Tests:**
```bash
# All tests
make test

# Specific test file
pytest tests/test_query_builder.py -v

# With coverage
pytest --cov=app tests/ --cov-report=html

# Verbose with local stack
make test-integration
```

### 15.2 Docker Deployment

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy app
COPY app/ app/

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build & Run:**
```bash
# Build
docker build -t search-service:latest .

# Run locally
docker run -it \
  -e RDS_HOST=postgres \
  -e REDIS_HOST=redis \
  -e GOOGLE_API_KEY=sk-... \
  -p 8000:8000 \
  search-service:latest
```

### 15.3 Health Checks & Monitoring

**FastAPI Metrics:**
```
GET /docs              # Interactive API documentation
GET /redoc             # Alternative documentation
GET /health            # Health check (used by ECS)
GET /                  # Service info
```

**Logging:**
```python
# All logs are structured JSON
{
  "timestamp": "2026-03-20T14:22:00Z",
  "level": "INFO",
  "message": "Search completed successfully",
  "user_id": "alice_trader_123",
  "query_id": 99999,
  "results_count": 8,
  "execution_time_ms": 412.3,
  "search_type": "natural_language"
}
```

**Sent to CloudWatch** (via stdout in ECS)

---

## Summary

The Search Service pipeline demonstrates:

1. ✅ **AI Integration** - Bedrock Claude for NL understanding
2. ✅ **Safety** - Parameterized SQL, 100% SQL injection proof
3. ✅ **Caching** - Redis for expensive AI calls
4. ✅ **Intelligent Ranking** - Multi-factor relevance scoring
5. ✅ **Connection Pooling** - Efficient database usage
6. ✅ **Hot Configuration** - Ranking config reload without restart
7. ✅ **Error Handling** - Graceful degradation, comprehensive logging
8. ✅ **Production Ready** - Health checks, metrics, structured logging

This architecture enables traders to search complex financial data using natural language while maintaining security, performance, and reliability.

