"""
Tests for MilvusVectorStore class.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock

from app.services.vector_store import MilvusVectorStore


class TestMilvusVectorStore:
    """Test cases for MilvusVectorStore."""

    @patch('app.services.vector_store.connections')
    @patch('app.services.vector_store.Collection')
    @patch('app.services.vector_store.utility')
    def test_connect_success(self, mock_utility, mock_collection, mock_connections):
        """Test successful connection to Milvus."""
        store = MilvusVectorStore()
        store.connect()

        mock_connections.connect.assert_called_once_with(
            alias="default",
            host="localhost",
            port=19530,
            user="",
            password="",
            secure=False
        )

    @patch('app.services.vector_store.connections')
    @patch('app.services.vector_store.Collection')
    @patch('app.services.vector_store.utility')
    def test_initialize_new_collection(self, mock_utility, mock_collection, mock_connections):
        """Test initializing a new collection."""
        mock_utility.has_collection.return_value = False
        mock_collection_instance = Mock()
        mock_collection.return_value = mock_collection_instance

        store = MilvusVectorStore()
        store.initialize()

        # Should create collection with proper schema
        mock_collection.assert_called_once()
        args, kwargs = mock_collection.call_args
        # Collection is called with positional args: Collection(name, schema)
        assert args[0] == 'documents'

        # Should create index
        mock_collection_instance.create_index.assert_called_once()

    @patch('app.services.vector_store.connections')
    @patch('app.services.vector_store.Collection')
    @patch('app.services.vector_store.utility')
    def test_initialize_existing_collection(self, mock_utility, mock_collection, mock_connections):
        """Test initializing when collection already exists."""
        mock_utility.has_collection.return_value = True
        mock_collection_instance = Mock()
        mock_collection.return_value = mock_collection_instance

        store = MilvusVectorStore()
        store.initialize()

        # Should load existing collection
        mock_collection_instance.load.assert_called_once()
        # Should not create new collection
        mock_collection.assert_called_once()

    @patch('app.services.vector_store.connections')
    @patch('app.services.vector_store.Collection')
    @patch('app.services.vector_store.utility')
    def test_add_documents(self, mock_utility, mock_collection, mock_connections):
        """Test adding documents to vector store."""
        mock_collection_instance = Mock()
        mock_collection_instance.insert.return_value.primary_keys = [1, 2, 3]
        mock_collection.return_value = mock_collection_instance

        store = MilvusVectorStore()
        store._collection = mock_collection_instance

        texts = ["doc1", "doc2", "doc3"]
        embeddings = [[0.1] * 1024, [0.2] * 1024, [0.3] * 1024]
        metadata = [{"id": 1}, {"id": 2}, {"id": 3}]

        result = store.add_documents(texts, embeddings, metadata)

        assert result == [1, 2, 3]
        mock_collection_instance.insert.assert_called_once()
        mock_collection_instance.flush.assert_called_once()

    @patch('app.services.vector_store.connections')
    @patch('app.services.vector_store.Collection')
    @patch('app.services.vector_store.utility')
    def test_search_documents(self, mock_utility, mock_collection, mock_connections):
        """Test searching documents."""
        mock_collection_instance = Mock()
        mock_hit = Mock()
        mock_hit.id = 1
        mock_hit.entity.get.side_effect = lambda key: {
            "text": "sample text",
            "metadata": {"source": "test"}
        }.get(key)
        mock_hit.score = 0.95

        # Mock results properly to support indexing and iteration
        mock_results = MagicMock()
        mock_results.__getitem__.return_value = [mock_hit]
        mock_collection_instance.search.return_value = mock_results
        mock_collection.return_value = mock_collection_instance

        store = MilvusVectorStore()
        store._collection = mock_collection_instance

        query_embedding = [0.1] * 1024
        results = store.search(query_embedding, limit=5)

        assert len(results) == 1
        assert results[0]["id"] == 1
        assert results[0]["text"] == "sample text"
        assert results[0]["score"] == 0.95

        mock_collection_instance.search.assert_called_once()

    @patch('app.services.vector_store.connections')
    def test_close_connection(self, mock_connections):
        """Test closing Milvus connection."""
        store = MilvusVectorStore()
        store.close()

        mock_connections.disconnect.assert_called_once_with("default")

    @patch('app.services.vector_store.connections')
    @patch('app.services.vector_store.Collection')
    @patch('app.services.vector_store.utility')
    def test_add_documents_no_metadata(self, mock_utility, mock_collection, mock_connections):
        """Test adding documents without metadata."""
        mock_collection_instance = Mock()
        mock_collection_instance.insert.return_value.primary_keys = [1, 2]
        mock_collection.return_value = mock_collection_instance

        store = MilvusVectorStore()
        store._collection = mock_collection_instance

        texts = ["doc1", "doc2"]
        embeddings = [[0.1] * 1024, [0.2] * 1024]

        result = store.add_documents(texts, embeddings)

        assert result == [1, 2]
        # Check that empty metadata dicts were created
        call_args = mock_collection_instance.insert.call_args[0][0]
        assert len(call_args) == 2
        assert call_args[0]["metadata"] == {}
        assert call_args[1]["metadata"] == {}