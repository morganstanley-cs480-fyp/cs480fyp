# RAG Service

Retrieval-Augmented Generation (RAG) service with Milvus vector database integration.

## Overview

This service provides vector database operations for storing and retrieving document embeddings. It uses Milvus as the vector database backend for efficient similarity search.

## Features

- **Vector Database Integration**: Milvus standalone for production and local testing
- **Mock Embeddings**: Simple mock embedding generation for testing (replace with real embeddings in production)
- **REST API**: FastAPI endpoints for inserting and searching vectors
- **Docker Support**: Docker Compose configuration for easy local setup

## Architecture

```
rag-service/
├── app/
│   ├── api/routes/       # API endpoints
│   │   ├── health.py     # Health check endpoints
│   │   └── vectors.py    # Vector database operations
│   ├── services/         # Business logic
│   │   ├── vector_db.py  # Milvus client wrapper
│   │   └── embeddings.py # Mock embedding generation
│   └── config/           # Configuration
│       └── settings.py   # Environment settings
├── docker-compose.yml    # Local Milvus + service setup
├── example_usage.py      # Example demonstration script
└── requirements.txt      # Python dependencies
```

## Prerequisites

- Python 3.9+
- Docker and Docker Compose (for local Milvus)

## Quick Start

### 1. Start Milvus Locally

Start Milvus and its dependencies using Docker Compose:

```bash
cd services/rag-service
docker-compose up -d milvus
```

Wait for Milvus to be healthy (about 30-60 seconds):

```bash
docker-compose ps
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Example Script

Test the vector database operations:

```bash
python example_usage.py
```

This script will:
- Connect to Milvus
- Create a collection
- Insert 10 sample documents with embeddings
- Search for similar documents
- Display results

### 4. Start the API Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at:
- API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Health Checks

- `GET /` - Service information
- `GET /health` - Health check
- `GET /health/live` - Liveness probe

### Vector Operations

#### Create Collection

```bash
POST /vectors/collection/create?drop_existing=false
```

Creates the Milvus collection for storing embeddings.

#### Insert Documents

```bash
POST /vectors/insert
Content-Type: application/json

{
  "texts": [
    "Machine learning is great",
    "Vector databases are powerful"
  ],
  "metadata": [
    {"source": "doc1"},
    {"source": "doc2"}
  ]
}
```

#### Search Similar Documents

```bash
POST /vectors/search
Content-Type: application/json

{
  "query_text": "What is machine learning?",
  "top_k": 5
}
```

#### Get Collection Stats

```bash
GET /vectors/collection/stats
```

## Configuration

Configuration is managed through environment variables or a `.env` file:

```env
# Service Configuration
SERVICE_NAME=rag-service
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO

# Milvus Configuration
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_USER=
MILVUS_PASSWORD=
MILVUS_COLLECTION_NAME=rag_documents
MILVUS_DIMENSION=384

# CORS
ENABLE_CORS=true
CORS_ORIGINS=["http://localhost:3000"]
```

## Docker Deployment

### Local Development

```bash
# Start everything (Milvus + RAG service)
docker-compose up -d

# View logs
docker-compose logs -f rag-service

# Stop everything
docker-compose down
```

### Production Setup

For production on EC2:

1. **Launch EC2 Instance**: Choose an instance with sufficient memory (t3.large or larger recommended)

2. **Install Milvus Standalone**: Follow [Milvus installation guide](https://milvus.io/docs/install_standalone-docker.md)

3. **Configure Service**: Update environment variables:
   ```env
   MILVUS_HOST=<ec2-milvus-host>
   MILVUS_PORT=19530
   ```

4. **Deploy Service**: Use Docker or deploy directly with uvicorn

## Mock Embeddings vs Real Embeddings

**Current Implementation** (Mock):
- Uses deterministic random vectors based on text hash
- Good for testing and development
- Fast and requires no external dependencies

**Production Implementation** (Replace with):
- Sentence Transformers: `sentence-transformers` library
- OpenAI Embeddings: `openai` API
- Hugging Face Models: `transformers` library

Example with Sentence Transformers:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)
```

## Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Create collection
curl -X POST http://localhost:8000/vectors/collection/create

# Insert documents
curl -X POST http://localhost:8000/vectors/insert \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Machine learning is great"],
    "metadata": [{"source": "test"}]
  }'

# Search
curl -X POST http://localhost:8000/vectors/search \
  -H "Content-Type: application/json" \
  -d '{
    "query_text": "What is ML?",
    "top_k": 3
  }'
```

### Using the Interactive API Docs

1. Navigate to http://localhost:8000/docs
2. Try out the endpoints directly in the browser
3. View request/response schemas

## Troubleshooting

### Cannot connect to Milvus

- Ensure Milvus is running: `docker-compose ps`
- Check Milvus logs: `docker-compose logs milvus`
- Verify port 19530 is not in use: `netstat -an | grep 19530`

### Collection already exists error

- Drop and recreate: `POST /vectors/collection/create?drop_existing=true`

### Out of memory errors

- Increase Docker memory allocation
- Use a larger EC2 instance for production
- Reduce batch size for inserts

## Next Steps

1. **Add Real Embeddings**: Replace mock embeddings with sentence-transformers or OpenAI
2. **Implement RAG Pipeline**: Add LLM integration for generation
3. **Add Document Chunking**: Split large documents into chunks
4. **Implement Caching**: Add Redis for frequently accessed vectors
5. **Add Authentication**: Secure the API endpoints
6. **Monitoring**: Add metrics and logging

## Resources

- [Milvus Documentation](https://milvus.io/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Sentence Transformers](https://www.sbert.net/)
- [RAG Paper](https://arxiv.org/abs/2005.11401)