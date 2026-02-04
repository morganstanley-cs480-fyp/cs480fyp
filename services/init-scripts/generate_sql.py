#!/usr/bin/env python3
"""
Script to generate SQL INSERT statements from frontend mockData.ts
Extracts unique trades and creates proper SQL format
"""

# Define the trades from mockData.ts (unique ones)
trades = [
    (69690882, 'ACC084', 'CDS', 'HIGHGARDEN', 'TRAI', 'LCH', '2025-01-06 10:33:00', '2025-09-17 06:13:44', 'ALLEGED'),
    (48712564, 'ACC054', 'CDS', 'KINGSLANDING', 'MARC', 'CME', '2025-05-04 09:45:44', '2025-09-22 21:34:55', 'ALLEGED'),
    (67447216, 'ACC071', 'CDS', 'WINTERFELL', 'FIRELINK', 'OTCCHK', '2025-02-05 03:01:52', '2025-08-10 14:53:23', 'ALLEGED'),
    (67515456, 'ACC046', 'CDS', 'KINGSLANDING', 'BLM', 'CME', '2025-04-03 02:22:13', '2025-09-20 19:30:02', 'ALLEGED'),
    (69755320, 'ACC045', 'CDS', 'WINTERFELL', 'FIRELINK', 'LCH', '2025-06-09 04:32:02', '2025-09-07 08:09:03', 'ALLEGED'),
    (17194044, 'ACC040', 'IRS', 'KINGSLANDING', 'MARC', 'LCH', '2025-06-20 11:44:53', '2025-08-19 19:46:50', 'REJECTED'),
    (60724962, 'ACC023', 'IRS', 'RED KEEP', 'BLM', 'OTCCHK', '2025-06-11 02:27:23', '2025-10-19 12:18:51', 'REJECTED'),
    (35821903, 'ACC133', 'FX', 'HIGHGARDEN', 'TRAI', 'ISCC', '2025-03-15 08:15:22', '2025-08-25 16:42:11', 'CLEARED'),
    (42198745, 'ACC0466', 'IRS', 'WINTERFELL', 'FIRELINK', 'CME', '2025-02-28 14:20:45', '2025-09-05 10:33:18', 'CLEARED'),
    (58392014, 'ACC0982', 'CDS', 'RED KEEP', 'MARC', 'LCH', '2025-07-12 18:55:30', '2025-10-02 22:14:05', 'CANCELLED'),
]

# Generate SQL
sql = """-- Trades data synced from frontend mockData.ts
-- This replaces the previous sample data to ensure frontend and backend have identical datasets

INSERT INTO trades
  (id, account, asset_type, booking_system, affirmation_system, clearing_house, create_time, update_time, status)
VALUES
"""

values = []
for trade in trades:
    values.append(f"({trade[0]}, '{trade[1]}', '{trade[2]}', '{trade[3]}', '{trade[4]}', '{trade[5]}', '{trade[6]}', '{trade[7]}', '{trade[8]}')")

sql += ",\n".join(values) + ";\n\n"

# Add sample query history
sql += """-- Insert sample query history data
INSERT INTO query_history (user_id, query_text, is_saved, query_name, create_time, last_use_time) VALUES
('demo_user', 'show me alleged CDS trades', TRUE, 'Alleged CDS Review', '2025-10-15 10:00:00', '2025-10-20 09:00:00'),
('demo_user', 'cleared IRS trades from last quarter', TRUE, 'Quarterly IRS', '2025-09-01 14:30:00', '2025-10-10 11:15:00'),
('demo_user', 'rejected trades in WINTERFELL', FALSE, NULL, '2025-10-22 16:45:00', '2025-10-22 16:45:00');
"""

print(sql)
