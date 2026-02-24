"""
Unit tests for Trade Ranking Service
Tests the intelligent relevance scoring algorithm and configuration management.
"""

import json
from datetime import datetime, timezone, timedelta

import pytest

from app.services.ranking_service import RankingConfig, TradeRanker
from app.models.domain import Trade


class TestRankingConfig:
    """Test ranking configuration loading and validation."""
    
    def test_load_default_config(self):
        """Test loading default configuration."""
        config = RankingConfig()
        
        assert config.is_enabled()
        assert "weights" in config.config
        assert "status_priority" in config.config
        
        # Check weights sum to ~1.0
        weights = config.config["weights"]
        weight_sum = sum(weights.values())
        assert 0.99 <= weight_sum <= 1.01
    
    def test_load_custom_config(self, tmp_path):
        """Test loading custom configuration from file."""
        custom_config = {
            "ranking_enabled": True,
            "weights": {
                "status_urgency": 0.5,
                "recency": 0.3,
                "transaction_volume": 0.15,
                "asset_type_risk": 0.05
            },
            "status_priority": {
                "REJECTED": 100,
                "ALLEGED": 70,
                "CANCELLED": 40,
                "CLEARED": 10
            },
            "asset_type_priority": {
                "CDS": 100,
                "IRS": 90,
                "FX": 60,
                "EQUITY": 40,
                "BOND": 40,
                "COMMODITY": 40
            },
            "recency_config": {
                "max_age_days": 60,
                "decay_type": "exponential",
                "half_life_days": 7
            },
            "transaction_config": {
                "min_transactions_for_bonus": 3,
                "max_transaction_count": 15
            }
        }
        
        config_file = tmp_path / "ranking_config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(custom_config, f)
        
        config = RankingConfig(config_path=str(config_file))
        
        assert config.is_enabled()
        assert config.get("weights")["status_urgency"] == 0.5
        assert config.get("status_priority")["REJECTED"] == 100
    
    def test_config_validation_warning(self, tmp_path):
        """Test config validation warns on incorrect weight sum."""
        invalid_config = {
            "ranking_enabled": True,
            "weights": {
                "status_urgency": 0.5,
                "recency": 0.3,
                "transaction_volume": 0.2,
                "asset_type_risk": 0.1  # Sum = 1.1
            },
            "status_priority": {"REJECTED": 100},
            "asset_type_priority": {"FX": 50}
        }
        
        config_file = tmp_path / "ranking_config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(invalid_config, f)
        
        config = RankingConfig(config_path=str(config_file))
        # Should load with warning, not fail
        assert config.is_enabled()
    
    def test_disable_ranking_via_config(self, tmp_path):
        """Test disabling ranking through configuration."""
        disabled_config = {
            "ranking_enabled": False,
            "weights": {
                "status_urgency": 0.45,
                "recency": 0.30,
                "transaction_volume": 0.15,
                "asset_type_risk": 0.10
            },
            "status_priority": {"REJECTED": 100},
            "asset_type_priority": {"FX": 50},
            "recency_config": {"max_age_days": 90, "half_life_days": 14},
            "transaction_config": {"min_transactions_for_bonus": 5}
        }
        
        config_file = tmp_path / "ranking_config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(disabled_config, f)
        
        config = RankingConfig(config_path=str(config_file))
        assert not config.is_enabled()


class TestTradeRanker:
    """Test trade ranking algorithm."""
    
    @pytest.fixture
    def ranker(self):
        """Create a ranker with default config."""
        return TradeRanker()
    
    @pytest.fixture
    def sample_trades(self):
        """Create sample trades for testing."""
        now = datetime.now(timezone.utc)
        
        trades = [
            Trade(
                trade_id=1,
                account="ACC001",
                asset_type="FX",
                booking_system="SYSTEM1",
                affirmation_system="AFF1",
                clearing_house="DTCC",
                create_time=(now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                update_time=(now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                status="CLEARED"
            ),
            Trade(
                trade_id=2,
                account="ACC002",
                asset_type="CDS",
                booking_system="SYSTEM2",
                affirmation_system="AFF2",
                clearing_house="LCH",
                create_time=(now - timedelta(days=5)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                update_time=(now - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                status="REJECTED"
            ),
            Trade(
                trade_id=3,
                account="ACC003",
                asset_type="IRS",
                booking_system="SYSTEM3",
                affirmation_system="AFF3",
                clearing_house="CME",
                create_time=(now - timedelta(days=10)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                update_time=(now - timedelta(days=10)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                status="ALLEGED"
            ),
        ]
        
        return trades
    
    def test_rank_trades_basic(self, ranker, sample_trades):
        """Test basic ranking without enriched data."""
        ranked = ranker.rank_trades(sample_trades)
        
        assert len(ranked) == 3
        # REJECTED should rank higher than CLEARED
        assert ranked[0].status in ["REJECTED", "ALLEGED"]
        assert ranked[-1].status == "CLEARED"
    
    def test_rank_trades_with_enriched_data(self, ranker, sample_trades):
        """Test ranking with transaction data."""
        enriched_data = {
            1: {  # CLEARED trade
                "transaction_count": 3
            },
            2: {  # REJECTED trade with many transactions
                "transaction_count": 8
            },
            3: {  # ALLEGED trade
                "transaction_count": 5
            }
        }
        
        ranked = ranker.rank_trades(sample_trades, enriched_data)
        
        assert len(ranked) == 3
        # Trade 2 (REJECTED + many transactions) should rank first
        assert ranked[0].trade_id == 2
        # Trade 1 (CLEARED) should rank last
        assert ranked[-1].trade_id == 1
    
    def test_status_urgency_scoring(self, ranker):
        """Test status urgency scoring."""
        assert ranker._score_status_urgency("REJECTED") > ranker._score_status_urgency("ALLEGED")
        assert ranker._score_status_urgency("ALLEGED") > ranker._score_status_urgency("CANCELLED")
        assert ranker._score_status_urgency("CANCELLED") > ranker._score_status_urgency("CLEARED")
    
    def test_recency_scoring(self, ranker):
        """Test recency scoring with time decay."""
        now = datetime.now(timezone.utc)
        
        # Brand new trade
        score_new = ranker._score_recency(
            update_time=now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            create_time=now.strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        
        # 7 days old
        score_week = ranker._score_recency(
            update_time=(now - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            create_time=(now - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        
        # 30 days old
        score_month = ranker._score_recency(
            update_time=(now - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            create_time=(now - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        
        # 100 days old (beyond max_age_days)
        score_old = ranker._score_recency(
            update_time=(now - timedelta(days=100)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            create_time=(now - timedelta(days=100)).strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        
        assert score_new > score_week > score_month
        assert score_old == 0.0  # Beyond max age
    
    def test_transaction_volume_scoring(self, ranker):
        """Test transaction volume scoring."""
        # No transactions
        score_none = ranker._score_transaction_volume(0)
        assert score_none == 0.0
        
        # Below threshold
        score_low = ranker._score_transaction_volume(3)
        assert score_low == 25.0
        
        # Above threshold
        score_high = ranker._score_transaction_volume(10)
        assert 25.0 < score_high < 100.0
        
        # At max
        score_max = ranker._score_transaction_volume(20)
        assert score_max == 100.0
        
        # Beyond max
        score_beyond = ranker._score_transaction_volume(50)
        assert score_beyond == 100.0
    
    def test_asset_type_risk_scoring(self, ranker):
        """Test asset type risk scoring."""
        # Complex derivatives rank higher
        assert ranker._score_asset_type_risk("CDS") > ranker._score_asset_type_risk("FX")
        assert ranker._score_asset_type_risk("IRS") > ranker._score_asset_type_risk("EQUITY")
        assert ranker._score_asset_type_risk("FX") > ranker._score_asset_type_risk("BOND")
    
    def test_ranking_disabled(self, ranker, sample_trades):
        """Test that ranking returns original order when disabled."""
        # Disable ranking
        ranker.config.config["ranking_enabled"] = False
        
        ranked = ranker.rank_trades(sample_trades)
        
        # Should return in original order
        assert ranked == sample_trades
        
        # Re-enable for other tests
        ranker.config.config["ranking_enabled"] = True
    
    def test_empty_trade_list(self, ranker):
        """Test ranking with empty trade list."""
        ranked = ranker.rank_trades([])
        assert ranked == []
    
    def test_single_trade(self, ranker, sample_trades):
        """Test ranking with single trade."""
        ranked = ranker.rank_trades([sample_trades[0]])
        assert len(ranked) == 1
        assert ranked[0] == sample_trades[0]
    
    def test_ranking_with_missing_enriched_data(self, ranker, sample_trades):
        """Test ranking when enriched data is missing for some trades."""
        # Only provide enriched data for trade 1
        enriched_data = {
            1: {
                "transaction_count": 10
            }
        }
        
        # Should not crash, missing trades get default scores
        ranked = ranker.rank_trades(sample_trades, enriched_data)
        assert len(ranked) == 3
    
    def test_relevance_score_bounds(self, ranker, sample_trades):
        """Test that relevance scores are within expected bounds."""
        enriched_data = {
            1: {"transaction_count": 15},
            2: {"transaction_count": 25},
            3: {"transaction_count": 2}
        }
        
        for trade in sample_trades:
            enriched = enriched_data[trade.trade_id]
            score = ranker._calculate_relevance_score(trade, enriched)
            
            # Scores should be between 0 and 100
            assert 0 <= score <= 100
