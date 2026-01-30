"""
Test script to verify Phase 1 infrastructure setup.
Run this to test database, Redis, and configuration.
"""

import asyncio
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config.settings import settings
from app.database.connection import db_manager
from app.cache.redis_client import redis_manager
from app.utils.logger import logger


async def test_configuration():
    """Test configuration loading"""
    print("\n" + "="*60)
    print("Testing Configuration")
    print("="*60)
    
    try:
        print(f"✓ Service Name: {settings.SERVICE_NAME}")
        print(f"✓ Version: {settings.VERSION}")
        print(f"✓ Database Host: {settings.RDS_HOST}")
        print(f"✓ Redis Host: {settings.REDIS_HOST}")
        print(f"✓ Log Level: {settings.LOG_LEVEL}")
        print(f"✓ Bedrock Region: {settings.BEDROCK_REGION}")
        print(f"✓ Bedrock Model: {settings.BEDROCK_MODEL_ID}")
        print("\n✅ Configuration loaded successfully!")
        return True
    except Exception as e:
        print(f"\n❌ Configuration test failed: {e}")
        return False


async def test_database_connection():
    """Test PostgreSQL connection"""
    print("\n" + "="*60)
    print("Testing Database Connection")
    print("="*60)
    
    try:
        # Connect to database
        await db_manager.connect()
        print("✓ Database pool initialized")
        
        # Test simple query
        result = await db_manager.fetchval("SELECT 1 as test")
        assert result == 1
        print("✓ Simple query executed successfully")
        
        # Check if tables exist
        tables_query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """
        tables = await db_manager.fetch(tables_query)
        table_names = [record['table_name'] for record in tables]
        print(f"✓ Found tables: {', '.join(table_names)}")
        
        # Check query_history table
        if 'query_history' in table_names:
            count = await db_manager.fetchval("SELECT COUNT(*) FROM query_history")
            print(f"✓ query_history table has {count} records")
        else:
            print("⚠ query_history table not found (run init scripts)")
        
        # Check trades table
        if 'trades' in table_names:
            count = await db_manager.fetchval("SELECT COUNT(*) FROM trades")
            print(f"✓ trades table has {count} records")
        else:
            print("⚠ trades table not found (run init scripts)")
        
        # Test health check
        is_healthy = await db_manager.health_check()
        print(f"✓ Health check: {'PASSED' if is_healthy else 'FAILED'}")
        
        print("\n✅ Database connection test passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Database test failed: {e}")
        return False


async def test_redis_connection():
    """Test Redis connection"""
    print("\n" + "="*60)
    print("Testing Redis Connection")
    print("="*60)
    
    try:
        # Connect to Redis
        await redis_manager.connect()
        print("✓ Redis connection established")
        
        # Test set/get
        test_key = "test:connection"
        test_value = {"message": "Hello from search-service!"}
        
        await redis_manager.set(test_key, test_value, ttl=60)
        print(f"✓ Set test value with key: {test_key}")
        
        retrieved = await redis_manager.get(test_key)
        assert retrieved == test_value
        print(f"✓ Retrieved value matches: {retrieved}")
        
        # Test exists
        exists = await redis_manager.exists(test_key)
        assert exists is True
        print(f"✓ Key exists check: {exists}")
        
        # Test delete
        deleted = await redis_manager.delete(test_key)
        print(f"✓ Deleted test key: {deleted}")
        
        # Test health check
        is_healthy = await redis_manager.health_check()
        print(f"✓ Health check: {'PASSED' if is_healthy else 'FAILED'}")
        
        print("\n✅ Redis connection test passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Redis test failed: {e}")
        return False


async def test_cache_keys():
    """Test cache key builders"""
    print("\n" + "="*60)
    print("Testing Cache Key Builders")
    print("="*60)
    
    try:
        from app.cache.redis_client import CacheKeys
        
        query_text = "show me pending FX trades"
        user_id = "user123"
        
        ai_key = CacheKeys.ai_extraction(query_text)
        print(f"✓ AI extraction key: {ai_key}")
        
        search_key = CacheKeys.search_results(user_id, "abc123")
        print(f"✓ Search results key: {search_key}")
        
        history_key = CacheKeys.query_history(user_id)
        print(f"✓ Query history key: {history_key}")
        
        common_key = CacheKeys.common_queries()
        print(f"✓ Common queries key: {common_key}")
        
        print("\n✅ Cache key builders test passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Cache keys test failed: {e}")
        return False


async def test_logging():
    """Test logging functionality"""
    print("\n" + "="*60)
    print("Testing Logging")
    print("="*60)
    
    try:
        from app.utils.logger import log_with_context
        
        logger.info("Test info message")
        logger.warning("Test warning message")
        logger.error("Test error message")
        
        # Test with context
        logger.info(
            "Test message with context",
            extra=log_with_context(
                user_id="user123",
                query_id=42,
                duration_ms=234
            )
        )
        
        print("✓ Logging messages sent (check console output above)")
        print("\n✅ Logging test passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Logging test failed: {e}")
        return False


async def cleanup():
    """Clean up connections"""
    print("\n" + "="*60)
    print("Cleaning Up")
    print("="*60)
    
    try:
        await db_manager.disconnect()
        print("✓ Database connection closed")
        
        await redis_manager.disconnect()
        print("✓ Redis connection closed")
        
        print("\n✅ Cleanup completed!")
        
    except Exception as e:
        print(f"\n⚠ Cleanup warning: {e}")


async def run_all_tests():
    """Run all infrastructure tests"""
    print("\n" + "="*60)
    print("SEARCH SERVICE - PHASE 1 INFRASTRUCTURE TESTS")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("Configuration", await test_configuration()))
    results.append(("Database", await test_database_connection()))
    results.append(("Redis", await test_redis_connection()))
    results.append(("Cache Keys", await test_cache_keys()))
    results.append(("Logging", await test_logging()))
    
    # Cleanup
    await cleanup()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 ALL TESTS PASSED! Infrastructure is ready.")
    else:
        print("⚠️  SOME TESTS FAILED. Check output above.")
    print("="*60 + "\n")
    
    return all_passed


if __name__ == "__main__":
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
