"""
Trade Ranking Service - Intelligent Relevance Scoring
Ranks trade search results by business relevance using configurable weights.

IMPORTANT: Works with existing Trade model - no schema changes required.
Uses in-memory scoring with data from enriched query results.
"""

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Tuple
from app.models.domain import Trade
from app.utils.logger import logger


class RankingConfig:
    """
    Loads and validates ranking configuration from JSON file.
    Supports hot-reload for runtime configuration updates.
    """

    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = (
                Path(__file__).parent.parent / "config" / "ranking_config.json"
            )

        self.config_path = Path(config_path)
        self.config: Dict[str, Any] = {}
        self._last_modified: float = 0
        self.load()

    def load(self) -> None:
        """Load configuration from JSON file with validation."""
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                self.config = json.load(f)

            self._last_modified = self.config_path.stat().st_mtime
            self._validate()

            logger.info(
                "Ranking configuration loaded successfully",
                extra={
                    "config_path": str(self.config_path),
                    "ranking_enabled": self.config.get("ranking_enabled", True),
                },
            )
        except FileNotFoundError:
            logger.error(f"Ranking config file not found: {self.config_path}")
            self._load_defaults()
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in ranking config: {e}")
            self._load_defaults()
        except Exception as e:
            logger.error(f"Error loading ranking config: {e}")
            self._load_defaults()

    def reload_if_modified(self) -> bool:
        """Check if config file changed and reload if needed."""
        try:
            current_mtime = self.config_path.stat().st_mtime
            if current_mtime > self._last_modified:
                logger.info("Ranking config file modified, reloading...")
                self.load()
                return True
        except Exception as e:
            logger.warning(f"Error checking config modification: {e}")
        return False

    def _validate(self) -> None:
        """Validate configuration values."""
        # Validate weights sum to ~1.0
        weights = self.config.get("weights", {})
        weight_sum = sum(weights.values())
        if not 0.99 <= weight_sum <= 1.01:
            logger.warning(
                f"Ranking weights sum to {weight_sum:.2f}, should be 1.0. Using as-is."
            )

        # Validate required sections exist
        required_sections = ["weights", "status_priority", "asset_type_priority"]
        for section in required_sections:
            if section not in self.config:
                raise ValueError(f"Missing required config section: {section}")

    def _load_defaults(self) -> None:
        """Load safe default configuration."""
        logger.warning("Loading default ranking configuration")
        self.config = {
            "ranking_enabled": True,
            "weights": {
                "status_urgency": 0.45,
                "recency": 0.30,
                "transaction_volume": 0.15,
                "asset_type_risk": 0.10,
            },
            "status_priority": {
                "REJECTED": 100,
                "ALLEGED": 75,
                "CANCELLED": 50,
                "CLEARED": 25,
            },
            "asset_type_priority": {
                "CDS": 100,
                "IRS": 95,
                "FX": 70,
                "EQUITY": 50,
                "BOND": 50,
                "COMMODITY": 50,
            },
            "recency_config": {
                "max_age_days": 90,
                "decay_type": "exponential",
                "half_life_days": 14,
            },
            "transaction_config": {
                "min_transactions_for_bonus": 5,
                "max_transaction_count": 20,
            },
        }

    def get(self, key: str, default: Any = None) -> Any:
        """Get config value by key."""
        return self.config.get(key, default)

    def is_enabled(self) -> bool:
        """Check if ranking is enabled."""
        return self.config.get("ranking_enabled", True)


class TradeRanker:
    """
    Ranks trades by business relevance using multi-factor scoring.

    Scoring Factors:
    1. Status Urgency - REJECTED/ALLEGED trades rank higher
    2. Recency - Newer trades rank higher (time decay)
    3. Transaction Volume - More complex trades may need attention
    4. Asset Type Risk - Complex derivatives (CDS/IRS) rank higher

    Note: Exception management is handled via dedicated Exceptions page.
    All scoring works with existing Trade model fields plus enriched
    transaction data from the query results.
    """

    def __init__(self, config: RankingConfig = None):
        self.config = config or RankingConfig()

    def rank_trades(
        self, trades: List[Trade], enriched_data: Dict[int, Dict[str, Any]] = None
    ) -> List[Trade]:
        """
        Rank trades by relevance score and return sorted list.

        Args:
            trades: List of Trade objects from search results
            enriched_data: Optional dict mapping trade_id to {
                'transaction_count': int
            }

        Returns:
            Sorted list of trades (highest relevance first)
        """
        # Check if ranking is enabled
        if not self.config.is_enabled():
            logger.debug("Ranking disabled, returning trades unsorted")
            return trades

        # Reload config if modified (hot-reload)
        self.config.reload_if_modified()

        if not trades:
            return trades

        # Calculate relevance scores
        scored_trades: List[Tuple[float, Trade]] = []

        for trade in trades:
            enriched = enriched_data.get(trade.trade_id, {}) if enriched_data else {}
            score = self._calculate_relevance_score(trade, enriched)
            scored_trades.append((score, trade))

        # Sort by score descending (highest relevance first)
        scored_trades.sort(key=lambda x: x[0], reverse=True)

        ranked_trades = [trade for score, trade in scored_trades]

        logger.info(
            "Trades ranked by relevance",
            extra={
                "total_trades": len(trades),
                "top_score": scored_trades[0][0] if scored_trades else 0,
                "bottom_score": scored_trades[-1][0] if scored_trades else 0,
            },
        )

        return ranked_trades

    def _calculate_relevance_score(
        self, trade: Trade, enriched: Dict[str, Any]
    ) -> float:
        """
        Calculate weighted relevance score for a single trade.

        Returns:
            Float score (0-100), higher = more relevant
        """
        weights = self.config.get("weights", {})

        # Calculate individual factor scores (each 0-100)
        status_score = self._score_status_urgency(trade.status)
        recency_score = self._score_recency(trade.update_time, trade.create_time)
        transaction_score = self._score_transaction_volume(
            enriched.get("transaction_count", 0)
        )
        asset_type_score = self._score_asset_type_risk(trade.asset_type)

        # Weighted sum
        total_score = (
            weights.get("status_urgency", 0.45) * status_score
            + weights.get("recency", 0.30) * recency_score
            + weights.get("transaction_volume", 0.15) * transaction_score
            + weights.get("asset_type_risk", 0.10) * asset_type_score
        )

        return total_score

    def _score_status_urgency(self, status: str) -> float:
        """Score based on trade status urgency (0-100)."""
        status_priority = self.config.get("status_priority", {})
        return float(status_priority.get(status, 50))

    def _score_recency(self, update_time: str, create_time: str) -> float:  # pylint: disable=unused-argument
        """
        Score based on trade recency (0-100).
        Uses exponential time decay - newer trades score higher.

        Note: create_time parameter reserved for future enhancement.
        """
        recency_config = self.config.get("recency_config", {})
        max_age_days = recency_config.get("max_age_days", 90)
        half_life_days = recency_config.get("half_life_days", 14)

        # Parse timestamp (handle both ISO format and simple format)
        try:
            if "T" in update_time:
                update_dt = datetime.fromisoformat(update_time.replace("Z", "+00:00"))
            else:
                update_dt = datetime.strptime(update_time, "%Y-%m-%d %H:%M:%S")
                update_dt = update_dt.replace(tzinfo=timezone.utc)
        except Exception as e:
            logger.warning(f"Error parsing update_time '{update_time}': {e}")
            return 50.0  # Default middle score

        # Calculate age in days
        now = datetime.now(timezone.utc)
        age_days = (now - update_dt).total_seconds() / 86400

        # Trades older than max_age get 0 score
        if age_days > max_age_days:
            return 0.0

        # Exponential decay: score = 100 * (0.5 ^ (age / half_life))
        decay_factor = math.pow(0.5, age_days / half_life_days)
        score = 100.0 * decay_factor

        return max(0.0, min(100.0, score))

    def _score_transaction_volume(self, transaction_count: int) -> float:
        """
        Score based on transaction complexity (0-100).
        More transactions may indicate higher complexity.
        """
        transaction_config = self.config.get("transaction_config", {})
        min_transactions = transaction_config.get("min_transactions_for_bonus", 5)
        max_transactions = transaction_config.get("max_transaction_count", 20)

        if transaction_count <= 0:
            return 0.0

        if transaction_count < min_transactions:
            return 25.0  # Low complexity

        # Linear scale from min to max
        if transaction_count >= max_transactions:
            return 100.0

        # Interpolate between 25 and 100
        ratio = (transaction_count - min_transactions) / (
            max_transactions - min_transactions
        )
        score = 25.0 + (ratio * 75.0)

        return min(100.0, score)

    def _score_asset_type_risk(self, asset_type: str) -> float:
        """Score based on asset type complexity/risk (0-100)."""
        asset_type_priority = self.config.get("asset_type_priority", {})
        return float(asset_type_priority.get(asset_type, 50))


# Global singleton instances
ranking_config = RankingConfig()
trade_ranker = TradeRanker(ranking_config)
