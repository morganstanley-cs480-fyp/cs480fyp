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
28, '2025-08-27 09:20:00');

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
