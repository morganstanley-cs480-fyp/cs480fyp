"""
Test suite for Phase 2 data models.
Tests domain models, request models, and response models.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.domain import Trade, QueryHistory, ExtractedParams
from app.models.request import SearchRequest, ManualSearchFilters, UpdateHistoryRequest
from app.models.response import SearchResponse, ErrorResponse, HealthResponse
from pydantic import ValidationError


def test_trade_model():
    """Test Trade domain model"""
    print("\n" + "="*60)
    print("Testing Trade Model")
    print("="*60)
    
    try:
        # Valid trade
        trade = Trade(
            trade_id="10001234",
            account="ACC12345",
            asset_type="FX",
            booking_system="HIGHGARDEN",
            affirmation_system="TRAI",
            clearing_house="DTCC",
            create_time="2025-01-15 09:30:00",
            update_time="2025-01-15 10:00:00",
            status="CLEARED"
        )
        print(f"✓ Valid trade created: {trade.trade_id}")
        print(f"  Asset: {trade.asset_type}, Status: {trade.status}")
        
        # Test JSON serialization
        trade_json = trade.model_dump_json()
        print(f"✓ JSON serialization works")
        
        # Test JSON deserialization
        trade_from_json = Trade.model_validate_json(trade_json)
        print(f"✓ JSON deserialization works")
        
    except Exception as e:
        print(f"❌ Trade model test failed: {e}")
        raise


def test_query_history_model():
    """Test QueryHistory domain model"""
    print("\n" + "="*60)
    print("Testing QueryHistory Model")
    print("="*60)
    
    try:
        # Valid query history
        query = QueryHistory(
            query_id=42,
            user_id="user123",
            query_text="show me pending FX trades",
            is_saved=True,
            query_name="Weekly FX Review",
            create_time="2025-01-18 10:00:00",
            last_use_time="2025-01-20 09:00:00"
        )
        print(f"✓ Valid query history created: {query.query_id}")
        print(f"  User: {query.user_id}, Saved: {query.is_saved}")
        print(f"  Name: {query.query_name}")
        
    except Exception as e:
        print(f"❌ QueryHistory model test failed: {e}")
        raise


def test_manual_search_filters():
    """Test ManualSearchFilters model"""
    print("\n" + "="*60)
    print("Testing ManualSearchFilters Model")
    print("="*60)
    
    try:
        # Valid filters
        filters = ManualSearchFilters(
            asset_type="FX",
            status=["ALLEGED", "CLEARED"],
            date_type="update_time",
            date_from="2025-01-13",
            date_to="2025-01-20"
        )
        print(f"✓ Valid filters created")
        print(f"  Asset: {filters.asset_type}")
        print(f"  Status: {filters.status}")
        print(f"  Date range: {filters.date_from} to {filters.date_to}")
        
        # Test with invalid status
        try:
            bad_filters = ManualSearchFilters(
                status=["INVALID_STATUS"]
            )
            print("❌ Should have failed with invalid status")
            raise AssertionError("Should have rejected invalid status")
        except ValidationError as e:
            print(f"✓ Correctly rejected invalid status")
        
        # Test with invalid date format
        try:
            bad_filters = ManualSearchFilters(
                date_from="2025/01/13"  # Wrong format
            )
            print("❌ Should have failed with invalid date format")
            raise AssertionError("Should have rejected invalid date format")
        except ValidationError as e:
            print(f"✓ Correctly rejected invalid date format")
        
    except Exception as e:
        print(f"❌ ManualSearchFilters test failed: {e}")
        raise


def test_search_request_natural_language():
    """Test SearchRequest for natural language"""
    print("\n" + "="*60)
    print("Testing SearchRequest (Natural Language)")
    print("="*60)
    
    try:
        # Valid NL search
        request = SearchRequest(
            user_id="user123",
            search_type="natural_language",
            query_text="show me pending FX trades from last week"
        )
        print(f"✓ Valid NL search request created")
        print(f"  User: {request.user_id}")
        print(f"  Query: {request.query_text}")
        
        # Test missing query_text
        try:
            bad_request = SearchRequest(
                user_id="user123",
                search_type="natural_language"
                # Missing query_text
            )
            print("❌ Should have failed without query_text")
            raise AssertionError("Should have rejected NL search without query_text")
        except ValidationError as e:
            print(f"✓ Correctly rejected NL search without query_text")
        
        # Test too short query_text
        try:
            bad_request = SearchRequest(
                user_id="user123",
                search_type="natural_language",
                query_text="fx"  # Too short
            )
            print("❌ Should have failed with too short query_text")
            raise AssertionError("Should have rejected query_text < 3 chars")
        except ValidationError as e:
            print(f"✓ Correctly rejected query_text < 3 chars")
        
    except Exception as e:
        print(f"❌ SearchRequest (NL) test failed: {e}")
        raise


def test_search_request_manual():
    """Test SearchRequest for manual search"""
    print("\n" + "="*60)
    print("Testing SearchRequest (Manual)")
    print("="*60)
    
    try:
        # Valid manual search
        request = SearchRequest(
            user_id="user123",
            search_type="manual",
            filters=ManualSearchFilters(
                asset_type="FX",
                status=["ALLEGED"]
            )
        )
        print(f"✓ Valid manual search request created")
        print(f"  User: {request.user_id}")
        print(f"  Filters: {request.filters.asset_type}, {request.filters.status}")
        
        # Test missing filters
        try:
            bad_request = SearchRequest(
                user_id="user123",
                search_type="manual"
                # Missing filters
            )
            print("❌ Should have failed without filters")
            raise AssertionError("Should have rejected manual search without filters")
        except ValidationError as e:
            print(f"✓ Correctly rejected manual search without filters")
        
    except Exception as e:
        print(f"❌ SearchRequest (Manual) test failed: {e}")
        raise


def test_update_history_request():
    """Test UpdateHistoryRequest model"""
    print("\n" + "="*60)
    print("Testing UpdateHistoryRequest Model")
    print("="*60)
    
    try:
        # Valid save request
        request = UpdateHistoryRequest(
            is_saved=True,
            query_name="My weekly review"
        )
        print(f"✓ Valid save request created")
        print(f"  Saved: {request.is_saved}, Name: {request.query_name}")
        
        # Valid unsave request
        request2 = UpdateHistoryRequest(
            is_saved=False,
            query_name=None
        )
        print(f"✓ Valid unsave request created")
        
        # Test save without name
        try:
            bad_request = UpdateHistoryRequest(
                is_saved=True
                # Missing query_name
            )
            print("❌ Should have failed: save without name")
            raise AssertionError("Should have rejected save without query_name")
        except ValidationError as e:
            print(f"✓ Correctly rejected save without query_name")
        
    except Exception as e:
        print(f"❌ UpdateHistoryRequest test failed: {e}")
        raise


def test_search_response():
    """Test SearchResponse model"""
    print("\n" + "="*60)
    print("Testing SearchResponse Model")
    print("="*60)
    
    try:
        # Create sample trades
        trades = [
            Trade(
                trade_id="10001234",
                account="ACC12345",
                asset_type="FX",
                booking_system="HIGHGARDEN",
                affirmation_system="TRAI",
                clearing_house="DTCC",
                create_time="2025-01-15 09:30:00",
                update_time="2025-01-15 10:00:00",
                status="CLEARED"
            )
        ]
        
        response = SearchResponse(
            query_id=42,
            total_results=1,
            results=trades,
            search_type="natural_language",
            cached=False,
            execution_time_ms=234.5
        )
        print(f"✓ Valid search response created")
        print(f"  Query ID: {response.query_id}")
        print(f"  Total results: {response.total_results}")
        print(f"  Cached: {response.cached}")
        print(f"  Execution time: {response.execution_time_ms}ms")
        
        # Test JSON serialization
        response_json = response.model_dump_json()
        print(f"✓ JSON serialization works ({len(response_json)} bytes)")
        
    except Exception as e:
        print(f"❌ SearchResponse test failed: {e}")
        raise


def test_error_response():
    """Test ErrorResponse model"""
    print("\n" + "="*60)
    print("Testing ErrorResponse Model")
    print("="*60)
    
    try:
        # Test factory method
        error = ErrorResponse.create(
            error="ValidationError",
            message="Invalid request",
            details={"field": "query_text"},
            path="/search"
        )
        print(f"✓ Error response created via factory")
        print(f"  Error: {error.error}")
        print(f"  Message: {error.message}")
        print(f"  Timestamp: {error.timestamp}")
        print(f"  Path: {error.path}")
        
    except Exception as e:
        print(f"❌ ErrorResponse test failed: {e}")
        raise


def run_all_tests():
    """Run all model tests"""
    print("\n" + "="*60)
    print("PHASE 2 - DATA MODELS TEST SUITE")
    print("="*60)
    
    results = []
    
    results.append(("Trade Model", test_trade_model()))
    results.append(("QueryHistory Model", test_query_history_model()))
    results.append(("ManualSearchFilters", test_manual_search_filters()))
    results.append(("SearchRequest (NL)", test_search_request_natural_language()))
    results.append(("SearchRequest (Manual)", test_search_request_manual()))
    results.append(("UpdateHistoryRequest", test_update_history_request()))
    results.append(("SearchResponse", test_search_response()))
    results.append(("ErrorResponse", test_error_response()))
    
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
        print("🎉 ALL MODEL TESTS PASSED! Phase 2 complete.")
    else:
        print("⚠️  SOME TESTS FAILED. Check output above.")
    print("="*60 + "\n")
    
    return all_passed


if __name__ == "__main__":
    import sys
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
