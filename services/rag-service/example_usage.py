"""
Example script demonstrating Milvus vector database operations.

This script shows how to:
1. Connect to Milvus
2. Create a collection
3. Insert sample documents with embeddings
4. Search for similar documents

Run this after starting Milvus with docker-compose:
    docker-compose up -d milvus
    python example_usage.py
"""

import sys
import time

from app.services.vector_db import MilvusVectorDB
from app.services.embeddings import generate_mock_embeddings, generate_mock_embedding, SAMPLE_DOCUMENTS
from app.config.settings import settings


def main():
    """Run the example demonstration."""
    print("=" * 60)
    print("Milvus Vector Database Example")
    print("=" * 60)
    print()

    # Initialize vector database
    print(f"1. Connecting to Milvus at {settings.MILVUS_HOST}:{settings.MILVUS_PORT}")
    vector_db = MilvusVectorDB()
    
    try:
        vector_db.connect()
        print("   ✓ Connected successfully!")
    except Exception as e:
        print(f"   ✗ Connection failed: {e}")
        print("\nMake sure Milvus is running:")
        print("   docker-compose up -d milvus")
        sys.exit(1)

    print()

    # Create collection
    print(f"2. Creating collection '{settings.MILVUS_COLLECTION_NAME}'")
    try:
        vector_db.create_collection(drop_existing=True)
        print("   ✓ Collection created successfully!")
    except Exception as e:
        print(f"   ✗ Failed to create collection: {e}")
        vector_db.disconnect()
        sys.exit(1)

    print()

    # Insert sample documents
    print(f"3. Inserting {len(SAMPLE_DOCUMENTS)} sample documents")
    print()
    for i, doc in enumerate(SAMPLE_DOCUMENTS, 1):
        preview = doc[:60] + "..." if len(doc) > 60 else doc
        print(f"   [{i}] {preview}")
    print()

    try:
        # Generate embeddings for sample documents
        embeddings = generate_mock_embeddings(SAMPLE_DOCUMENTS)
        
        # Prepare metadata
        metadata = [
            {"source": "example", "index": i, "category": "documentation"}
            for i in range(len(SAMPLE_DOCUMENTS))
        ]
        
        # Insert into Milvus
        inserted_ids = vector_db.insert_embeddings(
            texts=SAMPLE_DOCUMENTS,
            embeddings=embeddings,
            metadata=metadata,
        )
        print(f"   ✓ Inserted {len(inserted_ids)} documents")
        print(f"   IDs: {inserted_ids[:5]}..." if len(inserted_ids) > 5 else f"   IDs: {inserted_ids}")
    except Exception as e:
        print(f"   ✗ Failed to insert documents: {e}")
        vector_db.disconnect()
        sys.exit(1)

    print()

    # Get collection stats
    print("4. Collection statistics")
    try:
        stats = vector_db.get_collection_stats()
        print(f"   Collection: {stats['name']}")
        print(f"   Documents: {stats['num_entities']}")
        print(f"   Dimension: {stats['dimension']}")
    except Exception as e:
        print(f"   ✗ Failed to get stats: {e}")

    print()

    # Search for similar documents
    queries = [
        "What is machine learning?",
        "Tell me about vector databases",
        "How does Python work?",
    ]

    print("5. Searching for similar documents")
    print()

    for query in queries:
        print(f"   Query: '{query}'")
        try:
            # Generate query embedding
            query_embedding = generate_mock_embedding(query)
            
            # Search for similar documents
            results = vector_db.search_similar(
                query_embedding=query_embedding,
                top_k=3,
            )
            
            print(f"   Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                text_preview = result['text'][:50] + "..." if len(result['text']) > 50 else result['text']
                print(f"      {i}. [{result['id']}] Distance: {result['distance']:.4f}")
                print(f"         {text_preview}")
            print()
        except Exception as e:
            print(f"   ✗ Search failed: {e}")
            print()

    # Cleanup
    print("6. Disconnecting from Milvus")
    vector_db.disconnect()
    print("   ✓ Disconnected successfully!")
    
    print()
    print("=" * 60)
    print("Example completed successfully!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  - Start the API server: uvicorn main:app --reload")
    print("  - Visit the API docs: http://localhost:8000/docs")
    print("  - Try the /vectors/insert and /vectors/search endpoints")
    print()


if __name__ == "__main__":
    main()
