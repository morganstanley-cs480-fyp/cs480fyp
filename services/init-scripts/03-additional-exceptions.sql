-- Additional 10 exceptions with transaction histories and solutions
-- Based on existing trades from 02-insert-sample-data.sql

-- ============================================================================
-- Exception Set 1: Trade 77194044 - IRS, REJECTED
-- Issue: Regulatory reporting failure - MiFID II transaction reporting timeout
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10001001, 77194044, '2025-08-27 09:01:15', 'LCH', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-08-27 09:01:15', 1),
(10001002, 77194044, '2025-08-27 09:04:22', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-08-27 09:04:22', 2),
(10001003, 77194044, '2025-08-27 09:07:18', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-08-27 09:07:18', 3),
(10001004, 77194044, '2025-08-27 09:11:30', 'LCH', 'send', 'CONSENT_GRANTED', 'CLEARED', '2025-08-27 09:11:30', 4),
(10001005, 77194044, '2025-08-27 09:15:45', 'LCH', 'receive', 'REGULATORY_REPORT', 'REJECTED', '2025-08-27 09:15:45', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20001001, 77194044, 10001005, 'MiFID II transaction reporting failed: ARM (Approved Reporting Mechanism) connection timeout. Trade reporting to regulatory authority exceeded 15-minute deadline required by ESMA guidelines.', 'CRITICAL', 'PENDING', 'Compliance team escalated to IT for ARM system investigation', '2025-08-27 09:16:00', '2025-08-27 09:16:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30001001, 20001001, 'Emergency Manual Regulatory Reporting Submission',
'IRS trade cleared at LCH (trans 10001004) but automated regulatory reporting failed at step 5 due to ARM system connectivity timeout. MiFID II requires transaction reporting within T+0 (same day), creating regulatory breach risk.',
'Similar ARM timeout occurred on 2025-08-15 for 5 trades and was resolved using manual reporting portal within 90 minutes.',
'1. Immediately access FCA regulatory reporting portal (TREM system) for manual submission. 2. Extract trade details from KINGSLANDING booking system including: UTI, counterparty LEI, notional amount, effective date, maturity date. 3. Submit manual transaction report with explanatory flag for late submission. 4. File ARM system incident ticket with vendor support team. 5. Coordinate with Compliance to draft regulatory notification letter to FCA if breach confirmed. 6. Once manual report confirmed, update trade status to CLEARED in internal systems.',
27, '2025-08-27 09:20:00');

-- ============================================================================
-- Exception Set 2: Trade 60724962 - IRS, REJECTED  
-- Issue: Collateral call margin shortfall
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10002001, 60724962, '2024-02-02 10:15:30', 'OTCCHK', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-02-02 10:15:30', 1),
(10002002, 60724962, '2024-02-02 10:19:45', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-02-02 10:19:45', 2),
(10002003, 60724962, '2024-02-02 10:22:30', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-02-02 10:22:30', 3),
(10002004, 60724962, '2024-02-02 10:26:15', 'OTCCHK', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2024-02-02 10:26:15', 4),
(10002005, 60724962, '2024-02-02 10:30:22', 'OTCCHK', 'receive', 'COLLATERAL_CALL', 'REJECTED', '2024-02-02 10:30:22', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20002001, 60724962, 10002005, 'Initial margin call rejection: Required variation margin of $2.3M not available in segregated account. Current collateral balance $1.1M insufficient to meet OTCCHK clearing member requirements for IRS trade.', 'HIGH', 'PENDING', 'Collateral Management team reviewing available unencumbered assets for posting', '2024-02-02 10:31:00', '2024-02-02 10:31:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30002001, 20002001, 'Mobilize Unencumbered Securities for Margin Posting',
'Trade progressed to alleged status (trans 10002004) but clearing house issued margin call (trans 10002005) that cannot be met with current cash collateral. Additional $1.2M variation margin required within 2-hour regulatory deadline.',
'Similar margin shortfall on 2024-01-18 resolved using government bond collateral with 95% haircut within 75 minutes.',
'1. Run collateral optimization query in RED KEEP treasury system to identify available unencumbered securities. 2. Select US Treasury bonds or AAA-rated government securities totaling $1.3M (accounting for haircut). 3. Initiate collateral substitution request through OTCCHK member portal. 4. Coordinate with custodian bank to deliver securities to clearing house via DTC (Depository Trust Company). 5. Monitor collateral acceptance and margin call satisfaction in real-time clearing dashboard. 6. Once margin posted, request clearing house to proceed with trade settlement.',
26, '2024-02-02 10:35:00');

-- ============================================================================
-- Exception Set 3: Trade 86836834 - CDS, REJECTED
-- Issue: ISDA documentation missing
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10003001, 86836834, '2024-04-09 14:22:18', 'JSCC', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-04-09 14:22:18', 1),
(10003002, 86836834, '2024-04-09 14:26:33', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-04-09 14:26:33', 2),
(10003003, 86836834, '2024-04-09 14:30:15', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-04-09 14:30:15', 3),
(10003004, 86836834, '2024-04-09 14:34:50', 'JSCC', 'send', 'LEGAL_DOC_CHECK', 'REJECTED', '2024-04-09 14:34:50', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20003001, 86836834, 10003004, 'ISDA Credit Support Annex (CSA) not on file for counterparty. CDS trade requires executed ISDA Master Agreement with CSA covering variation margin terms. Legal documentation check failed at JSCC clearing validation.', 'HIGH', 'PENDING', 'Legal team contacted counterparty for CSA execution status', '2024-04-09 14:35:30', '2024-04-09 14:35:30');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30003001, 20003001, 'Expedite ISDA CSA Execution or Use Existing Master Agreement',
'CDS trade credit approved (trans 10003003) but legal documentation validation (trans 10003004) rejected at JSCC due to missing CSA. Without CSA, collateral terms for variation margin are undefined, preventing clearing acceptance.',
'Similar ISDA gap on 2024-03-12 resolved using existing master agreement with temporary collateral arrangement within 4 hours.',
'1. Check KINGSLANDING legal entity management system for existence of any ISDA Master Agreement with counterparty. 2. If master agreement exists without CSA, draft temporary collateral letter agreement using standard ISDA template. 3. Coordinate with counterparty legal counsel for same-day execution via DocuSign. 4. Upload signed documentation to JSCC legal repository. 5. Request JSCC legal operations team to perform expedited documentation review. 6. If no master agreement exists, escalate to senior management for bilateral ISDA negotiation (typically 2-4 weeks) or consider trade cancellation. 7. Once documentation approved, resubmit clearing request.',
22, '2024-04-09 14:40:00');

-- ============================================================================
-- Exception Set 4: Trade 77186642 - CDS, REJECTED
-- Issue: SSI (Standing Settlement Instructions) mismatch
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10004001, 77186642, '2025-07-03 08:15:22', 'LCH', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-07-03 08:15:22', 1),
(10004002, 77186642, '2025-07-03 08:19:40', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-07-03 08:19:40', 2),
(10004003, 77186642, '2025-07-03 08:23:18', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-07-03 08:23:18', 3),
(10004004, 77186642, '2025-07-03 08:27:30', 'LCH', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2025-07-03 08:27:30', 4),
(10004005, 77186642, '2025-07-03 08:31:45', 'LCH', 'receive', 'SSI_VALIDATION', 'REJECTED', '2025-07-03 08:31:45', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20004001, 77186642, 10004005, 'Settlement instruction mismatch: Our SSI shows account BNY12345 at Bank of New York Mellon, but counterparty SSI references CITI98765 at Citibank. LCH requires matching settlement instructions for CDS premium payment processing.', 'MEDIUM', 'PENDING', 'Operations team reaching out to counterparty middle office for SSI confirmation', '2025-07-03 08:32:15', '2025-07-03 08:32:15');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30004001, 20004001, 'Reconcile and Update Standing Settlement Instructions',
'Trade achieved alleged status (trans 10004004) but SSI validation (trans 10004005) failed due to settlement bank mismatch. CDS premium payment processing requires both parties to use matching settlement banks per LCH operational rules.',
'SSI mismatches occurred 8 times in Q2 2025, with average resolution time of 3 hours through counterparty coordination.',
'1. Contact counterparty middle office via Bloomberg IB chat to confirm their valid SSI details. 2. Check KINGSLANDING static data repository for last SSI update timestamp for this counterparty. 3. If our SSI is outdated, request updated SSI swift message (MT202 or MT103) from counterparty. 4. Update static data in both KINGSLANDING booking system and BLM affirmation platform. 5. Send SSI confirmation message to LCH operations desk with both parties approved instructions. 6. Request LCH to re-run SSI validation check. 7. Implement monthly SSI reconciliation process with top 50 counterparties to prevent future occurrences.',
24, '2025-07-03 08:36:00');

-- ============================================================================
-- Exception Set 5: Trade 61270683 - FX, REJECTED
-- Issue: FX settlement date holiday conflict
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10005001, 61270683, '2025-07-19 11:05:33', 'LCH', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-07-19 11:05:33', 1),
(10005002, 61270683, '2025-07-19 11:09:22', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-07-19 11:09:22', 2),
(10005003, 61270683, '2025-07-19 11:12:45', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-07-19 11:12:45', 3),
(10005004, 61270683, '2025-07-19 11:16:18', 'LCH', 'send', 'SETTLEMENT_DATE_CHECK', 'REJECTED', '2025-07-19 11:16:18', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20005001, 61270683, 10005004, 'FX settlement date falls on Tokyo bank holiday (Marine Day - July 21, 2025). JPY leg cannot settle as Tokyo market closed. CLS (Continuous Linked Settlement) system rejected settlement instruction due to currency holiday conflict.', 'MEDIUM', 'PENDING', 'FX desk confirming alternative settlement date with counterparty', '2025-07-19 11:17:00', '2025-07-19 11:17:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30005001, 20005001, 'Adjust FX Settlement Date to Next Valid Banking Day',
'FX trade credit approved (trans 10005003) but settlement date validation (trans 10005004) failed due to JPY currency holiday. CLS system cannot process JPY settlements when Tokyo RTGS (Real-Time Gross Settlement) system is closed.',
'Holiday calendar conflicts resolved 12 times in 2025 by adjusting settlement date with average 2-hour turnaround.',
'1. Check FX holiday calendar in RED KEEP treasury system for next valid banking day in both USD and JPY markets. 2. Calculate value date adjustment impact on FX rate (typically use forward points if moving beyond spot date). 3. Contact counterparty FX trader via phone/Bloomberg to propose new settlement date (July 22, 2025). 4. Obtain counterparty verbal confirmation and document in trade notes. 5. Amend trade in BLM affirmation system with new value date. 6. Send amendment confirmation to both parties and LCH clearing house. 7. Resubmit settlement instruction to CLS with corrected date. 8. Update internal holiday calendar check automation to flag currency conflicts at trade entry.',
21, '2025-07-19 11:20:00');

-- ============================================================================
-- Exception Set 6: Trade 98962729 - CDS, REJECTED
-- Issue: Credit event notification during clearing
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10006001, 98962729, '2025-01-24 13:42:18', 'JSCC', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-01-24 13:42:18', 1),
(10006002, 98962729, '2025-01-24 13:46:30', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-01-24 13:46:30', 2),
(10006003, 98962729, '2025-01-24 13:50:15', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-01-24 13:50:15', 3),
(10006004, 98962729, '2025-01-24 13:54:22', 'JSCC', 'send', 'REFERENCE_ENTITY_CHECK', 'REJECTED', '2025-01-24 13:54:22', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20006001, 98962729, 10006004, 'CDS reference entity under ISDA credit event review: Markit/IHS published Potential Credit Event Notice for underlying reference entity. JSCC suspended new CDS transactions on this name pending ISDA Determinations Committee ruling.', 'CRITICAL', 'PENDING', 'Credit Risk team monitoring ISDA DC meeting scheduled for January 25', '2025-01-24 13:55:00', '2025-01-24 13:55:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30006001, 20006001, 'Hold Trade Pending ISDA DC Ruling or Cancel and Restructure',
'CDS trade credit approved (trans 10006003) but reference entity validation (trans 10006004) rejected due to pending ISDA Determinations Committee review of potential credit event. Trading activity suspended on this CDS name until DC ruling issued.',
'Previous credit event suspension on 2024-11-08 resulted in trade cancellation for 3 deals, with alternative restructuring for 2 deals after DC ruling.',
'1. Monitor ISDA website and Markit credit event notifications for Determinations Committee schedule and decision. 2. Assess trade economics: if protection buyer, may want to proceed if entity survives; if protection seller, may prefer cancellation. 3. Contact counterparty to discuss mutual agreement for trade cancellation or amendment pending DC outcome. 4. If DC rules no credit event occurred (negative determination), resubmit clearing request to JSCC. 5. If DC triggers credit event (positive determination), initiate CDS auction settlement process per 2014 ISDA Credit Derivatives Definitions. 6. Document decision rationale in KINGSLANDING trade notes system. 7. Update internal credit event monitoring watchlist to include early warning for pending DC reviews.',
19, '2025-01-24 14:00:00');

-- ============================================================================
-- Exception Set 7: Trade 25399440 - IRS, REJECTED
-- Issue: Interest rate benchmark transition - LIBOR unavailable
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10007001, 25399440, '2024-02-27 09:33:15', 'LCH', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-02-27 09:33:15', 1),
(10007002, 25399440, '2024-02-27 09:37:40', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-02-27 09:37:40', 2),
(10007003, 25399440, '2024-02-27 09:41:22', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-02-27 09:41:22', 3),
(10007004, 25399440, '2024-02-27 09:45:30', 'LCH', 'send', 'RATE_VALIDATION', 'REJECTED', '2024-02-27 09:45:30', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20007001, 25399440, 10007004, 'IRS floating rate index validation failed: Trade references USD LIBOR 3M but LIBOR ceased publication June 2023. LCH clearing house requires Risk-Free Rate (RFR) based indices - must use SOFR (Secured Overnight Financing Rate) for USD swaps.', 'HIGH', 'PENDING', 'Rates desk confirming counterparty agreement to convert to SOFR-based swap', '2024-02-27 09:46:15', '2024-02-27 09:46:15');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30007001, 20007001, 'Convert IRS from LIBOR to SOFR with Credit Adjustment Spread',
'IRS trade credit approved (trans 10007003) but rate validation (trans 10007004) rejected because trade references discontinued LIBOR index. Post-LIBOR transition requires all new USD swaps use SOFR-based floating rates per ISDA 2021 Fallback Protocol.',
'All LIBOR-based trades since July 2023 converted to SOFR using ISDA-recommended credit adjustment spread methodology with 100% success rate.',
'1. Calculate SOFR-equivalent rate using ISDA-recommended credit adjustment spread: USD LIBOR 3M + 26.161 bps spread. 2. Contact counterparty derivatives desk to propose amended trade terms with SOFR Compounded in Arrears (payment delay convention). 3. Document rate conversion in ISDA trade amendment confirmation. 4. Update trade economics in RED KEEP system: floating leg now references "USD-SOFR-COMPOUND" instead of "USD-LIBOR-3M". 5. Adjust trade valuation to account for different accrual conventions (backward looking vs forward looking). 6. Resubmit clearing request to LCH with corrected rate index. 7. Train trading desk on mandatory SOFR usage for all USD IRS transactions.',
27, '2024-02-27 09:50:00');

-- ============================================================================
-- Exception Set 8: Trade 53850480 - CDS, REJECTED
-- Issue: Portfolio compression not applied - gross notional limit exceeded
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10008001, 53850480, '2024-06-15 15:22:44', 'LCH', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-06-15 15:22:44', 1),
(10008002, 53850480, '2024-06-15 15:26:30', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-06-15 15:26:30', 2),
(10008003, 53850480, '2024-06-15 15:30:15', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-06-15 15:30:15', 3),
(10008004, 53850480, '2024-06-15 15:33:50', 'LCH', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2024-06-15 15:33:50', 4),
(10008005, 53850480, '2024-06-15 15:37:22', 'LCH', 'receive', 'NOTIONAL_LIMIT_CHECK', 'REJECTED', '2024-06-15 15:37:22', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20008001, 53850480, 10008005, 'Gross notional exposure limit exceeded: Adding this $50M CDS would bring total CDS gross notional with this counterparty to $750M, exceeding our $700M counterparty exposure cap. LCH requires compression cycle to net down offsetting positions before accepting new trade.', 'MEDIUM', 'PENDING', 'Risk Management reviewing existing CDS portfolio for compression candidates', '2024-06-15 15:38:00', '2024-06-15 15:38:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30008001, 20008001, 'Execute Multilateral CDS Portfolio Compression',
'Trade achieved alleged status (trans 10008004) but notional limit check (trans 10008005) rejected due to exceeding counterparty gross exposure cap. Current portfolio has offsetting long and short CDS positions that can be netted to reduce gross notional.',
'Quarterly compression exercises reduced gross notional by average 35% in 2024, freeing capacity for new trades within 2 business days.',
'1. Run portfolio netting analysis in KINGSLANDING risk system to identify offsetting CDS positions with same counterparty and reference entities. 2. Identify compression opportunities: e.g., if both long and short $100M protection on same name, can terminate both (net to zero). 3. Contact LCH SwapClear compression desk to schedule next available TriOptima triReduce compression cycle. 4. Submit CDS portfolio to compression run (typically occurs weekly). 5. After compression, gross notional should reduce by 30-40%, bringing total below $700M limit. 6. Once compression confirmed and notional freed, resubmit new trade clearing request. 7. Implement automated monthly portfolio compression participation to maintain optimal notional efficiency.',
25, '2024-06-15 15:42:00');

-- ============================================================================
-- Exception Set 9: Trade 89369810 - CDS, REJECTED
-- Issue: Wrong-way risk concentration breach
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10009001, 89369810, '2024-12-29 10:15:22', 'LCH', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-12-29 10:15:22', 1),
(10009002, 89369810, '2024-12-29 10:19:40', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-12-29 10:19:40', 2),
(10009003, 89369810, '2024-12-29 10:23:18', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-12-29 10:23:18', 3),
(10009004, 89369810, '2024-12-29 10:27:30', 'LCH', 'send', 'WWR_CHECK', 'REJECTED', '2024-12-29 10:27:30', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20009001, 89369810, 10009004, 'Wrong-way risk concentration alert: Trade involves selling CDS protection on financial sector entity where counterparty is also a financial institution. Combined financial sector CDS exposure exceeds 25% portfolio concentration limit per Basel III CVA (Credit Valuation Adjustment) guidelines.', 'HIGH', 'PENDING', 'Credit Risk committee reviewing concentration breach waiver request', '2024-12-29 10:28:00', '2024-12-29 10:28:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30009001, 20009001, 'Obtain Risk Committee Waiver or Restructure Trade Structure',
'Trade credit approved (trans 10009003) but wrong-way risk validation (trans 10009004) rejected due to concentrated financial sector exposure. Selling protection on banks while trading with bank counterparty creates correlation risk if financial sector stress event occurs.',
'Similar WWR concentration breach on 2024-10-22 approved by Risk Committee with additional CVA capital charge within 24 hours.',
'1. Prepare risk concentration analysis: calculate current financial sector CDS exposure as % of total CDS portfolio. 2. Model potential CVA increase under financial sector stress scenario using HIGHGARDEN risk system. 3. Draft risk waiver request for Credit Risk Committee including: trade rationale, P&L impact, stress test results, proposed mitigants. 4. Propose alternative structures: (a) reduce trade notional to stay within limit, (b) sell protection on non-financial reference entity instead, (c) add financial sector short hedge position. 5. Present waiver request at weekly Risk Committee meeting. 6. If approved with CVA charge, update trade economics to include additional capital cost. 7. If rejected, work with trading desk to restructure or cancel trade. 8. Once approved, resubmit clearing request with risk committee approval reference.',
23, '2024-12-29 10:35:00');

-- ============================================================================
-- Exception Set 10: Trade 99202386 - IRS, REJECTED
-- Issue: CSA threshold breach - initial margin requirement increased
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10010001, 99202386, '2025-11-17 14:05:33', 'CME', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-11-17 14:05:33', 1),
(10010002, 99202386, '2025-11-17 14:09:45', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-11-17 14:09:45', 2),
(10010003, 99202386, '2025-11-17 14:13:22', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-11-17 14:13:22', 3),
(10010004, 99202386, '2025-11-17 14:17:40', 'CME', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2025-11-17 14:17:40', 4),
(10010005, 99202386, '2025-11-17 14:21:18', 'CME', 'receive', 'IM_REQUIREMENT', 'REJECTED', '2025-11-17 14:21:18', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20010001, 99202386, 10010005, 'Initial margin requirement spike: CME increased margin model sensitivity due to recent rate volatility. New trade requires additional $4.5M IM posting but our CSA threshold with counterparty is $5M. Current IM balance $3.2M means posting $4.5M would breach CSA threshold, requiring threshold increase negotiation.', 'HIGH', 'PENDING', 'Collateral Management team initiating CSA threshold amendment discussion with counterparty', '2025-11-17 14:22:00', '2025-11-17 14:22:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30010001, 20010001, 'Negotiate CSA Threshold Increase or Post Excess Collateral',
'IRS trade progressed to alleged status (trans 10010004) but initial margin check (trans 10010005) rejected because required IM posting would breach CSA threshold limit. Market volatility caused CME SPAN margin model to increase margin requirements by 40%.',
'CSA threshold amendments processed in Q3 2025 for 4 counterparties with average 3-5 business day execution time.',
'1. Contact counterparty collateral management desk to discuss CSA threshold amendment from $5M to $8M. 2. Prepare threshold amendment justification: current DV01 exposure, expected trade volumes, industry standard threshold levels. 3. Draft ISDA CSA threshold amendment using 2016 VM/IM CSA template. 4. Coordinate legal review and negotiation (typical items: threshold calculation method, rounding conventions). 5. Execute threshold amendment via DocuSign (both parties + legal counsel). 6. Upload amended CSA to CME legal documentation repository. 7. Alternative if amendment delayed: post additional $1M as voluntary collateral buffer (non-CSA governed), then process trade. 8. Once threshold increased, resubmit clearing request. 9. Update KINGSLANDING CSA terms database with new threshold for future trades.',
24, '2025-11-17 14:28:00');

-- ============================================================================
-- Exception Set 11: Trade 69269882 - FX, REJECTED
-- Issue: Payment instruction routing failure - SWIFT network disruption
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10011001, 69269882, '2025-09-12 11:22:10', 'LCH', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-09-12 11:22:10', 1),
(10011002, 69269882, '2025-09-12 11:26:45', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-09-12 11:26:45', 2),
(10011003, 69269882, '2025-09-12 11:30:18', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-09-12 11:30:18', 3),
(10011004, 69269882, '2025-09-12 11:34:50', 'LCH', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2025-09-12 11:34:50', 4),
(10011005, 69269882, '2025-09-12 11:38:22', 'LCH', 'receive', 'PAYMENT_INSTRUCTION', 'REJECTED', '2025-09-12 11:38:22', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20011001, 69269882, 10011005, 'SWIFT payment routing failure: MT202 payment instruction rejected due to correspondent bank SWIFT BIC code mismatch. Network reported BIC CHASUS33XXX deprecated, replacement BIC CHASUS33 required per SWIFT November 2025 directory update.', 'MEDIUM', 'PENDING', 'Treasury Operations updating correspondent bank static data', '2025-09-12 11:39:00', '2025-09-12 11:39:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30011001, 20011001, 'Update Correspondent Bank BIC Code and Resubmit Payment',
'FX trade reached alleged status (trans 10011004) but payment instruction (trans 10011005) rejected due to outdated SWIFT BIC code. SWIFT directory updates occur monthly, requiring static data maintenance.',
'Similar BIC code mismatches resolved in September 2025 for 7 payment instructions with average 45-minute turnaround.',
'1. Access SWIFT directory online to verify current BIC code for JPMorgan Chase correspondent bank. 2. Update static data in WINTERFELL payment system: change CHASUS33XXX to CHASUS33. 3. Regenerate MT202 payment instruction with corrected BIC code. 4. Resubmit payment instruction through SWIFT network. 5. Request payment acknowledgment (MT900) from correspondent bank. 6. Implement automated monthly SWIFT BIC directory synchronization to prevent future occurrences. 7. Notify Treasury Operations team to validate all correspondent bank codes quarterly.',
22, '2025-09-12 11:43:00');

-- ============================================================================
-- Exception Set 12: Trade 42511774 - IRS, REJECTED
-- Issue: Counterparty credit downgrade during clearing process
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10012001, 42511774, '2024-05-14 13:15:40', 'CME', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-05-14 13:15:40', 1),
(10012002, 42511774, '2024-05-14 13:19:55', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-05-14 13:19:55', 2),
(10012003, 42511774, '2024-05-14 13:23:22', 'TAS', 'receive', 'CREDIT_DOWNGRADE_ALERT', 'REJECTED', '2024-05-14 13:23:22', 3);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20012001, 42511774, 10012003, 'Counterparty credit rating downgrade: Moody''s downgraded counterparty from A2 to Baa1 during clearing process. This breaches our internal credit policy requiring minimum A3 rating for IRS counterparties. Trade approval suspended pending Credit Risk Committee review.', 'HIGH', 'PENDING', 'Credit Risk analyzing downgrade rationale and reviewing risk appetite', '2024-05-14 13:24:15', '2024-05-14 13:24:15');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30012001, 20012001, 'Escalate to Credit Committee for Policy Override or Trade Cancellation',
'IRS trade credit check initially passed (trans 10012002) but subsequent rating downgrade alert (trans 10012003) triggered policy breach. Real-time credit monitoring detected Moody''s downgrade announcement.',
'Credit downgrades handled in Q1 2024 resulted in 60% trade cancellations, 40% policy overrides with enhanced collateral terms.',
'1. Retrieve downgrade report from Moody''s analyst commentary to understand credit deterioration drivers. 2. Perform credit analysis update: review counterparty financial statements, CDS spreads, equity price trends. 3. Calculate credit exposure: DV01 sensitivity, potential future exposure (PFE), credit valuation adjustment (CVA). 4. Prepare Credit Committee memo including: downgrade rationale, current exposure, proposed mitigants (additional collateral, trade size reduction, guarantee requirement). 5. Present at emergency Credit Committee meeting for policy override decision. 6. If approved, document override rationale and enhanced terms in HIGHGARDEN credit system. 7. If rejected, contact counterparty to negotiate trade cancellation terms. 8. Update approved counterparty list if minimum rating breached.',
25, '2024-05-14 13:30:00');

-- ============================================================================
-- Exception Set 13: Trade 48712564 - CDS, REJECTED
-- Issue: Succession event - reference entity merger announcement
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10013001, 48712564, '2025-03-21 09:45:33', 'CME', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-03-21 09:45:33', 1),
(10013002, 48712564, '2025-03-21 09:49:18', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-03-21 09:49:18', 2),
(10013003, 48712564, '2025-03-21 09:53:40', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-03-21 09:53:40', 3),
(10013004, 48712564, '2025-03-21 09:57:22', 'CME', 'send', 'SUCCESSION_EVENT_CHECK', 'REJECTED', '2025-03-21 09:57:22', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20013001, 48712564, 10013004, 'CDS succession event detected: Reference entity announced merger agreement with acquiring company. ISDA requires CDS contracts to transfer to successor entity, but successor determination pending ISDA Determinations Committee vote. Trading suspended until succession terms finalized.', 'MEDIUM', 'PENDING', 'Derivatives Legal team monitoring ISDA DC succession event deliberations', '2025-03-21 09:58:00', '2025-03-21 09:58:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30013001, 20013001, 'Monitor ISDA Succession Event Outcome and Adjust CDS Terms',
'CDS trade credit approved (trans 10013003) but succession event validation (trans 10013004) rejected due to pending merger. Reference entity will cease to exist post-merger, requiring CDS novation to successor.',
'Succession events in 2024-2025 typically resolved within 5-10 business days through ISDA DC rulings with automatic novation.',
'1. Monitor ISDA Determinations Committee website for succession event meeting schedule and preliminary views. 2. Download merger agreement from SEC EDGAR filings to understand successor entity structure. 3. Calculate exposure impact: assess successor entity creditworthiness vs original reference entity. 4. Determine if successor entity acceptable: review credit rating, same industry sector, similar credit profile. 5. If DC rules full succession, CDS automatically transfers to successor entity per 2014 ISDA definitions. 6. If DC rules partial succession, decide whether to accept partial novation or unwind position. 7. Update reference entity in KINGSLANDING system once succession finalized. 8. Resubmit clearing request with updated reference entity details.',
20, '2025-03-21 10:05:00');

-- ============================================================================
-- Exception Set 14: Trade 14355627 - FX, REJECTED
-- Issue: Currency control restriction - capital flow limit exceeded
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10014001, 14355627, '2024-08-19 15:30:45', 'JSCC', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-08-19 15:30:45', 1),
(10014002, 14355627, '2024-08-19 15:34:22', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-08-19 15:34:22', 2),
(10014003, 14355627, '2024-08-19 15:38:10', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-08-19 15:38:10', 3),
(10014004, 14355627, '2024-08-19 15:41:55', 'JSCC', 'send', 'CAPITAL_FLOW_CHECK', 'REJECTED', '2024-08-19 15:41:55', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20014001, 14355627, 10014004, 'Capital flow restriction breach: CNY cross-border transaction exceeds daily quota of $50M set by SAFE (State Administration of Foreign Exchange). Current daily CNY outflow already at $47M, new $8M FX trade would breach limit. Requires overnight reset or SAFE approval.', 'MEDIUM', 'PENDING', 'Treasury desk reviewing CNY quota utilization and considering next-day settlement', '2024-08-19 15:42:30', '2024-08-19 15:42:30');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30014001, 20014001, 'Defer Trade Settlement or Apply for SAFE Quota Extension',
'FX trade credit approved (trans 10014003) but capital flow validation (trans 10014004) rejected due to Chinese capital control daily quota breach. SAFE regulations limit cross-border CNY transactions.',
'Daily quota breaches resolved in August 2024 by deferring settlement to next business day with 100% success rate.',
'1. Check RED KEEP treasury system for exact daily CNY quota utilization and remaining capacity. 2. Contact counterparty FX desk to propose settlement date change to next business day (August 20) when quota resets. 3. If urgent trade required, prepare SAFE quota extension application including: business rationale, underlying transaction documentation, expected trade frequency. 4. Submit application through local Chinese entity corporate banking portal. 5. SAFE approval typically takes 2-3 business days for legitimate trade purposes. 6. Alternative option: split trade into two smaller transactions across two days to stay within daily limits. 7. Once approved or date adjusted, resubmit clearing request. 8. Implement daily CNY quota monitoring dashboard to prevent future breaches.',
19, '2024-08-19 15:47:00');

-- ============================================================================
-- Exception Set 15: Trade 88531321 - IRS, REJECTED
-- Issue: Trade economics validation - off-market rate detection
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10015001, 88531321, '2025-10-08 10:18:25', 'LCH', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-10-08 10:18:25', 1),
(10015002, 88531321, '2025-10-08 10:22:40', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-10-08 10:22:40', 2),
(10015003, 88531321, '2025-10-08 10:26:15', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-10-08 10:26:15', 3),
(10015004, 88531321, '2025-10-08 10:30:30', 'LCH', 'send', 'RATE_VALIDATION', 'REJECTED', '2025-10-08 10:30:30', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20015001, 88531321, 10015004, 'Off-market rate detected: IRS fixed rate of 5.85% deviates significantly from market mid-rate of 5.12% (73 basis points premium). LCH automated validation flagged as potential operational error or inappropriate pricing. Requires trader confirmation and compliance review.', 'HIGH', 'PENDING', 'Trading desk verifying rate with counterparty and checking for upfront payment offset', '2025-10-08 10:31:15', '2025-10-08 10:31:15');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30015001, 20015001, 'Verify Trade Economics and Document Off-Market Rationale',
'IRS trade credit approved (trans 10015003) but rate validation (trans 10015004) rejected due to off-market pricing detection. Clearing houses flag unusual economics to prevent operational errors and market manipulation.',
'Off-market rate validations in Q3 2025 resulted in 30% operational errors corrected, 70% legitimate trades with documented rationale.',
'1. Contact trading desk to confirm fixed rate 5.85% was intentional and not keying error. 2. Review trade confirmation email and Bloomberg chat logs for rate agreement documentation. 3. Check if off-market rate offset by upfront payment: verify HIGHGARDEN system for initial exchange amount. 4. If upfront payment exists, calculate present value equivalence to confirm economic fairness. 5. If operational error confirmed, correct rate to market level (5.12%) and re-affirm with counterparty. 6. If legitimate off-market trade, prepare justification letter for LCH compliance: client hedging requirement, portfolio restructuring, relationship trade. 7. Submit supporting documentation to LCH operational risk team for manual review. 8. Once approved, resubmit clearing request with compliance approval reference.',
26, '2025-10-08 10:36:00');

-- ============================================================================
-- Exception Set 16: Trade 54146216 - CDS, REJECTED
-- Issue: LEI (Legal Entity Identifier) validation failure
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10016001, 54146216, '2024-11-22 14:08:50', 'OTCCHK', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-11-22 14:08:50', 1),
(10016002, 54146216, '2024-11-22 14:12:33', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-11-22 14:12:33', 2),
(10016003, 54146216, '2024-11-22 14:16:20', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-11-22 14:16:20', 3),
(10016004, 54146216, '2024-11-22 14:20:10', 'OTCCHK', 'send', 'LEI_VALIDATION', 'REJECTED', '2024-11-22 14:20:10', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20016001, 54146216, 10016004, 'LEI validation failure: Counterparty Legal Entity Identifier (LEI) 5493001KJTIIGC8Y1R12 has lapsed status in GLEIF database. LEI expired on November 1, 2024 and requires annual renewal. MiFID II and EMIR regulations mandate active LEI for all derivative counterparties.', 'HIGH', 'PENDING', 'Legal entity management team contacting counterparty for LEI renewal confirmation', '2024-11-22 14:21:00', '2024-11-22 14:21:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30016001, 20016001, 'Request Counterparty LEI Renewal or Delay Trade Settlement',
'CDS trade credit approved (trans 10016003) but LEI validation (trans 10016004) rejected due to lapsed identifier. Annual LEI renewal required per GLEIF (Global Legal Entity Identifier Foundation) requirements.',
'Lapsed LEI issues in 2024 resolved within 1-3 business days through counterparty renewal coordination.',
'1. Verify LEI status on GLEIF website (www.gleif.org) to confirm lapsed status and renewal requirements. 2. Contact counterparty legal/compliance team to request immediate LEI renewal. 3. Provide renewal instructions: counterparty must contact original LEI issuing organization (LOU - Local Operating Unit). 4. LEI renewal process typically takes 24-48 hours with payment of annual fee (~$100-200). 5. Monitor GLEIF database for LEI status change from "LAPSED" to "ISSUED". 6. Once LEI renewed, update counterparty static data in KINGSLANDING legal entity system. 7. Resubmit clearing request with renewed LEI. 8. Implement quarterly LEI monitoring process for all active counterparties to prevent future lapses.',
23, '2024-11-22 14:26:00');

-- ============================================================================
-- Exception Set 17: Trade 72427554 - FX, REJECTED
-- Issue: AML (Anti-Money Laundering) screening alert
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10017001, 72427554, '2025-06-30 16:22:40', 'OTCCHK', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-06-30 16:22:40', 1),
(10017002, 72427554, '2025-06-30 16:26:15', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-06-30 16:26:15', 2),
(10017003, 72427554, '2025-06-30 16:30:50', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-06-30 16:30:50', 3),
(10017004, 72427554, '2025-06-30 16:34:25', 'OTCCHK', 'send', 'AML_SCREENING', 'REJECTED', '2025-06-30 16:34:25', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20017001, 72427554, 10017004, 'AML screening alert triggered: Counterparty beneficial owner name flagged potential match (85% confidence) with OFAC (Office of Foreign Assets Control) sanctions list. Automated screening system requires manual compliance review before trade processing can proceed. Potential false positive due to common name.', 'CRITICAL', 'PENDING', 'Compliance conducting enhanced due diligence on beneficial ownership structure', '2025-06-30 16:35:30', '2025-06-30 16:35:30');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30017001, 20017001, 'Conduct Enhanced Due Diligence and Clear False Positive',
'FX trade credit approved (trans 10017003) but AML screening (trans 10017004) flagged potential sanctions match. Compliance must investigate before trade can proceed per OFAC regulations.',
'AML false positives in 2025 cleared within 2-4 hours through enhanced due diligence with 95% clearance rate.',
'1. Access World-Check or Dow Jones sanctions screening system for full alert details and match criteria. 2. Review counterparty KYC (Know Your Customer) documentation: beneficial ownership chart, passport copies, proof of address. 3. Compare flagged individual details: full name, date of birth, nationality, address against OFAC SDN (Specially Designated Nationals) list. 4. If false positive confirmed (different middle name, birth date, or jurisdiction), document differentiation factors. 5. Escalate to MLRO (Money Laundering Reporting Officer) for approval to override screening alert. 6. Document clearance decision in compliance case management system with supporting evidence. 7. If true positive match confirmed, immediately reject trade and file SAR (Suspicious Activity Report). 8. Once cleared, update screening system whitelist and resubmit clearing request.',
27, '2025-06-30 16:41:00');

-- ============================================================================
-- Exception Set 18: Trade 56535550 - IRS, REJECTED
-- Issue: Booking system connectivity failure
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10018001, 56535550, '2024-09-05 11:45:20', 'OTCCHK', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-09-05 11:45:20', 1),
(10018002, 56535550, '2024-09-05 11:49:35', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-09-05 11:49:35', 2),
(10018003, 56535550, '2024-09-05 11:53:18', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-09-05 11:53:18', 3),
(10018004, 56535550, '2024-09-05 11:57:40', 'OTCCHK', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2024-09-05 11:57:40', 4),
(10018005, 56535550, '2024-09-05 12:01:22', 'OTCCHK', 'receive', 'BOOKING_CONFIRMATION', 'REJECTED', '2024-09-05 12:01:22', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20018001, 56535550, 10018005, 'Booking system integration failure: WINTERFELL booking system returned HTTP 503 service unavailable error. Unable to confirm trade booking and generate trade reference number. Database connection pool exhausted due to high trading volume. Trade stuck in alleged status pending system recovery.', 'MEDIUM', 'PENDING', 'IT Operations restarting WINTERFELL application servers and scaling database connections', '2024-09-05 12:02:15', '2024-09-05 12:02:15');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30018001, 20018001, 'Restart Booking System and Implement Failover Process',
'IRS trade reached alleged status (trans 10018004) but booking confirmation (trans 10018005) failed due to system outage. WINTERFELL booking system experiencing performance degradation under peak load.',
'Similar booking system outages in Q3 2024 resolved within 30-60 minutes through server restart and connection pool tuning.',
'1. Contact IT Operations NOC (Network Operations Center) to verify WINTERFELL system status and incident ticket. 2. Check system health dashboard for database connection metrics, application server CPU/memory utilization. 3. Coordinate immediate system restart: drain active connections, restart application pods, clear connection pool. 4. Once system restored, manually trigger booking retry for pending trades in alleged status. 5. Verify booking confirmation received and trade reference number generated in WINTERFELL. 6. Update clearing house with booking reference to progress trade to confirmed status. 7. Post-incident review: increase database connection pool from 100 to 200 connections, implement auto-scaling for application tier. 8. Establish booking failover to RED KEEP backup system for future outages.',
21, '2024-09-05 12:08:00');

-- ============================================================================
-- Exception Set 19: Trade 67515456 - CDS, REJECTED
-- Issue: Index rebalancing event conflict
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10019001, 67515456, '2025-12-18 13:30:15', 'CME', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-12-18 13:30:15', 1),
(10019002, 67515456, '2025-12-18 13:34:40', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-12-18 13:34:40', 2),
(10019003, 67515456, '2025-12-18 13:38:25', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-12-18 13:38:25', 3),
(10019004, 67515456, '2025-12-18 13:42:10', 'CME', 'send', 'INDEX_VERSION_CHECK', 'REJECTED', '2025-12-18 13:42:10', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20019001, 67515456, 10019004, 'CDS index version conflict: Trade references CDX.NA.IG Series 42 but series rolled to Series 43 on December 20, 2025 (roll date in 2 days). LCH policy prohibits new trades on off-the-run index series within 5 business days of roll date. Must trade on-the-run Series 43 or wait until roll completes.', 'MEDIUM', 'PENDING', 'Trading desk coordinating with counterparty to switch to on-the-run index series', '2025-12-18 13:43:00', '2025-12-18 13:43:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30019001, 20019001, 'Switch to On-The-Run Index Series or Defer Trade Post-Roll',
'CDS index trade credit approved (trans 10019003) but index version validation (trans 10019004) rejected due to roll date proximity. Clearing houses restrict off-the-run trading during roll period to ensure liquidity.',
'Index roll transitions handled in June and December 2025 with 100% success rate by switching to new series.',
'1. Check Markit website for official CDX.NA.IG Series 43 constituent list and pricing (typically published 10 days before roll). 2. Calculate basis difference between Series 42 and Series 43: index spread, constituent changes, credit quality shift. 3. Contact counterparty trading desk to propose amendment to Series 43 at adjusted spread level. 4. If counterparty agrees, cancel Series 42 trade and re-execute with Series 43 index code. 5. Update trade details in KINGSLANDING system: index series, spread, effective date. 6. Resubmit clearing request with on-the-run index version. 7. Alternative option: defer trade settlement until December 22 when roll completes and Series 42 becomes acceptable again. 8. Set calendar reminder for future index roll dates (June 20, December 20 annually).',
20, '2025-12-18 13:48:00');

-- ============================================================================
-- Exception Set 20: Trade 81930671 - FX, REJECTED
-- Issue: Settlement instructions incomplete - beneficiary bank missing
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10020001, 81930671, '2024-07-11 09:55:30', 'OTCCHK', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-07-11 09:55:30', 1),
(10020002, 81930671, '2024-07-11 09:59:18', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-07-11 09:59:18', 2),
(10020003, 81930671, '2024-07-11 10:03:45', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-07-11 10:03:45', 3),
(10020004, 81930671, '2024-07-11 10:07:22', 'OTCCHK', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2024-07-11 10:07:22', 4),
(10020005, 81930671, '2024-07-11 10:11:10', 'OTCCHK', 'receive', 'SSI_COMPLETENESS', 'REJECTED', '2024-07-11 10:11:10', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20020001, 81930671, 10020005, 'Settlement instruction incomplete: GBP beneficiary bank details missing intermediary bank information. SWIFT payment routing requires intermediary bank (BARCGB22XXX - Barclays London) for final delivery to beneficiary account at Metro Bank. SSI validation failed due to incomplete correspondent banking chain.', 'MEDIUM', 'PENDING', 'Settlement Operations team obtaining full correspondent bank routing details', '2024-07-11 10:12:00', '2024-07-11 10:12:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30020001, 20020001, 'Obtain Complete Correspondent Banking Details and Update SSI',
'FX trade achieved alleged status (trans 10020004) but SSI completeness check (trans 10020005) rejected due to missing intermediary bank. Multi-hop SWIFT routing requires full correspondent chain.',
'Incomplete SSI issues resolved in July 2024 through counterparty coordination with average 90-minute turnaround.',
'1. Contact counterparty operations team to request complete settlement instruction chain including all intermediary banks. 2. Request SWIFT MT202COV message format with field 56A (intermediary institution) populated. 3. Verify intermediary bank details: beneficiary bank Metro Bank does not have direct relationship with our correspondent bank, requires Barclays as intermediary. 4. Update SSI in RED KEEP static data system: add intermediary bank BIC (BARCGB22XXX), intermediary account number. 5. Validate updated SSI through SWIFT test message (MT199) to confirm routing path. 6. Resubmit settlement instruction with complete correspondent chain. 7. Implement SSI validation rule to require intermediary bank for all non-major banks. 8. Maintain approved correspondent bank directory for common routing scenarios.',
22, '2024-07-11 10:17:00');

-- ============================================================================
-- Exception Set 21: Trade 64737734 - IRS, REJECTED
-- Issue: Bilateral vs cleared execution confusion
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10021001, 64737734, '2025-04-16 14:25:40', 'CME', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-04-16 14:25:40', 1),
(10021002, 64737734, '2025-04-16 14:29:15', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-04-16 14:29:15', 2),
(10021003, 64737734, '2025-04-16 14:33:50', 'TAS', 'receive', 'CLEARING_ELIGIBILITY', 'REJECTED', '2025-04-16 14:33:50', 3);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20021001, 64737734, 10021003, 'Clearing eligibility rejection: IRS trade submitted for cleared execution but counterparty is not OTCCHK clearing member. Trade must execute bilaterally with counterparty direct credit exposure. Clearing house membership required for central clearing per Dodd-Frank mandatory clearing rules exemption (notional below $8B threshold).', 'MEDIUM', 'PENDING', 'Trading desk converting to bilateral execution with ISDA documentation', '2025-04-16 14:34:30', '2025-04-16 14:34:30');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30021001, 20021001, 'Convert Trade to Bilateral Execution with ISDA Framework',
'IRS trade credit check passed (trans 10021002) but clearing eligibility check (trans 10021003) rejected because counterparty lacks clearing membership. Must restructure as bilateral OTC derivative.',
'Cleared-to-bilateral conversion executed 15 times in Q1 2025 with average 4-hour restructuring time.',
'1. Verify counterparty ISDA Master Agreement exists in KINGSLANDING legal entity system for bilateral trading. 2. Confirm CSA (Credit Support Annex) executed for collateral terms. 3. Update trade execution method in booking system from "CLEARED" to "BILATERAL". 4. Recalculate credit exposure: CVA (Credit Valuation Adjustment), DVA (Debt Valuation Adjustment), FVA (Funding Valuation Adjustment) for bilateral structure. 5. Adjust trade pricing to reflect bilateral credit costs (typically 5-15 bps wider than cleared equivalent). 6. Obtain counterparty agreement to bilateral pricing adjustment via Bloomberg chat. 7. Book trade in WINTERFELL bilateral derivatives book instead of cleared derivatives book. 8. Submit bilateral trade affirmation through DTCC TIW platform. 9. Implement pre-trade clearing eligibility check to prevent future misrouting.',
23, '2025-04-16 14:40:00');

-- ============================================================================
-- Exception Set 22: Trade 69755320 - CDS, REJECTED
-- Issue: Maturity date mismatch - standard tenor deviation
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10022001, 69755320, '2024-10-29 10:40:25', 'LCH', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-10-29 10:40:25', 1),
(10022002, 69755320, '2024-10-29 10:44:50', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-10-29 10:44:50', 2),
(10022003, 69755320, '2024-10-29 10:48:15', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-10-29 10:48:15', 3),
(10022004, 69755320, '2024-10-29 10:52:40', 'LCH', 'send', 'MATURITY_VALIDATION', 'REJECTED', '2024-10-29 10:52:40', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20022001, 69755320, 10022004, 'Non-standard CDS maturity date: Trade maturity November 15, 2029 does not align with standard IMM dates (March/June/September/December 20th). JSCC clearing only accepts standard 5Y tenor maturing December 20, 2029. Custom maturity dates increase operational complexity and reduce liquidity.', 'LOW', 'PENDING', 'Derivatives Operations confirming standard maturity date with trading desk', '2024-10-29 10:53:30', '2024-10-29 10:53:30');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30022001, 20022001, 'Adjust Maturity to Standard IMM Date for Clearing Acceptance',
'CDS trade credit approved (trans 10022003) but maturity validation (trans 10022004) rejected due to non-standard tenor. Clearing houses mandate IMM (International Monetary Market) dates for operational efficiency.',
'Non-standard maturity corrections processed in October 2024 with 100% counterparty agreement to standard dates.',
'1. Verify standard IMM date convention for CDS: 20th of March, June, September, December each year. 2. Calculate standard 5Y maturity from trade date October 29, 2024: December 20, 2029 (next IMM date after 5 years). 3. Assess impact of maturity change from November 15 to December 20: approximately 35 additional days of protection, minimal economic difference. 4. Contact counterparty to propose maturity amendment to standard IMM date. 5. Adjust CDS premium proportionally for extended maturity: ~1.9% longer duration, calculate fair value adjustment. 6. Update trade confirmation with standard maturity December 20, 2029. 7. Resubmit clearing request with corrected maturity. 8. Implement trade entry validation to default to IMM dates and flag non-standard maturities.',
18, '2024-10-29 10:58:00');

-- ============================================================================
-- Exception Set 23: Trade 66663488 - FX, REJECTED
-- Issue: Dual currency settlement failure - one leg rejected
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10023001, 66663488, '2025-05-23 15:18:35', 'JSCC', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-05-23 15:18:35', 1),
(10023002, 66663488, '2025-05-23 15:22:20', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-05-23 15:22:20', 2),
(10023003, 66663488, '2025-05-23 15:26:45', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-05-23 15:26:45', 3),
(10023004, 66663488, '2025-05-23 15:30:18', 'JSCC', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2025-05-23 15:30:18', 4),
(10023005, 66663488, '2025-05-23 15:34:50', 'JSCC', 'receive', 'DUAL_CURRENCY_CHECK', 'REJECTED', '2025-05-23 15:34:50', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20023001, 66663488, 10023005, 'FX settlement dual currency failure: EUR leg settlement instruction accepted by CLS but CHF leg rejected due to insufficient balance in CHF settlement account. CLS requires simultaneous settlement of both legs under PvP (Payment versus Payment) mechanism. CHF account short by 500k CHF.', 'HIGH', 'PENDING', 'Treasury Operations arranging CHF funding via overnight interbank market', '2025-05-23 15:35:40', '2025-05-23 15:35:40');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30023001, 20023001, 'Fund CHF Settlement Account and Resubmit to CLS',
'FX trade achieved alleged status (trans 10023004) but dual currency settlement check (trans 10023005) rejected due to insufficient CHF funding. CLS PvP model requires both legs funded before settlement.',
'CHF funding shortfalls resolved in May 2025 through interbank borrowing with average 2-hour execution time.',
'1. Check RED KEEP treasury system for real-time CHF cash position and settlement obligations. 2. Calculate total CHF requirement including this trade and other pending settlements for same value date. 3. Execute overnight CHF funding: contact interbank brokers for Swiss franc borrowing (typical rate: SARON + 10-20 bps). 4. Alternative funding sources: sell EUR/CHF spot to generate CHF, draw on committed CHF credit line from UBS. 5. Coordinate CHF transfer to CLS settlement bank account before CLS funding deadline (typically 6:30 AM CET). 6. Confirm CHF funding received via SWIFT MT910 confirmation. 7. Notify CLS operations desk to re-validate settlement instruction with funded account. 8. Monitor CLS settlement status for both EUR and CHF leg completion. 9. Implement daily currency liquidity forecast to prevent future funding gaps.',
25, '2025-05-23 15:42:00');

-- ============================================================================
-- Exception Set 24: Trade 15706882 - IRS, REJECTED
-- Issue: Portfolio reconciliation break - trade enrichment mismatch
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10024001, 15706882, '2024-12-03 11:32:15', 'CME', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-12-03 11:32:15', 1),
(10024002, 15706882, '2024-12-03 11:36:40', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-12-03 11:36:40', 2),
(10024003, 15706882, '2024-12-03 11:40:25', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-12-03 11:40:25', 3),
(10024004, 15706882, '2024-12-03 11:44:10', 'CME', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2024-12-03 11:44:10', 4),
(10024005, 15706882, '2024-12-03 11:48:35', 'CME', 'receive', 'PORTFOLIO_RECON', 'REJECTED', '2024-12-03 11:48:35', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20024001, 15706882, 10024005, 'Portfolio reconciliation break: LCH trade repository shows different trade economics than our booking system. Notional amount mismatch: LCH records $75M vs KINGSLANDING shows $70M. Reconciliation tolerance breach (7% variance exceeds 1% threshold). Requires trade amendment or system correction before clearing acceptance.', 'MEDIUM', 'PENDING', 'Middle Office investigating source of notional discrepancy between systems', '2024-12-03 11:49:20', '2024-12-03 11:49:20');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30024001, 20024001, 'Investigate Reconciliation Break and Correct Trade Notional',
'IRS trade reached alleged status (trans 10024004) but portfolio reconciliation (trans 10024005) identified economics mismatch between clearing house and internal records. Root cause analysis required.',
'Portfolio reconciliation breaks in Q4 2024 resolved within 60-90 minutes through trade confirmation review with 80% correction rate.',
'1. Retrieve original trade confirmation email and Bloomberg chat logs to verify agreed notional amount. 2. Check trade entry audit trail in KINGSLANDING system: identify who booked trade, timestamp, original notional entered. 3. Review LCH trade submission message (FpML format) to determine what notional was sent to clearing house. 4. Identify root cause: trader keying error ($70M vs $75M), confirmation mismatch, system interface bug. 5. If our system incorrect: correct KINGSLANDING notional to $75M, revalue trade, adjust P&L, notify Finance for accounting adjustment. 6. If LCH incorrect: submit trade amendment request through LCH member portal with supporting trade confirmation. 7. Obtain counterparty confirmation of correct notional amount. 8. Once systems aligned, request LCH to re-run portfolio reconciliation. 9. Implement automated booking vs confirmation reconciliation check at trade entry.',
24, '2024-12-03 11:55:00');

-- ============================================================================
-- Exception Set 25: Trade 96904486 - CDS, REJECTED
-- Issue: Restructuring credit event delivery obligation
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10025001, 96904486, '2025-02-07 09:28:50', 'OTCCHK', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-02-07 09:28:50', 1),
(10025002, 96904486, '2025-02-07 09:32:35', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-02-07 09:32:35', 2),
(10025003, 96904486, '2025-02-07 09:36:20', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-02-07 09:36:20', 3),
(10025004, 96904486, '2025-02-07 09:40:15', 'OTCCHK', 'send', 'DELIVERABLE_OBLIGATION_CHECK', 'REJECTED', '2025-02-07 09:40:15', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20025001, 96904486, 10025004, 'CDS deliverable obligation restriction: Reference entity underwent debt restructuring in January 2025. Post-restructuring bonds no longer meet "Standard Reference Obligation" criteria per 2014 ISDA definitions. Deliverable obligation characteristics changed (subordinated debt, maturity reduced). Physical settlement may be impaired in credit event scenario.', 'MEDIUM', 'PENDING', 'Credit structuring team assessing impact of restructured reference obligations', '2025-02-07 09:41:30', '2025-02-07 09:41:30');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30025001, 20025001, 'Assess Restructured Obligations or Switch Reference Entity',
'CDS trade credit approved (trans 10025003) but deliverable obligation check (trans 10025004) flagged changed characteristics post-restructuring. Protection buyer delivery rights potentially limited in credit event.',
'Restructuring events in 2024-2025 resulted in 50% reference entity changes, 50% acceptance of modified DR (Deliverable obligation, Restructuring) clause.',
'1. Review restructuring details: obtain amended bond documentation showing new maturity, seniority, payment terms. 2. Analyze deliverable obligation impact: assess whether restructured bonds still qualify under "borrowed money" and "maximum maturity" tests. 3. Check ISDA Deliverable Obligation Matrix for reference entity to understand acceptable delivery options. 4. Propose CDS contract modifications: (a) add Modified Restructuring (Mod R) clause to limit deliverable maturity, (b) switch to Modified Modified Restructuring (Mod Mod R) for EUR bonds, (c) change to cash settlement instead of physical delivery. 5. Calculate valuation impact of contract modification using credit spreads and restructuring recovery assumptions. 6. Coordinate with counterparty to agree on amended CDS terms. 7. If acceptable, update contract specifications and resubmit clearing. 8. Alternative: switch to different reference entity with standard obligations.',
21, '2025-02-07 09:48:00');

-- ============================================================================
-- Exception Set 26: Trade 49964172 - FX, REJECTED
-- Issue: Time zone conversion error in value date calculation
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10026001, 49964172, '2024-03-28 23:45:20', 'OTCCHK', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-03-28 23:45:20', 1),
(10026002, 49964172, '2024-03-28 23:49:35', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-03-28 23:49:35', 2),
(10026003, 49964172, '2024-03-28 23:53:18', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-03-28 23:53:18', 3),
(10026004, 49964172, '2024-03-28 23:57:40', 'OTCCHK', 'send', 'VALUE_DATE_VALIDATION', 'REJECTED', '2024-03-28 23:57:40', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20026001, 49964172, 10026004, 'Value date calculation error: Trade executed at 23:45 GMT (March 28) targeting spot settlement April 1st. However, AUD/USD spot convention uses Sydney business day for AUD leg. March 29 is Sydney public holiday (Good Friday), pushing AUD value date to April 2nd while USD settles April 1st. Asymmetric value dates not permitted.', 'MEDIUM', 'PENDING', 'FX Operations team recalculating value date considering both currency holiday calendars', '2024-03-29 00:01:00', '2024-03-29 00:01:00');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30026001, 20026001, 'Recalculate Value Date with Dual Currency Holiday Calendar',
'FX trade credit approved (trans 10026003) but value date validation (trans 10026004) rejected due to holiday calendar asymmetry. FX spot settlement requires T+2 business days in BOTH currencies.',
'Value date calculation errors in March-April 2024 (Easter holiday period) resolved through dual calendar validation with 100% success.',
'1. Access comprehensive FX holiday calendar showing both AUD (Sydney) and USD (New York) banking holidays. 2. Recalculate spot value date from trade date March 28: skip Saturday March 30, skip Sunday March 31, skip Monday April 1 (Easter Monday - Sydney holiday), arrive at April 2 for both currencies. 3. Verify April 2 is valid business day in both jurisdictions: Sydney (Tuesday, open), New York (Tuesday, open). 4. Contact counterparty FX desk to confirm value date amendment to April 2. 5. Update trade settlement date in RED KEEP system from April 1 to April 2. 6. Recalculate forward points if applicable (one additional day of interest differential). 7. Resubmit settlement instruction to CLS with corrected value date. 8. Implement automated dual-currency holiday validation in trade entry workflow to prevent future errors.',
20, '2024-03-29 00:08:00');

-- ============================================================================
-- Exception Set 27: Trade 42668494 - IRS, REJECTED
-- Issue: Bilateral credit line utilization exceeded
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10027001, 42668494, '2025-08-14 12:22:45', 'JSCC', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-08-14 12:22:45', 1),
(10027002, 42668494, '2025-08-14 12:26:30', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-08-14 12:26:30', 2),
(10027003, 42668494, '2025-08-14 12:30:15', 'TAS', 'receive', 'CREDIT_LINE_EXCEEDED', 'REJECTED', '2025-08-14 12:30:15', 3);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20027001, 42668494, 10027003, 'Bilateral credit line exceeded: Current counterparty exposure $145M plus new trade PFE (Potential Future Exposure) $22M totals $167M, exceeding approved bilateral credit limit of $150M. Credit Risk policy requires limit increase approval before trade execution. Alternative: compress existing positions to free capacity.', 'HIGH', 'PENDING', 'Credit Risk analyzing limit increase request and portfolio compression options', '2025-08-14 12:31:30', '2025-08-14 12:31:30');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30027001, 20027001, 'Request Credit Limit Increase or Compress Existing Portfolio',
'IRS trade credit check initially passed (trans 10027002) but detailed credit line validation (trans 10027003) rejected due to insufficient bilateral capacity. New trade would breach counterparty exposure cap.',
'Credit limit increase requests in Q3 2025 approved 70% of time with average 4-6 hour Credit Committee turnaround.',
'1. Run detailed exposure analysis in HIGHGARDEN credit system: current mark-to-market, PFE distribution (95th percentile over 1 year), CVA impact. 2. Identify root cause of high utilization: market moves causing positive exposure, increased trading activity, wrong-way risk correlation. 3. Propose credit limit increase from $150M to $200M: prepare justification memo including counterparty credit rating, relationship revenue, securitization potential. 4. Alternative strategy: identify offsetting IRS positions with same counterparty for compression to free $17M+ capacity. 5. Present limit increase request to Credit Risk Committee with supporting analysis. 6. If approved, update credit system with new limit effective immediately. 7. If rejected, coordinate portfolio compression exercise or reduce trade notional to fit within existing limit. 8. Once capacity available, resubmit clearing request.',
26, '2025-08-14 12:38:00');

-- ============================================================================
-- Exception Set 28: Trade 98159040 - CDS, REJECTED
-- Issue: DTCC affirmation timeout - counterparty non-response
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10028001, 98159040, '2024-06-18 10:35:50', 'JSCC', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-06-18 10:35:50', 1),
(10028002, 98159040, '2024-06-18 10:39:25', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-06-18 10:39:25', 2),
(10028003, 98159040, '2024-06-18 10:43:40', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-06-18 10:43:40', 3),
(10028004, 98159040, '2024-06-18 10:47:15', 'JSCC', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2024-06-18 10:47:15', 4),
(10028005, 98159040, '2024-06-18 12:47:30', 'JSCC', 'receive', 'AFFIRMATION_TIMEOUT', 'REJECTED', '2024-06-18 12:47:30', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20028001, 98159040, 10028005, 'DTCC trade affirmation timeout: Counterparty failed to affirm trade within 2-hour industry standard deadline. Trade remains in alleged status. Possible causes: counterparty operations backlog, system outage, trade details discrepancy preventing affirmation. Unaffirmed trades increase operational risk and delay clearing.', 'MEDIUM', 'PENDING', 'Middle Office contacting counterparty operations to expedite affirmation', '2024-06-18 12:48:45', '2024-06-18 12:48:45');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30028001, 20028001, 'Escalate Affirmation with Counterparty and Investigate Discrepancy',
'CDS trade reached alleged status (trans 10028004) but DTCC affirmation timeout (trans 10028005) triggered after 2 hours. Counterparty must electronically affirm trade details for clearing to proceed.',
'Affirmation timeouts in June 2024 resolved through counterparty coordination with average 3-hour delay reduction.',
'1. Check DTCC TIW (Trade Information Warehouse) platform for affirmation status: pending, rejected, or not received. 2. Review trade details sent to counterparty: notional, spread, maturity, reference entity, confirm match with original execution. 3. Contact counterparty middle office via phone and email to request immediate affirmation. 4. Investigate affirmation delay causes: check if counterparty received trade allegation, verify trade captured in their booking system. 5. If trade details mismatch identified, correct discrepancy and resubmit allegation. 6. Request counterparty supervisor escalation if operations unresponsive. 7. Monitor DTCC platform for affirmation confirmation. 8. Once affirmed, clearing house will automatically progress to confirmed status. 9. Implement automated affirmation monitoring with 1-hour alert threshold for future trades.',
21, '2024-06-18 12:55:00');

-- ============================================================================
-- Exception Set 29: Trade 27625806 - FX, REJECTED
-- Issue: Netting agreement absence preventing settlement optimization
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10029001, 27625806, '2025-11-05 13:50:15', 'CME', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2025-11-05 13:50:15', 1),
(10029002, 27625806, '2025-11-05 13:54:40', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2025-11-05 13:54:40', 2),
(10029003, 27625806, '2025-11-05 13:58:25', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2025-11-05 13:58:25', 3),
(10029004, 27625806, '2025-11-05 14:02:10', 'CME', 'send', 'CONSENT_GRANTED', 'ALLEGED', '2025-11-05 14:02:10', 4),
(10029005, 27625806, '2025-11-05 14:06:35', 'CME', 'receive', 'NETTING_ELIGIBILITY', 'REJECTED', '2025-11-05 14:06:35', 5);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20029001, 27625806, 10029005, 'Payment netting agreement missing: Multiple FX trades with counterparty settling same value date (November 7) but no ISDA Payment Netting Agreement on file. Gross settlement required for $15M USD payment despite offsetting $12M receivable, resulting in $27M gross cash movement instead of $3M net. Settlement risk and funding inefficiency.', 'LOW', 'PENDING', 'Legal documentation team initiating payment netting agreement negotiation', '2025-11-05 14:07:50', '2025-11-05 14:07:50');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30029001, 20029001, 'Execute ISDA Payment Netting Agreement for Settlement Efficiency',
'FX trade achieved alleged status (trans 10029004) but netting eligibility check (trans 10029005) flagged absent payment netting agreement. Trade will settle gross instead of net, increasing settlement risk and funding costs.',
'Payment netting agreements executed in Q4 2025 for 8 counterparties, reducing gross settlement volumes by average 65%.',
'1. Calculate gross vs net settlement benefit: current case $27M gross vs $3M net saves $24M funding and settlement risk reduction. 2. Review KINGSLANDING legal entity system for existing agreements with counterparty: check if ISDA Master Agreement includes payment netting provisions (Section 2(c)). 3. If master agreement exists, draft Payment Netting Amendment using ISDA standard template for FX settlements. 4. Coordinate legal negotiation with counterparty legal counsel covering: currencies in scope, payment threshold, default provisions. 5. Execute Payment Netting Agreement via DocuSign (typical 3-5 business day execution time). 6. Upload signed agreement to settlement systems for activation. 7. For immediate trade, accept gross settlement as netting not yet available. 8. Future trades automatically benefit from netting once agreement effective. 9. Extend netting framework to derivatives and repo settlements for maximum operational efficiency.',
19, '2025-11-05 14:14:00');

-- ============================================================================
-- Exception Set 30: Trade 36106022 - IRS, REJECTED
-- Issue: Notional schedule mismatch in amortizing swap
-- ============================================================================
INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
VALUES
(10030001, 36106022, '2024-01-17 09:42:30', 'OTCCHK', 'receive', 'REQUEST_CONSENT', 'CLEARED', '2024-01-17 09:42:30', 1),
(10030002, 36106022, '2024-01-17 09:46:18', 'TAS', 'send', 'CREDIT_CHECK', 'CLEARED', '2024-01-17 09:46:18', 2),
(10030003, 36106022, '2024-01-17 09:50:45', 'TAS', 'receive', 'CREDIT_APPROVE', 'CLEARED', '2024-01-17 09:50:45', 3),
(10030004, 36106022, '2024-01-17 09:54:22', 'OTCCHK', 'send', 'NOTIONAL_SCHEDULE_CHECK', 'REJECTED', '2024-01-17 09:54:22', 4);

INSERT INTO exceptions (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)
VALUES
(20030001, 36106022, 10030004, 'Amortizing swap notional schedule error: Trade confirmation shows 10-year amortizing IRS with annual notional reductions, but submitted schedule has payment date misalignment. Year 3 notional step-down date February 15, 2027 conflicts with quarterly payment schedule (March 15). LCH requires notional changes align with payment dates for operational processing.', 'MEDIUM', 'PENDING', 'Trading desk reconciling amortization schedule with payment frequency', '2024-01-17 09:55:40', '2024-01-17 09:55:40');

INSERT INTO solutions (id, exception_id, title, exception_description, reference_event, solution_description, scores, create_time)
VALUES
(30030001, 20030001, 'Align Amortization Schedule with Payment Date Convention',
'IRS trade credit approved (trans 10030003) but notional schedule validation (trans 10030004) rejected due to date misalignment. Amortizing swaps require notional step-downs coincide with cash flow payment dates.',
'Amortization schedule corrections processed in Q1 2024 with average 60-minute resolution through date alignment.',
'1. Review original trade confirmation showing amortization schedule: identify intended notional reduction pattern (e.g., $100M reducing by $10M annually). 2. Check IRS payment frequency and dates: confirm quarterly payments on 15th of March, June, September, December. 3. Align amortization dates to payment schedule: change Year 3 notional reduction from February 15 to March 15, 2027 (next payment date). 4. Verify all subsequent amortization dates match quarterly payment schedule throughout 10-year tenor. 5. Recalculate fixed rate if notional timing change affects present value (typically minimal impact of 1-30 days shift). 6. Contact counterparty to confirm amended amortization schedule with aligned dates. 7. Update trade economics in KINGSLANDING system with corrected notional schedule. 8. Resubmit clearing request with aligned payment and amortization dates. 9. Implement FpML validation rule requiring notional change dates match payment schedule for complex swaps.',
22, '2024-01-17 10:02:00');
