-- Create query_history table
-- Schema matching requirements:
-- - id: Int (6 digit code, starting from 100000)
-- - user_id: String (FK for Cognito user tagging)
-- - query_text: String (stores search query/filters as JSON)
-- - is_saved: Boolean (TRUE if bookmarked, FALSE if not)
-- - query_name: String (blank unless is_saved == TRUE)
-- - create_time: Timestamp (initially within Jan 2025 - July 2025)
-- - last_use_time: Timestamp (updates when query is reused)
CREATE TABLE IF NOT EXISTS query_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    query_text TEXT NOT NULL,
    is_saved BOOLEAN DEFAULT FALSE,
    query_name VARCHAR(255),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_use_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_query_name_when_saved 
        CHECK ((is_saved = FALSE AND query_name IS NULL) OR is_saved = TRUE)
);

-- Set the sequence to start from 100000 for 6-digit IDs
ALTER SEQUENCE query_history_id_seq RESTART WITH 100000;

-- Set the sequence to start from 100000 for 6-digit IDs
ALTER SEQUENCE query_history_id_seq RESTART WITH 100000;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_query_history_user_id ON query_history(user_id);
CREATE INDEX IF NOT EXISTS idx_query_history_last_use_time ON query_history(last_use_time DESC);
CREATE INDEX IF NOT EXISTS idx_query_history_is_saved ON query_history(is_saved);
CREATE INDEX IF NOT EXISTS idx_query_history_user_saved ON query_history(user_id, is_saved);

-- Create trades table (managed by data-processing-service in production)
-- Schema matches production: id INTEGER PRIMARY KEY
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY,
    account VARCHAR(50) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    booking_system VARCHAR(50) NOT NULL,
    affirmation_system VARCHAR(50) NOT NULL,
    clearing_house VARCHAR(50) NOT NULL,
    create_time TIMESTAMP NOT NULL,
    update_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL
);

-- Create indexes for trades table
CREATE INDEX IF NOT EXISTS idx_trades_asset_type ON trades(asset_type);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_create_time ON trades(create_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_update_time ON trades(update_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account);
