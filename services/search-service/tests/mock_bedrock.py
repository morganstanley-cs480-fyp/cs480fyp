"""
Mock Bedrock Service for Testing
Simulates AWS Bedrock API responses without making actual API calls.
Useful for local development and testing.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.utils.logger import logger


class MockBedrockService:
    """
    Mock implementation of Bedrock service for testing.
    Returns pre-defined responses based on query patterns.
    """
    
    def __init__(self):
        self.call_count = 0
        self.mock_enabled = True
    
    async def extract_parameters(self, query_text: str) -> Dict[str, Any]:
        """
        Mock parameter extraction from natural language query.
        
        Args:
            query_text: Natural language query
        
        Returns:
            Dictionary of extracted parameters
        """
        self.call_count += 1
        logger.info(f"[MOCK] Bedrock called ({self.call_count} times): {query_text}")
        
        # Normalize query
        query_lower = query_text.lower()
        
        # Calculate date ranges
        today = datetime.now()
        
        # Initialize default parameters
        params = {
            "trade_id": None,
            "account": None,
            "asset_type": None,
            "booking_system": None,
            "affirmation_system": None,
            "clearing_house": None,
            "status": [],
            "date_type": "update_time",
            "date_from": None,
            "date_to": None,
            "with_exceptions_only": False,
            "cleared_trades_only": False
        }
        
        # Extract asset type
        if "fx" in query_lower or "foreign exchange" in query_lower:
            params["asset_type"] = "FX"
        elif "equity" in query_lower or "equities" in query_lower or "stock" in query_lower:
            params["asset_type"] = "EQUITY"
        elif "bond" in query_lower or "bonds" in query_lower:
            params["asset_type"] = "BOND"
        elif "commodity" in query_lower or "commodities" in query_lower:
            params["asset_type"] = "COMMODITY"
        elif "cds" in query_lower or "credit default swap" in query_lower:
            params["asset_type"] = "CDS"
        
        # Extract status
        if "pending" in query_lower or "alleged" in query_lower:
            params["status"].append("PENDING")
            params["status"].append("ALLEGED")
        if "cleared" in query_lower:
            params["status"].append("CLEARED")
            if "only cleared" in query_lower:
                params["cleared_trades_only"] = True
        if "rejected" in query_lower:
            params["status"].append("REJECTED")
        if "cancelled" in query_lower:
            params["status"].append("CANCELLED")
        
        # Extract date range
        if "today" in query_lower:
            params["date_from"] = today.strftime("%Y-%m-%d")
            params["date_to"] = today.strftime("%Y-%m-%d")
        
        elif "yesterday" in query_lower:
            yesterday = today - timedelta(days=1)
            params["date_from"] = yesterday.strftime("%Y-%m-%d")
            params["date_to"] = yesterday.strftime("%Y-%m-%d")
        
        elif "last week" in query_lower or "past week" in query_lower:
            params["date_from"] = (today - timedelta(days=7)).strftime("%Y-%m-%d")
            params["date_to"] = today.strftime("%Y-%m-%d")
        
        elif "last 3 days" in query_lower or "past 3 days" in query_lower:
            params["date_from"] = (today - timedelta(days=3)).strftime("%Y-%m-%d")
            params["date_to"] = today.strftime("%Y-%m-%d")
        
        elif "last month" in query_lower or "past month" in query_lower:
            params["date_from"] = (today - timedelta(days=30)).strftime("%Y-%m-%d")
            params["date_to"] = today.strftime("%Y-%m-%d")
        
        elif "this month" in query_lower:
            params["date_from"] = today.replace(day=1).strftime("%Y-%m-%d")
            params["date_to"] = today.strftime("%Y-%m-%d")
        
        # Extract account
        if "acc" in query_lower:
            # Try to extract account number
            words = query_text.split()
            for word in words:
                if word.upper().startswith("ACC"):
                    params["account"] = word.upper()
                    break
        
        # Extract trade ID
        if "trade" in query_lower and any(char.isdigit() for char in query_text):
            # Try to extract trade ID
            words = query_text.split()
            for word in words:
                if word.isdigit() and len(word) == 8:
                    params["trade_id"] = word
                    break
        
        # Extract systems
        if "dtcc" in query_lower:
            params["clearing_house"] = "DTCC"
        elif "lch" in query_lower:
            params["clearing_house"] = "LCH"
        elif "cme" in query_lower:
            params["clearing_house"] = "CME"
        
        # Extract date type preference
        if "created" in query_lower or "creation date" in query_lower:
            params["date_type"] = "create_time"
        elif "updated" in query_lower or "update date" in query_lower:
            params["date_type"] = "update_time"
        
        # Extract exceptions
        if "exception" in query_lower or "error" in query_lower or "issue" in query_lower:
            params["with_exceptions_only"] = True
        
        logger.info(f"[MOCK] Extracted parameters: {json.dumps(params, indent=2)}")
        
        return params
    
    def get_call_count(self) -> int:
        """Get number of times mock was called"""
        return self.call_count
    
    def reset_call_count(self) -> None:
        """Reset call counter"""
        self.call_count = 0


# Pre-defined test queries and expected extractions
MOCK_TEST_CASES = [
    {
        "query": "show me pending FX trades from last week",
        "expected": {
            "asset_type": "FX",
            "status": ["PENDING", "ALLEGED"],
            "date_from": "(7 days ago)",
            "date_to": "(today)"
        }
    },
    {
        "query": "cleared equity trades today",
        "expected": {
            "asset_type": "EQUITY",
            "status": ["CLEARED"],
            "cleared_trades_only": True,
            "date_from": "(today)",
            "date_to": "(today)"
        }
    },
    {
        "query": "all trades from ACC12345",
        "expected": {
            "account": "ACC12345"
        }
    },
    {
        "query": "rejected trades this month",
        "expected": {
            "status": ["REJECTED"],
            "date_from": "(first of month)",
            "date_to": "(today)"
        }
    },
    {
        "query": "trades with exceptions from DTCC",
        "expected": {
            "clearing_house": "DTCC",
            "with_exceptions_only": True
        }
    },
    {
        "query": "bond trades cleared in the last 3 days",
        "expected": {
            "asset_type": "BOND",
            "status": ["CLEARED"],
            "date_from": "(3 days ago)",
            "date_to": "(today)"
        }
    }
]


async def test_mock_bedrock():
    """Test the mock Bedrock service with various queries"""
    print("\n" + "="*60)
    print("TESTING MOCK BEDROCK SERVICE")
    print("="*60 + "\n")
    
    mock = MockBedrockService()
    
    for i, test_case in enumerate(MOCK_TEST_CASES, 1):
        print(f"\nTest {i}: {test_case['query']}")
        print("-" * 60)
        
        result = await mock.extract_parameters(test_case['query'])
        
        print("Extracted:")
        for key, value in result.items():
            if value and value != [] and value != False:
                print(f"  {key}: {value}")
        
        print(f"\nExpected:")
        for key, value in test_case['expected'].items():
            print(f"  {key}: {value}")
    
    print("\n" + "="*60)
    print(f"Total mock calls: {mock.get_call_count()}")
    print("="*60 + "\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_mock_bedrock())
