# Complete RAG Pipeline Explanation: rag-service

## Table of Contents
1. [RAG Concept Overview](#1-rag-concept-overview)
2. [Complete Code Structure](#2-complete-code-structure)
3. [Data Flow: Query to Response](#3-data-flow-query-to-response)
4. [Key Components Deep Dive](#4-key-components-deep-dive)
5. [Vector Database Integration](#5-vector-database-integration-milvus)
6. [Prompt Engineering](#6-prompt-engineering)
7. [Dependencies & Libraries](#7-dependencies--libraries)
8. [Configuration](#8-configuration)
9. [API Endpoints](#9-api-endpoints)
10. [Concrete Example: Request-Response Flow](#10-concrete-example-request-response-flow)

---

## 1. RAG Concept Overview

### What is RAG?

**RAG = Retrieval-Augmented Generation**

RAG is a technique that combines **information retrieval** with **generative AI** to answer questions more accurately by:

1. **Retrieval**: Finding relevant documents from a knowledge base (using semantic search)
2. **Augmentation**: Adding those documents as context to the LLM prompt
3. **Generation**: Having the LLM generate a response based on retrieved context

### Why is RAG Needed?

**Problem without RAG:**
- LLMs have fixed knowledge cutoff dates
- LLMs can "hallucinate" (make up wrong information)
- LLMs don't have access to company-specific or real-time data
- Generic responses without domain expertise

**Solution with RAG:**
- LLM only answers based on retrieved documents → more factual
- Can handle domain-specific knowledge → more accurate
- Can be updated by adding new documents → fresh information
- Reduces hallucinations → higher confidence

### General RAG Flow

```
┌─────────────────────┐
│   User Query        │
└──────────┬──────────┘
           │
           ├──→ Step 1: RETRIEVAL
           │    - Convert query to vector embedding
           │    - Search vector database for similar documents
           │    - Retrieve top-N most relevant documents
           │
           ├──→ Step 2: AUGMENTATION
           │    - Format retrieved documents as context
           │    - Build prompt with context + original query
           │
           ├──→ Step 3: GENERATION
           │    - Send augmented prompt to LLM
           │    - LLM generates response based on context
           │
           └──→ Step 4: RETURN RESPONSE
                - Return generated answer with citations
```

---

## 2. Complete Code Structure

### Directory Layout

```
rag-service/
├── main.py                          # FastAPI application entrypoint
├── requirements.txt                 # Python dependencies
├── README.md                        # Service documentation
├── docker-compose.yml               # Development environment
├── Dockerfile                       # Container image definition
└── app/
    ├── __init__.py
    ├── api/
    │   └── routes/
    │       ├── __init__.py
    │       ├── health.py           # Health check endpoints
    │       ├── chat.py             # Chat completion endpoint
    │       ├── documents.py        # Document ingestion & search endpoints
    │       └── generate.py         # Solution generation endpoint
    │
    ├── services/
    │   ├── __init__.py
    │   ├── vector_store.py         # Milvus vector database wrapper
    │   ├── bedrock_service.py      # AWS Bedrock LLM & embeddings
    │   ├── gemini_service.py       # Google Gemini LLM
    │   └── narrative_formatter.py  # Convert structured data → narratives
    │
    ├── models/
    │   └── __init__.py             # (Empty - uses Pydantic schemas instead)
    │
    ├── schemas/
    │   ├── __init__.py
    │   ├── chat.py                 # Chat request/response models
    │   └── document.py             # Document ingestion/search models
    │
    ├── config/
    │   ├── __init__.py
    │   └── settings.py             # Environment configuration
    │
    └── utils/
        ├── __init__.py
        └── text_cleaner.py         # Text normalization utilities
```

### Key Files Summary

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app setup, CORS, Milvus connection management |
| `app/config/settings.py` | Loads config from environment variables (AWS keys, API keys, Milvus host, etc.) |
| `app/services/vector_store.py` | Milvus API wrapper for storing & searching embeddings |
| `app/services/bedrock_service.py` | AWS Bedrock for embeddings + chat completion |
| `app/services/gemini_service.py` | Google Gemini for chat completion |
| `app/services/narrative_formatter.py` | Transforms trading exception data into semantic narratives |
| `app/api/routes/documents.py` | `/api/rag/documents/*` endpoints (ingest, search, similar) |
| `app/api/routes/generate.py` | `/api/rag/generate/{exception_id}` endpoint (generate solutions) |
| `app/api/routes/chat.py` | `/api/rag/chat/completion` endpoint (raw chat) |
| `app/schemas/document.py` | Pydantic models for document requests/responses |
| `app/schemas/chat.py` | Pydantic models for chat requests/responses |
| `app/utils/text_cleaner.py` | Normalizes retrieved text from vector DB |

---

## 3. Data Flow: Query to Response

### Step-by-Step Flow for "Find Similar Exceptions"

The most complex endpoint is `GET /api/rag/documents/similar-exceptions/{exception_id}`, which demonstrates the full RAG pipeline:

```
USER REQUEST
  └─→ GET /api/rag/documents/similar-exceptions/EXC-12345?limit=3&explain=true

STEP 0: Auto-Ingest if Needed
  ├─→ Check if exception exists in Milvus
  ├─→ If NOT found:
  │   ├─→ Fetch exception data from exception-service
  │   ├─→ Fetch trade details from trade-flow-service
  │   ├─→ Fetch transaction history from trade-flow-service
  │   ├─→ Format into narrative using NarrativeFormatter
  │   ├─→ Generate embedding using Bedrock
  │   └─→ Store in Milvus
  └─→ If found: skip to Step 1

STEP 1: Retrieval - Vector Search
  ├─→ Retrieve exception document from Milvus (by exception_id)
  ├─→ Get its embedding vector
  ├─→ Search similar documents using COSINE similarity
  ├─→ Use Milvus search with:
  │   ├─→ Query embedding: from query exception
  │   ├─→ Metric: COSINE (0=opposite, 1=identical)
  │   ├─→ Index: IVF_FLAT (Inverted File Flat)
  │   ├─→ Limit: 3 (top-3 similar exceptions)
  │   └─→ Exclude: source exception itself
  └─→ Return top-3 results with similarity scores (0-100%)

STEP 2: Enrichment - Fetch Context
  ├─→ For each similar exception found:
  │   ├─→ Get exception ID, trade ID, similarity score
  │   ├─→ Retrieve full narrative text from vector DB
  │   └─→ Fetch solution from solution-service (optional)
  └─→ Collect all enriched data

STEP 3: Generation - LLM Explanations (Optional)
  ├─→ If explain=true:
  │   ├─→ Prepare batch prompt with source exception
  │   ├─→ Add all 3 similar exceptions to compare
  │   ├─→ Call Gemini LLM with batch explanation prompt
  │   ├─→ Parse response: extract explanations for each
  │   └─→ Attach explanations to results
  └─→ If explain=false: skip this step

STEP 4: Return Response
  └─→ Return SimilarExceptionsResponse with:
      ├─→ source_exception_id
      ├─→ source_text (full narrative)
      ├─→ similar_exceptions[] array with:
      │   ├─→ exception_id
      │   ├─→ trade_id
      │   ├─→ similarity_score (0-100%)
      │   ├─→ priority, asset_type, clearing_house
      │   ├─→ exception_msg
      │   ├─→ full text (narrative)
      │   └─→ explanation (LLM-generated reason for similarity)
      └─→ count
```

### Step-by-Step Flow for "Generate Solution"

Another key endpoint: `GET /api/rag/generate/{exception_id}?limit=3`

```
USER REQUEST
  └─→ GET /api/rag/generate/EXC-12345?limit=3

STEP 0: Auto-Ingest if Needed
  └─→ Same as above: check if exception in Milvus, ingest if not

STEP 1: Retrieval - Find Similar Cases
  ├─→ Get exception embedding from Milvus
  ├─→ Search for similar exceptions (limit: 3)
  ├─→ Get top-3 similar exceptions with narratives
  └─→ Return: list of HistoricalCase objects

STEP 2: Augmentation - Fetch Historical Context
  ├─→ For each similar exception:
  │   ├─→ Get exception narrative from vector DB
  │   ├─→ Query solution-service for solution details
  │   ├─→ Build HistoricalCase with narrative + solution
  │   └─→ Collect all enriched cases
  └─→ Build complete context

STEP 3: Prompt Building - Create RAG Prompt
  ├─→ Build system prompt (senior analyst persona)
  ├─→ Format historical cases with:
  │   ├─→ Full exception narrative
  │   ├─→ Confirmed solution title
  │   ├─→ Solution description
  │   ├─→ Similarity score percentage
  │   └─→ Case reference event
  ├─→ Format new exception query
  └─→ Combine: system_prompt + historical_cases + new_case

STEP 4: Generation - LLM Generates Solution
  ├─→ Initialize Gemini service with API key
  ├─→ Call LLM with augmented prompt
  ├─→ Request structured output:
  │   ├─→ ROOT CAUSE ANALYSIS
  │   ├─→ RECOMMENDED RESOLUTION STEPS
  │   ├─→ RISK CONSIDERATIONS
  │   └─→ CONFIDENCE LEVEL
  ├─→ Parse response into GeneratedSolution
  └─→ Store raw response for verification

STEP 5: Return Response
  └─→ Return GenerateSolutionResponse with:
      ├─→ exception_id
      ├─→ generated_solution (structured)
      ├─→ historical_cases[] (context used)
      └─→ message
```

---

## 4. Key Components Deep Dive

### 4.1 Document Ingestion & Embedding Generation

**File:** `app/api/routes/documents.py` → `ingest_documents()` endpoint

**What it does:**
1. Receives raw documents with text
2. Generates embeddings for each document
3. Stores documents + embeddings in Milvus

**Code flow:**
```python
@router.post("/ingest")
async def ingest_documents(documents: List[IngestDocument]):
    # Step 1: Initialize Bedrock service
    bedrock = BedrockService(
        region_name="ap-southeast-1",
        embed_model_id="cohere.embed-english-v3"  # 1024-dim vectors
    )
    
    # Step 2: Generate embeddings
    embeddings = []
    for text in documents:
        embedding = bedrock.get_embedding(text)  # Returns List[float]
        embeddings.append(embedding)
    
    # Step 3: Store in Milvus
    document_ids = request.app.state.vector_store.add_documents(
        texts=texts,
        embeddings=embeddings,
        metadata=[doc.metadata for doc in documents]
    )
    
    return IngestResponse(document_ids=document_ids, count=len(document_ids))
```

**Special case: Exception Ingestion**
For exceptions, there's a more complex flow that formats data as narratives:

```python
@router.post("/ingest-exception")
async def ingest_exception(payload: IngestException):
    # Payload: {"trade_id": "T-123", "exception_id": "EXC-123"}
    
    # Step 1: Check if already ingested
    if vector_store.exists_by_exception_id(payload.exception_id):
        raise HTTPException(409, "Already exists")
    
    # Step 2: Fetch and gather data
    exception_data = await fetch_from_exception_service(exc_id)
    trade_data = await fetch_from_trade_flow_service(trade_id)
    history_data = await fetch_from_trade_flow_service(trade_id/transactions)
    
    # Step 3: Format as narrative
    formatter = NarrativeFormatter()
    narrative = formatter.format_exception_narrative(
        history_data, exception_data, trade_data, trade_id, exception_id
    )
    
    # Step 4: Generate embedding
    embedding = bedrock.get_embedding(narrative)
    
    # Step 5: Store with metadata
    metadata = formatter.create_metadata(
        history_data, exception_data, trade_data, trade_id, exception_id
    )
    vector_store.add_documents(
        texts=[narrative],
        embeddings=[embedding],
        metadata=[metadata]
    )
```

### 4.2 Vector Search & Retrieval

**File:** `app/services/vector_store.py` → `search()` and `find_similar_by_exception_id()` methods

**Algorithm:**
- **Vector Database:** Milvus
- **Index Type:** IVF_FLAT (Inverted File with flat quantization)
- **Distance Metric:** COSINE similarity
- **Query:** Input embedding vector + limit

**Cosine Similarity:**
$$\text{cosine\_similarity}(u, v) = \frac{u \cdot v}{||u|| \cdot ||v||}$$

- **Result:** 0 to 1 (0 = opposite, 1 = identical)
- **Conversion:** multiply by 100 to get percentage

**Code:**
```python
def search(self, query_embedding: List[float], limit: int = 5):
    """Search using embedding vector"""
    search_params = {
        "metric_type": "COSINE",
        "params": {"nprobe": 10},  # Number of clusters to probe
    }
    
    results = self._collection.search(
        data=[query_embedding],          # Wrap in list (batch query)
        anns_field="vector",             # Search the "vector" field
        param=search_params,
        limit=limit,
        output_fields=["text", "metadata"]
    )
    
    # Convert to dict format with percentage scores
    hits = []
    for hit in results[0]:  # results[0] = first (only) query result
        hits.append({
            "id": hit.id,
            "text": hit.entity.get("text"),
            "metadata": hit.entity.get("metadata"),
            "score": hit.score * 100  # Convert to percentage
        })
    return hits
```

### 4.3 Narrative Formatting (Exception → Semantic Text)

**File:** `app/services/narrative_formatter.py`

**Why:** Structured exception data is not good for semantic search. Convert to natural language.

**Input:** Structured trade exception data
```json
{
  "exception_data": {
    "msg": "Credit limit exceeded",
    "priority": "HIGH",
    "comment": "Account ABC hit credit ceiling"
  },
  "trade_data": {
    "asset_type": "FX Forward",
    "clearing_house": "LCH",
    "account": "ACC-123",
    "booking_system": "Bloomberg Eikon"
  },
  "history_data": [
    {"entity": "Bloomberg", "type": "BOOKING", "step": 1, "status": "SUCCESS"},
    {"entity": "DTCC", "type": "CREDIT_CHECK", "step": 2, "status": "REJECTED"}
  ]
}
```

**Output:** Human-readable semantic narrative
```
Exception Type: Credit Capacity Constraint

Primary Issue:
Exception: Credit limit exceeded
Context: Account ABC hit credit ceiling
Priority: HIGH

Trade Context:
- Asset Type: FX Forward
- Clearing House: LCH
- Account: ACC-123
- Booking System: Bloomberg Eikon

Failure Pattern:
- Failed At: credit check
- Responsible Entity: DTCC
- Stage: Step 2 of 2
- Processing Duration: 5 seconds
- Entities Involved: Bloomberg, DTCC

Transaction Sequence:
  → Bloomberg: booking [SUCCESS]
  → DTCC: credit check [FAILED]

Problem Summary:
This FX Forward trade clearing through LCH encountered a Credit Capacity Constraint issue. The specific error "Credit limit exceeded" occurred during the credit check phase handled by DTCC. Additional context: Account ABC hit credit ceiling. This type of failure typically indicates issues with insufficient credit capacity, credit line unavailability, or counterparty credit rating issues.

Search Keywords: credit limit exceeded, credit capacity constraint, fx forward, lch, credit check, dtcc, account abc hit credit ceiling
```

**Key Methods:**
```python
class NarrativeFormatter:
    @staticmethod
    def categorize_exception(error_msg, comment) → str
        # Maps exception message to problem categories
        # Examples: "Settlement Instructions Problem", "Credit Capacity Constraint"
        # Returns: pipe-separated categories
    
    @staticmethod
    def get_entities_involved(history_data) → List[str]
        # Extracts unique entities from transaction history
        # Example: ["Bloomberg", "DTCC", "JPMorgan"]
    
    @staticmethod
    def find_rejection_step(history_data) → int
        # Finds which step in the transaction flow failed
        # Example: 2 (failed at step 2 of 5)
    
    @classmethod
    def format_exception_narrative(history, exception, trade, ...) → str
        # Main method: converts all data into narrative
        # Optimized for semantic similarity search
    
    @classmethod
    def create_metadata(history, exception, trade, ...) → Dict
        # Creates structured metadata for filtering
        # Fields: trade_id, exception_id, asset_type, clearing_house, etc.
```

### 4.4 LLM Services

#### Bedrock Service (AWS)
**File:** `app/services/bedrock_service.py`

**Capabilities:**
- Embedding generation: `cohere.embed-english-v3` (1024 dimensions)
- Chat completion: `us.amazon.nova-lite-v1:0` (fast, lite model)

**Methods:**
```python
def get_embedding(text: str) -> List[float]:
    """Generate 1024-dimensional embedding"""
    payload = {
        "texts": [text],
        "input_type": "search_document"  # or "search_query"
    }
    response = invoke_model("cohere.embed-english-v3", payload)
    return response["embeddings"][0]

def chat_completion(messages, temperature, max_tokens) -> str:
    """Generate response using Nova model"""
    # Nova uses InvokeModel API
    # Claude uses Converse API
    # Both auto-handled by this method
```

#### Gemini Service (Google)
**File:** `app/services/gemini_service.py`

**Capabilities:**
- Chat completion: `gemini-2.5-flash-lite` (fast, multimodal)
- Batch explanations: Can process multiple documents in one call

**Key feature:**
```python
def batch_explain_similarities(source_text, similar_texts, ...) -> List[str]:
    """
    Generate explanations for WHY multiple documents are similar.
    
    Input:
    - source_text: "Credit limit exceeded on FX Forward..."
    - similar_texts: [
        {"exception_id": "EXC-456", "text": "..."},
        {"exception_id": "EXC-789", "text": "..."}
    ]
    
    Output: ["Both involve credit capacity issues...", "Similar asset class..."]
    """
    # Single LLM call for multiple explanations (efficiency)
    prompt = f"Source: {source_text}\n\nExceptions to compare:\n"
    for i, doc in enumerate(similar_texts):
        prompt += f"[{i+1}] {doc['text']}\n"
    
    response = self.chat_completion([...], ...)
    
    # Parse response: extract [EXCEPTION 1], [EXCEPTION 2], etc.
    return parse_explanations(response)
```

---

## 5. Vector Database Integration: Milvus

### Milvus Architecture

**What is Milvus?**
- Open-source vector database optimized for similarity search
- Stores vectors in indexes for fast retrieval
- Supports filtering on structured metadata

**Configuration (from settings.py):**
```python
MILVUS_HOST: str = "localhost"
MILVUS_PORT: int = 19530
MILVUS_USER: str = ""  # For production auth
MILVUS_PASSWORD: str = ""  # For production auth
MILVUS_COLLECTION: str = "documents"  # Table name
MILVUS_SSL: bool = False  # Enable in production
VECTOR_DIM: int = 1024  # Cohere embedding dimension
```

### Collection Schema

**SQL-like structure:** (how documents are stored)

```
Collection: "documents"

Fields:
┌─────────────┬──────────────────┬─────────────────┐
│ Field Name  │ Type             │ Description     │
├─────────────┼──────────────────┼─────────────────┤
│ id          │ INT64 (auto)     │ Primary key     │
│ text        │ VARCHAR (65535)  │ Document text   │
│ metadata    │ JSON             │ Structured data │
│ vector      │ FLOAT_VECTOR     │ Embedding (1024 │
│             │ (dim=1024)       │ dimensions)     │
└─────────────┴──────────────────┴─────────────────┘

Indexes:
- vector: IVF_FLAT, COSINE metric, nlist=1024
  (1024 partitions for faster search)
```

### Insert Operation

**Database operation:**
```python
def add_documents(texts, embeddings, metadata):
    """Insert documents into Milvus"""
    entities = [
        {
            "text": text,
            "vector": embedding,
            "metadata": meta
        }
        for text, embedding, meta in zip(texts, embeddings, metadata)
    ]
    
    insert_result = self._collection.insert(entities)
    self._collection.flush()  # Persist to disk
    
    return insert_result.primary_keys  # Auto-generated IDs
```

### Search Operation

**Similarity search:**
```python
def search(query_embedding, limit):
    """Find similar documents"""
    search_params = {
        "metric_type": "COSINE",
        "params": {"nprobe": 10}  # Probe 10% of partitions
    }
    
    results = self._collection.search(
        data=[query_embedding],
        anns_field="vector",        # Search on vector field
        param=search_params,
        limit=limit,
        output_fields=["text", "metadata"]
    )
    
    # Results are sorted by similarity score (descending)
    return [
        {
            "id": hit.id,
            "text": hit.entity.get("text"),
            "metadata": hit.entity.get("metadata"),
            "score": hit.score  # 0-1 range
        }
        for hit in results[0]
    ]
```

### Query Operation

**Exact/filtered search:**
```python
def exists_by_exception_id(exception_id):
    """Check if document exists with this exception_id"""
    expr = f'metadata["exception_id"] == "{exception_id}"'
    results = self._collection.query(
        expr=expr,
        output_fields=["id"],
        limit=1
    )
    return len(results) > 0

def get_document_by_exception_id(exception_id):
    """Retrieval document by exception_id"""
    expr = f'metadata["exception_id"] == "{exception_id}"'
    results = self._collection.query(
        expr=expr,
        output_fields=["id", "text", "metadata", "vector"],
        limit=1
    )
    return results[0] if results else None
```

---

## 6. Prompt Engineering

### System Prompt for Solution Generation

**File:** `app/api/routes/generate.py` → `_generate_solution_with_llm()`

```python
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
```

### User Prompt Structure

**Context building:**
```python
user_prompt = f"""HISTORICAL EXCEPTIONS WITH CONFIRMED SOLUTIONS:

--- HISTORICAL CASE 1 (Similarity: 92.3%) ---
Exception ID: EXC-456
Trade ID: T-789

Exception Details:
{case1_narrative}

CONFIRMED SOLUTION:
Title: {solution.title}
Solution: {solution.solution_description}
Solution Score: {solution.scores}/27

--- HISTORICAL CASE 2 (Similarity: 87.6%) ---
[similar format...]

--- HISTORICAL CASE 3 (Similarity: 81.2%) ---
[similar format...]

NEW EXCEPTION TO ANALYZE:
--- NEW CASE ---
Exception ID: EXC-123
Trade ID: T-456

Exception Details:
{new_case_narrative}

Based on the historical cases above, provide your structured analysis below:"""
```

**All three components in flow:**
1. System prompt → Sets analyst role, task, constraints
2. Similar historical cases → Provides analogies + confirmed solutions
3. New exception → Problem to solve

**LLM is instructed to:**
- Recognize patterns from historical cases  
- Analyze differences in the new case
- Propose solution grounded in similar scenarios
- Assess confidence level
- Flag missing information

### Prompt for Batch Similarity Explanations

**File:** `app/services/gemini_service.py` → `batch_explain_similarities()`

```python
system_prompt = (
    "You are an expert at analyzing trade exception similarities. "
    "Given a source exception and multiple similar exceptions, "
    "explain WHY each similar exception is related to the source. "
    "Focus on: shared patterns, common error types, similar trade flows, "
    "matching securities/parties, or comparable settlement issues. "
    "Keep each explanation concise (2-3 sentences)."
)

user_prompt = f"""SOURCE EXCEPTION:
{source_text}

---

SIMILAR EXCEPTIONS TO ANALYZE:

[EXCEPTION 1] (ID: EXC-456)
{similar_text_1}

[EXCEPTION 2] (ID: EXC-789)
{similar_text_2}

[EXCEPTION 3] (ID: EXC-321)
{similar_text_3}

---

For each similar exception above, provide a brief explanation of WHY it is similar to the source exception. 
Format your response EXACTLY as follows:

[EXCEPTION 1]
[Your explanation here]

[EXCEPTION 2]
[Your explanation here]

[EXCEPTION 3]
[Your explanation here]

Do not include any other text or formatting."""
```

**Parsing the response:**
```python
def _parse_batch_explanations(response_text, expected_count):
    """
    Parse format:
    [EXCEPTION 1]
    Explanation text here...
    
    [EXCEPTION 2]
    Explanation text here...
    """
    import re
    
    explanations = []
    parts = re.split(r'\[EXCEPTION \d+\]', response_text)
    
    for part in parts[1:]:  # Skip part before first marker
        explanation = part.strip()
        if explanation:
            explanations.append(explanation)
    
    return explanations[:expected_count]
```

---

## 7. Dependencies & Libraries

### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.115.0 | Web framework (built on Starlette) |
| `uvicorn[standard]` | 0.32.0 | ASGI server (runs FastAPI) |
| `pydantic` | 2.9.2 | Data validation & serialization |
| `pydantic-settings` | 2.6.0 | Settings/config management |
| `python-multipart` | 0.0.12 | Multipart form data parsing |

### Vector Database

| Package | Version | Purpose |
|---------|---------|---------|
| `pymilvus` | 2.3.8 | Python client for Milvus |

**What it does:**
- Connects to Milvus server (runs separately in Docker)
- Manages collections (like database tables)
- Inserts/searches vectors
- Creates indexes for fast retrieval

### Cloud Providers

| Package | Version | Purpose |
|---------|---------|---------|
| `boto3` | >=1.34.0 | AWS SDK (Bedrock, S3, etc.) |
| `botocore` | >=1.34.0 | AWS service definitions |
| `google-generativeai` | >=0.3.0 | Google Gemini API |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `httpx` | >=0.28.1 | Async HTTP client (call other services) |
| `marshmallow` | >=3.13.0 | Data serialization (alternative to Pydantic) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Client Request → FastAPI (Python)                              │
└──────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
    ┌─────────┐        ┌──────────────┐   ┌──────────────┐
    │ Milvus  │        │ AWS Bedrock  │   │ Google AI    │
    │ (Vector │        │ (Embeddings  │   │ Gemini       │
    │  DB)    │        │  + Chat)     │   │ (Chat)       │
    └────┬────┘        └──────┬───────┘   └──────┬───────┘
         │                    │                   │
         │                    │                   │
         ├────────────────────┴───────────────────┤
         │                                        │
         ↑                                        ↑
    ┌──────────────────────────────────────────────────────┐
    │ FastAPI App                                          │
    │ - Services layer (Bedrock, Gemini, Milvus adapters) │
    │ - Narrative formatter (exception→narrative)          │
    │ - Route handlers (API endpoints)                     │
    └──────────────────────────────────────────────────────┘
         │
         │ (Also calls)
         │
         ├─→ exception-service (fetch exceptions)
         ├─→ trade-flow-service (fetch trades + history)
         └─→ solution-service (fetch solutions)
```

---

## 8. Configuration

### Environment Variables

**File:** `app/config/settings.py`

```python
# Service Identity
SERVICE_NAME: str = "rag-service"
VERSION: str = "0.1.0"

# Server
HOST: str = "0.0.0.0"
PORT: int = 8000

# Logging
LOG_LEVEL: str = "INFO"

# CORS (Cross-Origin Resource Sharing)
ENABLE_CORS: bool = True
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",  # React dev server
    "http://localhost:4173",  # React build preview
    "http://localhost:3000",  # Alternative port
]

# AWS Bedrock (for embeddings + chat)
AWS_REGION: str = "ap-southeast-1"
AWS_ACCESS_KEY_ID: Optional[str] = None      # Set in .env or AWS profile
AWS_SECRET_ACCESS_KEY: Optional[str] = None  # Set in .env or AWS profile
BEDROCK_EMBED_MODEL_ID: str = "cohere.embed-english-v3"
BEDROCK_CHAT_MODEL_ID: str = "us.amazon.nova-lite-v1:0"

# Google AI (for chat)
GOOGLE_API_KEY: Optional[str] = None
GOOGLE_MODEL_ID: str = "gemini-2.5-flash-lite"

# LLM Provider Selection
LLM_PROVIDER: str = "google"  # or "bedrock"

# Milvus Vector Database
MILVUS_HOST: str = "localhost"
MILVUS_PORT: int = 19530
MILVUS_USER: str = ""  # Empty for dev, set for production
MILVUS_PASSWORD: str = ""  # Empty for dev, set for production
MILVUS_COLLECTION: str = "documents"
MILVUS_SSL: bool = False  # Enable for production
VECTOR_DIM: int = 1024  # Cohere embedding dimension

# Service URLs (for inter-service communication)
EXCEPTION_SERVICE_URL: str = "http://exception-service:3001"
TRADE_FLOW_SERVICE_URL: str = "http://trade-flow-service:3007"
SOLUTION_SERVICE_URL: str = "http://solution-service:3006"
```

### .env File Example

```bash
# AWS Credentials
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Google API
GOOGLE_API_KEY=AIzaSyDNBo8oD9Ue1PXWpqNJ0g_q_abcd1234567

# Milvus
MILVUS_HOST=milvus
MILVUS_PORT=19530

# LLM Provider
LLM_PROVIDER=google

# Service URLs (Docker Compose)
EXCEPTION_SERVICE_URL=http://exception-service:3001
TRADE_FLOW_SERVICE_URL=http://trade-flow-service:3007
SOLUTION_SERVICE_URL=http://solution-service:3006
```

### Application Initialization

**File:** `main.py`

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    # ========== STARTUP ==========
    vector_store = MilvusVectorStore()
    vector_store.connect()          # Connect to Milvus server
    vector_store.initialize()       # Create collection if needed
    app.state.vector_store = vector_store
    
    yield  # App runs here
    
    # ========== SHUTDOWN ==========
    app.state.vector_store.close()  # Clean up connection
```

---

## 9. API Endpoints

### Health Endpoints

**GET /health**
```
Response: {"status": "healthy"}
```

**GET /**
```
Response: {"message": "RAG Service is running"}
```

---

### Document Management Endpoints

#### POST /api/rag/documents/ingest
**Ingest raw documents**

```
Request:
{
  "documents": [
    {
      "text": "Long text document...",
      "metadata": {"source": "pdf", "date": "2024-01-15"}
    }
  ]
}

Response:
{
  "document_ids": [1, 2, 3],
  "count": 3,
  "message": "Successfully ingested 3 document(s)"
}
```

**Process:**
1. Generate embeddings using Bedrock
2. Store (text + embedding + metadata) in Milvus
3. Return document IDs

---

#### POST /api/rag/documents/ingest-exception
**Ingest exception with full context**

```
Request:
{
  "trade_id": "T-789",
  "exception_id": "EXC-123"
}

Response:
{
  "document_ids": [42],
  "count": 1,
  "message": "Successfully ingested 1 document(s)"
}
```

**Process:**
1. Auto-check if already exists
2. Fetch exception + trade + transaction history
3. Format as narrative using NarrativeFormatter
4. Generate embedding
5. Store in Milvus

---

#### GET /api/rag/documents/similar-exceptions/{exception_id}

**Find similar exceptions with optional LLM explanations**

```
Request:
GET /api/rag/documents/similar-exceptions/EXC-123?limit=3&explain=true

Response:
{
  "source_exception_id": "EXC-123",
  "source_text": "Exception Type: Credit Capacity Constraint...",
  "similar_exceptions": [
    {
      "exception_id": "EXC-456",
      "trade_id": "T-789",
      "similarity_score": 92.3,
      "priority": "HIGH",
      "status": "OPEN",
      "asset_type": "FX Forward",
      "clearing_house": "LCH",
      "exception_msg": "Credit limit exceeded",
      "text": "Full narrative...",
      "explanation": "Both exceptions involve credit capacity constraints on FX contracts..."
    },
    ...
  ],
  "count": 3
}
```

**Process:**
1. Auto-ingest exception if not in Milvus
2. Vector search for similar exceptions (cosine similarity)
3. Generate LLM explanations for each (batch call)
4. Return with similarity scores

---

### Chat Endpoint

#### POST /api/rag/chat/completion

**Raw chat completion with custom messages**

```
Request:
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful trading assistant."
    },
    {
      "role": "user",
      "content": "What causes credit rejects?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 512
}

Response:
{
  "completion": "Credit rejects typically occur when...",
  "model": "gemini-2.5-flash-lite"
}
```

**Routing logic:**
- If `LLM_PROVIDER == "google"` → Use Gemini
- If `LLM_PROVIDER == "bedrock"` → Use AWS Bedrock Nova

---

### Generation Endpoint (Core RAG)

#### GET /api/rag/generate/{exception_id}

**Generate solution using RAG pipeline**

```
Request:
GET /api/rag/generate/EXC-123?limit=3

Response:
{
  "exception_id": "EXC-123",
  "generated_solution": {
    "exception_id": "EXC-123",
    "root_cause_analysis": "The failure occurred because historical cases show that credit checks fail when the counterparty...",
    "recommended_resolution_steps": "1. Verify current credit limits in Bloomberg Terminal\n2. Contact credit team...",
    "risk_considerations": "If this solution is implemented, ensure that market impact is assessed...",
    "confidence_level": "High",
    "raw_response": "[Full raw LLM response...]"
  },
  "historical_cases": [
    {
      "exception_id": "EXC-456",
      "trade_id": "T-789",
      "similarity_score": 92.3,
      "exception_narrative": "Full narrative text...",
      "solution": {
        "id": 123,
        "exception_id": 456,
        "title": "Increase credit line",
        "solution_description": "Request permanent increase from credit team...",
        "scores": 24
      }
    },
    ...
  ],
  "message": "Successfully generated solution for exception EXC-123 based on 3 historical case(s)"
}
```

**Complete RAG Flow:**
1. **Retrieval:** Find 3 most similar exceptions
2. **Augmentation:** Fetch their solutions & full narratives
3. **Generation:** Create prompt with context + new exception, send to LLM
4. **Return:** Structured solution + context used

---

## 10. Concrete Example: Request-Response Flow

### Scenario
New trade exception: `EXC-9999` (credit limit issue on FX Swap)

### Step-by-Step Flow

#### Step 1: User requests similar exceptions
```bash
curl -X GET "http://localhost:8000/api/rag/documents/similar-exceptions/EXC-9999?limit=2&explain=true"
```

#### Step 2: Backend processes request

**2.1 Check if exception in Milvus:**
```
Query: metadata["exception_id"] == "EXC-9999"
Result: NOT FOUND → Need to auto-ingest
```

**2.2 Auto-ingest exception:**
```
GET exception-service/api/exceptions/EXC-9999
→ Returns: {
    "id": "EXC-9999",
    "trade_id": "T-55555",
    "msg": "Credit limit exceeded",
    "priority": "HIGH",
    "comment": "Account JPMC-NY hit credit ceiling on FX swap with JPY"
  }

GET trade-flow-service/api/trades/T-55555
→ Returns: {
    "id": "T-55555",
    "asset_type": "FX Swap",
    "clearing_house": "LCH",
    "account": "JPMC-NY",
    "booking_system": "SWIFT",
    "affirmation_system": "SWIFT"
  }

GET trade-flow-service/api/trades/T-55555/transactions
→ Returns: [
    {"step": 1, "entity": "Bloomberg", "type": "BOOKING", "status": "SUCCESS"},
    {"step": 2, "entity": "LCH", "type": "RISK_CHECK", "status": "SUCCESS"},
    {"step": 3, "entity": "JPMC-Credit", "type": "CREDIT_CHECK", "status": "REJECTED"}
  ]
```

**2.3 Format as narrative:**

Input to `NarrativeFormatter.format_exception_narrative()`:
```python
{
  "history_data": [step 1, 2, 3 transactions],
  "exception_data": {"msg": "Credit limit exceeded", ...},
  "trade_data": {"asset_type": "FX Swap", ...},
  "trade_id": "T-55555",
  "exception_id": "EXC-9999"
}
```

Output:
```
Exception Type: Credit Capacity Constraint

Primary Issue:
Exception: Credit limit exceeded
Context: Account JPMC-NY hit credit ceiling on FX swap with JPY
Priority: HIGH

Trade Context:
- Asset Type: FX Swap
- Clearing House: LCH
- Account: JPMC-NY
- Booking System: SWIFT
- Affirmation System: SWIFT

Failure Pattern:
- Failed At: credit check
- Responsible Entity: JPMC-Credit
- Stage: Step 3 of 3
- Processing Duration: 45 seconds
- Entities Involved: Bloomberg, LCH, JPMC-Credit

Transaction Sequence:
  → Bloomberg: booking [SUCCESS]
  → LCH: risk check [SUCCESS]
  → JPMC-Credit: credit check [FAILED]

Problem Summary:
This FX Swap trade clearing through LCH encountered a Credit Capacity Constraint issue...
```

**2.4 Generate embedding:**
```
Bedrock API: cohere.embed-english-v3
Input: [Full narrative text above]
Output: [1024-dimensional vector]
  Example: [0.123, -0.456, 0.789, ... (1024 values)]
```

**2.5 Store in Milvus:**
```
INSERT INTO documents:
{
  "id": <auto-generated>,
  "text": "[Full narrative]",
  "metadata": {
    "trade_id": "T-55555",
    "exception_id": "EXC-9999",
    "exception_msg": "Credit limit exceeded",
    "asset_type": "FX Swap",
    "clearing_house": "LCH",
    "priority": "HIGH",
    "problem_category": "Credit Capacity Constraint",
    ...
  },
  "vector": [0.123, -0.456, 0.789, ...]
}
```

#### Step 3: Vector similarity search

**3.1 Retrieve embedding for EXC-9999:**
```
Query: metadata["exception_id"] == "EXC-9999"
Result: Get the vector [0.123, -0.456, 0.789, ...]
```

**3.2 Search for similar vectors:**
```
Milvus search:
- Query vector: [0.123, -0.456, 0.789, ...]
- Metric: COSINE similarity
- Limit: 2 (top 2 results)
- Exclude self: true

Results:
[
  {
    "id": 100,
    "score": 0.923,  # 92.3% similar
    "metadata": {
      "exception_id": "EXC-456",
      "text": "[Full narrative for EXC-456]",
      ...
    }
  },
  {
    "id": 101,
    "score": 0.876,  # 87.6% similar
    "metadata": {
      "exception_id": "EXC-123",
      "text": "[Full narrative for EXC-123]",
      ...
    }
  }
]
```

#### Step 4: Generate LLM explanations (batch call)

**4.1 Prepare batch prompt:**
```python
system_prompt = "You are an expert at analyzing trade exception similarities..."

source_text = "[Full narrative of EXC-9999]"

similar_texts = [
  {"exception_id": "EXC-456", "text": "[Narrative of EXC-456]"},
  {"exception_id": "EXC-123", "text": "[Narrative of EXC-123]"}
]

user_prompt = f"""
SOURCE EXCEPTION:
{source_text}

SIMILAR EXCEPTIONS TO ANALYZE:

[EXCEPTION 1] (ID: EXC-456)
{similar_texts[0]['text']}

[EXCEPTION 2] (ID: EXC-123)
{similar_texts[1]['text']}

For each similar exception above, provide a brief explanation of WHY it is similar...
Format:
[EXCEPTION 1]
[Explanation]

[EXCEPTION 2]
[Explanation]
"""
```

**4.2 LLM generates response:**
```
Gemini API call with:
- System: expert analyst prompt
- User: detailed comparison prompt
- Temperature: 0.3 (factual)
- Max tokens: 1500

Response:
"""
[EXCEPTION 1]
Both EXC-9999 and EXC-456 involve credit capacity constraints on FX derivatives cleared through 
LCH. The failures occur at the credit check stage by JPMC's credit team, indicating recurring 
issues with credit limit management on similar asset classes within the same account.

[EXCEPTION 2]
EXC-123 shares the credit capacity constraint pattern with EXC-9999, though occurring on an 
Interest Rate Swap rather than FX Swap. The common thread is insufficient credit line availability 
from the same credit provider (JPMC-Credit), suggesting account-level credit issues rather than 
trade-specific issues.
"""
```

**4.3 Parse and attach explanations:**
```python
explanations = parse_batch_explanations(response)
# Result: [
#   "Both EXC-9999 and EXC-456 involve credit capacity constraints...",
#   "EXC-123 shares the credit capacity constraint pattern..."
# ]
```

#### Step 5: Return response

```json
{
  "source_exception_id": "EXC-9999",
  "source_text": "[Full narrative of EXC-9999]",
  "similar_exceptions": [
    {
      "exception_id": "EXC-456",
      "trade_id": "T-1111",
      "similarity_score": 92.3,
      "priority": "HIGH",
      "status": "RESOLVED",
      "asset_type": "FX Swap",
      "clearing_house": "LCH",
      "exception_msg": "Credit limit exceeded",
      "text": "[Full narrative of EXC-456]",
      "explanation": "Both EXC-9999 and EXC-456 involve credit capacity constraints on FX derivatives cleared through LCH. The failures occur at the credit check stage by JPMC's credit team..."
    },
    {
      "exception_id": "EXC-123",
      "trade_id": "T-2222",
      "similarity_score": 87.6,
      "priority": "MEDIUM",
      "status": "WKCOND",
      "asset_type": "Interest Rate Swap",
      "clearing_house": "LCH",
      "exception_msg": "Credit line unavailable",
      "text": "[Full narrative of EXC-123]",
      "explanation": "EXC-123 shares the credit capacity constraint pattern with EXC-9999, though occurring on an Interest Rate Swap rather than FX Swap. The common thread is insufficient credit line availability from the same credit provider (JPMC-Credit)..."
    }
  ],
  "count": 2
}
```

---

### Alternative: Generate Solution Using RAG

#### Request: Generate solution for EXC-9999

```bash
curl -X GET "http://localhost:8000/api/rag/generate/EXC-9999?limit=3"
```

#### Process:

**1. Retrieval** (find similar exceptions)
```
Same as above - find 3 most similar exceptions
```

**2. Augmentation** (fetch solutions)
```
For each similar exception:
GET solution-service/api/solutions?exception_id=456
→ { "id": 10, "title": "Increase credit line", ... }

GET solution-service/api/solutions?exception_id=123
→ { "id": 11, "title": "Split trade across accounts", ... }
```

**3. Build RAG Prompt**

```python
system_prompt = """You are a senior OTC derivatives trade support analyst.
Your task is to analyze a new trade exception and propose the most appropriate resolution.
You are given:
1) The top 3 most similar historical exceptions with confirmed solutions.
2) A new exception with its transaction history.
...
"""

historical_context = """HISTORICAL EXCEPTIONS WITH CONFIRMED SOLUTIONS:

--- HISTORICAL CASE 1 (Similarity: 92.3%) ---
Exception ID: EXC-456
Trade ID: T-1111

Exception Details:
[Full narrative of EXC-456]

CONFIRMED SOLUTION:
Title: Increase credit line
Exception Description: FX Swap credit limit breach
Solution: Contact JPMC credit team to request permanent increase of $50M for FX derivative trading
Reference Event: Approved by CFO on 2024-01-20
Solution Score: 24/27

--- HISTORICAL CASE 2 (Similarity: 87.6%) ---
...

--- HISTORICAL CASE 3 (Similarity: 85.1%) ---
...

NEW EXCEPTION TO ANALYZE:
--- NEW CASE ---
Exception ID: EXC-9999
Trade ID: T-55555

Exception Details:
[Full narrative of EXC-9999]

Based on the historical cases above, provide your structured analysis below:"""

user_prompt = historical_context
```

**4. LLM generates structured solution**

```
Gemini API call with augmented prompt

Response:
"""
ROOT CAUSE ANALYSIS:
The FX Swap trade for JPMC-NY exceeds the existing credit line with JPMC-Credit. Historical 
cases show this is an account-level credit management issue, not a trade-specific problem. 
Similar historical cases indicate that JPMC credit team typically responds to formal requests 
for line increases within 2-3 business days for established counterparties.

RECOMMENDED RESOLUTION STEPS:
1. Obtain current credit utilization report from JPMC's credit portal
2. Calculate required increase (current utilization + 20% buffer for market movements)
3. Submit formal credit line increase request to JPMC credit team with:
   - Justification: FX hedging for JPY exposure
   - Proposed increase amount: $50M
   - Effective date: immediate or EOD
4. Escalate to CFO if urgent (< 1 hour turnaround needed)
5. Once approved, confirm in Bloomberg and re-attempt trade

RISK CONSIDERATIONS:
- JPMC may reject if account has credit issues or recent defaults
- Larger increases may require board approval (check their policies)
- Market impact if trade not executed today due to spot FX movement

CONFIDENCE LEVEL:
High

The pattern is well-established from historical cases. All 3 similar exceptions were resolved 
by increasing credit lines, and similar asset types show 90%+ resolution rate through this approach.
"""
```

**5. Return response**

```json
{
  "exception_id": "EXC-9999",
  "generated_solution": {
    "exception_id": "EXC-9999",
    "root_cause_analysis": "The FX Swap trade for JPMC-NY exceeds the existing credit line...",
    "recommended_resolution_steps": "1. Obtain current credit utilization report...",
    "risk_considerations": "- JPMC may reject if account has credit issues...",
    "confidence_level": "High",
    "raw_response": "[Full raw response above]"
  },
  "historical_cases": [
    {
      "exception_id": "EXC-456",
      "trade_id": "T-1111",
      "similarity_score": 92.3,
      "exception_narrative": "[Full narrative]",
      "solution": {
        "id": 10,
        "exception_id": 456,
        "title": "Increase credit line",
        "solution_description": "Contact JPMC credit team to request permanent increase of $50M...",
        "scores": 24
      }
    },
    ...
  ],
  "message": "Successfully generated solution for exception EXC-9999 based on 3 historical case(s)"
}
```

---

## Key Takeaways for Understanding RAG

1. **Retrieval = Vector Search**
   - Convert document to embedding (vector)
   - Store in vector database (Milvus)
   - Find similar documents using cosine similarity
   
2. **Augmentation = Context Building**
   - Retrieve relevant documents
   - Format them into a structured prompt
   - Include them **before** the query to the LLM

3. **Generation = LLM Inference**
   - Send augmented prompt (context + query) to LLM
   - LLM generates response grounded in provided context
   - Reduces hallucinations, increases accuracy

4. **Why It Works**
   - LLM has context from similar real cases
   - Can follow patterns established in historical data
   - Provides structured, verifiable sources
   - Can be updated by adding new documents

5. **Implementation Details**
   - **Narrative formatting:** Convert domain-specific data into natural language optimized for semantic search
   - **Metadata enrichment:** Store structured fields for filtering and retrieval
   - **Batch operations:** Generate multiple LLM outputs in single API call for efficiency
   - **Error handling:** Auto-ingest missing exceptions to maintain search quality

---

## Testing the Endpoints (Examples)

### Test 1: Ingest Documents
```bash
curl -X POST "http://localhost:8000/api/rag/documents/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "text": "Credit limit exceeded on FX Swap due to market volatility",
        "metadata": {"type": "exception", "date": "2024-01-15"}
      }
    ]
  }'

# Response:
# {"document_ids": [1], "count": 1, "message": "Successfully ingested 1 document(s)"}
```

### Test 2: Find Similar Exceptions
```bash
curl -X GET "http://localhost:8000/api/rag/documents/similar-exceptions/EXC-123?limit=3&explain=true"

# Returns similar exceptions with LLM-generated explanations
```

### Test 3: Generate Solution
```bash
curl -X GET "http://localhost:8000/api/rag/generate/EXC-123?limit=3"

# Returns:
# - Similar historical cases
# - LLM-generated solution
# - Confidence level
# - Risk considerations
```

### Test 4: Chat Completion
```bash
curl -X POST "http://localhost:8000/api/rag/chat/completion" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "What causes credit rejects?"}
    ],
    "temperature": 0.7,
    "max_tokens": 512
  }'

# Returns: {"completion": "...", "model": "gemini-2.5-flash-lite"}
```

---

**End of RAG Pipeline Explanation**

This comprehensive guide covers the complete implementation of the RAG pipeline in the rag-service, from high-level concept through concrete examples. Each section provides both theoretical understanding and practical implementation details to help you grasp how the system works end-to-end.
