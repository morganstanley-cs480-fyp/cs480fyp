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

-- Create transactions table
-- Schema matches production: stores transaction flow for each trade
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY,
    trade_id INTEGER NOT NULL,
    create_time TIMESTAMP NOT NULL,
    entity VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    update_time TIMESTAMP NOT NULL,
    step INTEGER NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_transactions_trade_id 
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);

-- Create indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_trade_id ON transactions(trade_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_create_time ON transactions(create_time DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_step ON transactions(step);
CREATE INDEX IF NOT EXISTS idx_transactions_entity ON transactions(entity);

-- Create exception status enum type
CREATE TYPE exception_status AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

-- Create exceptions table
-- Schema matches exception-service requirements
CREATE TABLE IF NOT EXISTS exceptions (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL,
    trans_id INTEGER NOT NULL,
    msg TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status exception_status DEFAULT 'PENDING',
    comment TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_exceptions_trade_id 
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
    CONSTRAINT fk_exceptions_trans_id 
        FOREIGN KEY (trans_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Set the sequence to start from 10000000 for 8-digit IDs
ALTER SEQUENCE exceptions_id_seq RESTART WITH 10000000;

-- Create indexes for exceptions table
CREATE INDEX IF NOT EXISTS idx_exceptions_trade_id ON exceptions(trade_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_trans_id ON exceptions(trans_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_priority ON exceptions(priority);
CREATE INDEX IF NOT EXISTS idx_exceptions_create_time ON exceptions(create_time DESC);
CREATE INDEX IF NOT EXISTS idx_exceptions_update_time ON exceptions(update_time DESC);

-- Create solutions table
-- Schema matches solution-service requirements
CREATE TABLE IF NOT EXISTS solutions (
    id SERIAL PRIMARY KEY,
    exception_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    exception_description TEXT,
    reference_event TEXT,
    solution_description TEXT,
    scores INTEGER NOT NULL,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_solutions_exception_id 
        FOREIGN KEY (exception_id) REFERENCES exceptions(id) ON DELETE CASCADE,
    
    -- Score constraint
    CONSTRAINT chk_solutions_scores 
        CHECK (scores >= 0 AND scores <= 27)
);

-- Set the sequence to start from 100000 for 6-digit IDs
ALTER SEQUENCE solutions_id_seq RESTART WITH 100000;

-- Create indexes for solutions table
CREATE INDEX IF NOT EXISTS idx_solutions_exception_id ON solutions(exception_id);
CREATE INDEX IF NOT EXISTS idx_solutions_scores ON solutions(scores DESC);
CREATE INDEX IF NOT EXISTS idx_solutions_create_time ON solutions(create_time DESC);