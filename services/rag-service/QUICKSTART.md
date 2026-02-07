# Quick Start Guide: Milvus Vector Database Setup

This guide walks you through setting up and using the Milvus vector database for the RAG service.

## Prerequisites

- Docker and Docker Compose installed
- Python 3.9+ installed
- Terminal/command line access

## Step 1: Start Milvus

Start the Milvus vector database locally:

```bash
cd services/rag-service
docker compose up -d milvus
```

Wait about 30-60 seconds for Milvus to become healthy. Check status:

```bash
docker compose ps
```

All services should show `(healthy)` status.

## Step 2: Install Python Dependencies

```bash
pip install -r requirements.txt
```

## Step 3: Run the Example Script

Test the vector database operations:

```bash
python example_usage.py
```

This will:
- Connect to Milvus
- Create a collection
- Insert 10 sample documents
- Perform similarity searches
- Display results

Expected output:
```
============================================================
Milvus Vector Database Example
============================================================

1. Connecting to Milvus at localhost:19530
   ✓ Connected successfully!

2. Creating collection 'rag_documents'
   ✓ Collection created successfully!

3. Inserting 10 sample documents
   ...
   ✓ Inserted 10 documents

4. Collection statistics
   Collection: rag_documents
   Documents: 10
   Dimension: 384

5. Searching for similar documents
   Query: 'What is machine learning?'
   Found 3 results:
      1. [ID] Distance: 1.7424
         Vector databases are optimized...
   ...

6. Disconnecting from Milvus
   ✓ Disconnected successfully!
```

## Step 4: Start the API Server

```bash
uvicorn main:app --reload --port 8000
```

Access the interactive API documentation at: http://localhost:8000/docs

## Step 5: Test API Endpoints

### Create Collection
```bash
curl -X POST http://localhost:8000/vectors/collection/create?drop_existing=true
```

### Insert Documents
```bash
curl -X POST http://localhost:8000/vectors/insert \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Artificial intelligence is transforming the world",
      "Cloud computing enables scalable applications"
    ],
    "metadata": [
      {"category": "AI", "source": "demo"},
      {"category": "Cloud", "source": "demo"}
    ]
  }'
```

Response:
```json
{
  "inserted_ids": [464115520749961597, 464115520749961598],
  "count": 2
}
```

### Search for Similar Documents
```bash
curl -X POST http://localhost:8000/vectors/search \
  -H "Content-Type: application/json" \
  -d '{
    "query_text": "What is AI?",
    "top_k": 3
  }'
```

Response:
```json
{
  "query": "What is AI?",
  "results": [
    {
      "id": 464115520749961597,
      "text": "Artificial intelligence is transforming the world",
      "distance": 1.8963,
      "metadata": {"category": "AI", "source": "demo"}
    }
  ],
  "count": 1
}
```

### Get Collection Statistics
```bash
curl http://localhost:8000/vectors/collection/stats
```

Response:
```json
{
  "exists": true,
  "name": "rag_documents",
  "num_entities": 2,
  "dimension": 384
}
```

## Step 6: Production Setup (EC2)

For production deployment on EC2:

1. **Launch EC2 Instance**
   - Recommended: t3.large or larger
   - Open ports: 19530 (Milvus), 8000 (API)

2. **Install Docker**
   ```bash
   sudo yum install -y docker
   sudo service docker start
   sudo usermod -a -G docker ec2-user
   ```

3. **Install Docker Compose**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

4. **Deploy Milvus**
   ```bash
   cd services/rag-service
   docker compose up -d milvus
   ```

5. **Configure Service**
   Create `.env` file:
   ```env
   MILVUS_HOST=localhost
   MILVUS_PORT=19530
   LOG_LEVEL=INFO
   ```

6. **Run the Service**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

   Or with Docker:
   ```bash
   docker compose up -d
   ```

## Troubleshooting

### Milvus won't start
- Check Docker is running: `docker ps`
- Check logs: `docker compose logs milvus`
- Ensure ports 19530, 9091, 9000, 9001, 2379 are available

### Connection refused
- Verify Milvus is healthy: `docker compose ps`
- Wait 60 seconds after starting Milvus
- Check firewall settings

### Import errors
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`
- Check Python version: `python --version` (should be 3.9+)

### Out of memory
- Increase Docker memory limit (Docker Desktop settings)
- Use larger EC2 instance type
- Reduce batch size for insertions

## Next Steps

1. **Replace Mock Embeddings**: Integrate real embedding models
   - sentence-transformers: `sentence-transformers` library
   - OpenAI: `openai` API
   - Hugging Face: `transformers` library

2. **Add Document Processing**: Implement chunking for large documents

3. **Implement RAG Pipeline**: Add LLM integration for generation

4. **Add Authentication**: Secure API endpoints

5. **Monitoring**: Set up logging and metrics

## Resources

- [Milvus Documentation](https://milvus.io/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PyMilvus Python SDK](https://github.com/milvus-io/pymilvus)
- [RAG Overview](https://arxiv.org/abs/2005.11401)
