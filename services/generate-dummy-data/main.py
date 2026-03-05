import xml.etree.cElementTree as et
from random import randint
from constants import * 
from classes import *
from sqlQuery import *
from config import *
import random
import time
import sqlite3
from pathlib import Path
import re
import xml.etree.ElementTree as et
from InitData import *

BASE_DIR = Path(__file__).resolve().parent

# Set random seed
random.seed(42)

def next_available_xml(fname: str) -> str:
    path = (BASE_DIR / fname).resolve()

    if not path.exists():
        return str(path)

    stem = path.stem
    suffix = path.suffix
    base = re.sub(r"-\d+$", "", stem)

    i = 1
    while True:
        candidate = path.with_name(f"{base}-{i}{suffix}")
        if not candidate.exists():
            return str(candidate)
        i += 1

CURRENT_CREATED_TRANSACTIONS=[]
CURRENT_CREATED_TRADE=[]
CURRENT_CREATED_EXCEPTION=[]
MESSAGE_QUEUE=[]
def setup_tables(cursor):
    cursor.execute(CREATE_TRADE_TABLE)
    cursor.execute(CREATE_TRANSACTIONS_TABLE)
    cursor.execute(CREATE_EXCEPTION_TABLE)
def connectToDb(name):
    db_path = BASE_DIR / name
    cursor = sqlite3.connect(db_path).cursor()
    setup_tables(cursor)
    return cursor

def str_time_prop(start, end, time_format, prop):
    stime = time.mktime(time.strptime(start, time_format))
    etime = time.mktime(time.strptime(end, time_format))

    ptime = stime + prop * (etime - stime)

    return time.strftime(time_format, time.localtime(ptime))

def random_date(start, end, prop=None):
    # YYYY-MM-DDTHH:MM:SS      (isoformat without microseconds)
    prop = random.random()
    return str_time_prop(start, end, '%Y-%m-%dT%H:%M:%S', prop)
    
def add_seconds(start, seconds):
    time_format = '%Y-%m-%dT%H:%M:%S'
    stime = time.mktime(time.strptime(start, time_format))
    ptime = stime + seconds
    return time.strftime(time_format, time.localtime(ptime))

def RandNum(n):
    start = 10 ** (n-1)
    end = (10 ** n)-1
    return randint(start, end)
def RandAccNum():
    return "ACC" + str(RandNum(4))


def createTrade(cursor):
    global MESSAGE_QUEUE
    trade_id = RandNum(8)
    while(tradeExists(cursor, trade_id)):
        trade_id = RandNum(8)
    create_date = random_date(AUG2025,OCT2025)
    trade = Trade(trade_id, RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), create_date,create_date, "ALLEGED")
    MESSAGE_QUEUE.append(trade)
    insertTrade(cursor, trade)
    print(f"Trade {trade_id} created")
    return trade 

def addTransactionToTrade(cursor, trade_id):
    global MESSAGE_QUEUE 
    trans_id = RandNum(8)
    while(transactionExists(cursor,trans_id)):
        trans_id = RandNum(8)
    
    trans_create_time = getLatestTransactionCreateTime(cursor, trade_id)
    if not trans_create_time:
        trans_create_time = getTradeUpdateTime(cursor, trade_id)
    trans_create_time = add_seconds(trans_create_time, 120)
    if isException(cursor, trade_id):
        print("Exception for:", trade_id, " Not generating transaction")
        return -1
    step = getNextStep(cursor, trade_id)
    status = random.choice(TRANSACTION_STATUS_LS)
    trans = Transaction(trans_id, trade_id, trans_create_time, random.choice(ENTITY_LS), random.choice(["RECEIVE", "SEND"]), \
                        random.choice(TRANS_TYPE_LS),status, trans_create_time, step)
    MESSAGE_QUEUE.append(trans)
    insertTransaction(cursor,trans)

    print(f"Transaction '{trans_id}' added to Trade {trade_id}")
    return trans 

def createException(cursor,create_time ,trade_id, trans_id):
    global MESSAGE_QUEUE 

    if isException(cursor, trade_id):
        print("Trade id:", trade_id , "already has a exception")
        return -1

    expt_id = RandNum(8)
    while(exceptionExists(cursor, expt_id)):
        expt_id = RandNum(8)
    msg = random.choice(EXCEPTION_MSG_LS)
    comment = random.choice(EXCEPTION_COMMENT_LS)
    if msg == "MAPPING ISSUE":
        comment = "NO MAPPING"
    # update_time = random_date(create_time, OCT2025)
    create_time = add_seconds(create_time, 60)
    update_time = create_time  # initial update time of the exception is same as create time 
    expt = TransException(expt_id, trade_id,trans_id ,msg, random.choice(EXCEPTION_PRIORITY_LS), "PENDING", comment, create_time ,update_time)
    MESSAGE_QUEUE.append(expt)

    print(f"Exception created for trade id:{trade_id}, transaction_id:{trans_id}")
    insertException(cursor, expt)
    return expt 

def simulate_cleared_trade(cursor, trade_id, length=10, otherStatus=None):
    global MESSAGE_QUEUE
    trade = getTradeById(cursor,trade_id)
    if not trade:
        print("Trade not found")
        return
    created_transactions = []

    last_time = getLatestTransactionCreateTime(cursor, trade_id)
    if not last_time:
        last_time = getTradeUpdateTime(cursor, trade_id)
    step = getNextStep(cursor, trade_id)
    curr_entities = {
        "booking_system": trade.booking_system,
        "clearing_house":trade.clearing_house,
        "TAS": "TAS"
    }
    while(length > step):
        for direction, trans_type, entity in CLEARED_FLOW_SEQUENCE:
            if(step > length):
                break

            last_time = add_seconds(last_time, random.randint(20, 180))
            trans_id = RandNum(8)
            while(transactionExists(cursor,trans_id)):
                trans_id = RandNum(8)
            entity = curr_entities[entity]

            transaction = Transaction(
                trans_id,
                trade_id,
                last_time,
                entity,
                direction,
                trans_type,
                "CLEARED",
                last_time,
                step
            )

            if otherStatus and step == length:
                transaction.status = otherStatus

            step += 1
            insertTransaction(cursor, transaction)
            MESSAGE_QUEUE.append(transaction)
            created_transactions.append(transaction)
            # print("transaction created")

        curr_entities["booking_system"] = random.choice(BOOKING_SYSTEM_LS)
        curr_entities["clearing_house"] = random.choice(CLEARING_HOUSE_LS)
    # print(len(MESSAGE_QUEUE))
    # writeAll("TESTTEST.xml")

def add_transaction_for_additional_exception_cases(cursor, trade_id, start_trans_id, length, status, last_type):
    global MESSAGE_QUEUE
    trade = getTradeById(cursor,trade_id)
    if not trade:
        print("Trade not found")
        return
    created_transactions = []

    last_time = getLatestTransactionCreateTime(cursor, trade_id)
    if not last_time:
        last_time = getTradeUpdateTime(cursor, trade_id)
    step = getNextStep(cursor, trade_id)
    curr_entities = {
        "booking_system": trade.booking_system,
        "clearing_house":trade.clearing_house,
        "TAS": "TAS"
    }
    while(length > step):
        for direction, trans_type, entity in CLEARED_FLOW_SEQUENCE:
            if(step > length):
                break
            last_time = add_seconds(last_time, random.randint(20, 180))
            entity = curr_entities[entity]

            transaction = Transaction(
                start_trans_id,
                trade_id,
                last_time,
                entity,
                direction,
                trans_type,
                "CLEARED",
                last_time,
                step
            )
            if step == length:
                transaction.status = status
                transaction._type = last_type

            step += 1
            start_trans_id +=1
            insertTransaction(cursor, transaction)
            MESSAGE_QUEUE.append(transaction)
            created_transactions.append(transaction)

        curr_entities["booking_system"] = random.choice(BOOKING_SYSTEM_LS)
        curr_entities["clearing_house"] = random.choice(CLEARING_HOUSE_LS)



def writeToXML(root, fname):
    fname = next_available_xml(fname)
    tree = et.ElementTree(root)
    et.indent(tree, space="\t", level=0)
    tree.write(fname, encoding="utf-8")
    print(f"writing to: {fname}")

def appendRoot(root, ls):
    for child in ls:
        root.append(child.getXMLTreeRoot())
def writeAll(fname, ls=MESSAGE_QUEUE):
    global MESSAGE_QUEUE
    root = et.Element("root")
    appendRoot(root,ls)
    writeToXML(root, fname)

def create_randomised_messages(cursor):
    num_trades = NUM_TRADES
    num_transactions = NUM_TRANSACTIONS
    num_exceptions = NUM_EXCEPTIONS


    for _ in range(num_trades):
        createTrade(cursor)

    all_trades = getAllTradeIDs(cursor)
    if len(all_trades) > 0:
        for _ in range(num_transactions):
            # addTransactionToTrade(cursor, random.choice(CURRENT_CREATED_TRADE).trade_id)
            addTransactionToTrade(cursor, random.choice(all_trades)[0])
    else:
        print("No trades found")

    all_transactions = getAllTransactionsIDs(cursor)
    if len(all_transactions) > 0:
        for _ in range(num_exceptions):
            trns = random.choice(all_transactions)
            createException(cursor, trns[2], trns[0], trns[1])
    else:
        print("Not transactions found")
    global MESSAGE_QUEUE
    MESSAGE_QUEUE.sort(key=lambda x: x.create_time)
    writeAll("data.xml")

from collections import Counter

def countMessageTypes(messages):
    counter = Counter(type(msg).__name__ for msg in messages)

    return {
        "trades": counter.get("Trade", 0),
        "transactions": counter.get("Transaction", 0),
        "exceptions": counter.get("TransException", 0)
    }
def countTradeStatuses(messages):
    status_counts = {}

    for msg in messages:
        if isinstance(msg, Trade):
            status = msg.status
            status_counts[status] = status_counts.get(status, 0) + 1

    return status_counts
def clone_trade(trade):
    return Trade(
        trade.trade_id,
        trade.acc,
        trade.asset_type,
        trade.booking_system,
        trade.affirmation_system,
        trade.clearing_house,
        trade.create_time,
        trade.update_time,
        trade.status
    )
def main():
    cursor = connectToDb(DBNAME)
    cursor.execute("DROP TABLE IF EXISTS TRADE")
    cursor.execute("DROP TABLE IF EXISTS TRANSACTIONS")
    cursor.execute("DROP TABLE IF EXISTS EXCEPTION")
    cursor.execute(CREATE_TRADE_TABLE)
    cursor.execute(CREATE_TRANSACTIONS_TABLE)
    cursor.execute(CREATE_EXCEPTION_TABLE)
    
    # Create random data
    # create_randomised_messages(cursor)
    global MESSAGE_QUEUE

    for trade in TRADES_INIT:
        prev_status = trade.status
        trade.update_time = trade.create_time
        trade.status = "ALLEGED"
        insertTrade(cursor,trade)
        
        MESSAGE_QUEUE.append(trade)
        if trade.status == "CLEARED":
            simulate_cleared_trade(cursor, trade.trade_id, length=20)
        
        elif trade.status == "ALLEGED":
            simulate_cleared_trade(cursor, trade.trade_id, length=17, otherStatus="ALLEGED")
        else:
            simulate_cleared_trade(cursor, trade.trade_id, length=13, otherStatus=trade.status)
        update_trade = clone_trade(trade)
        update_time = getLatestTransactionCreateTime(cursor, trade.trade_id)
        update_trade.update_time = update_time
        update_trade.status = prev_status
        MESSAGE_QUEUE.append(update_trade)

    for trs in TRANSACTION_INIT:
        MESSAGE_QUEUE.append(trs)
        insertTransaction(cursor, trs)
    for trade in RESERVED_TRADES_INIT:
        MESSAGE_QUEUE.append(trade)
        insertTrade(cursor,trade)
        # simulate_cleared_trade(cursor, trade.trade_id, length=5, otherStatus="REJECTED")
   
    #Additional Exceptions
    add_transaction_for_additional_exception_cases(cursor, 77194044, 10001001, 5, "REJECTED", "REGULATORY_REPORT")
    add_transaction_for_additional_exception_cases(cursor, 60724962, 10002001, 5, "REJECTED","COLLATERAL_CALL")
    add_transaction_for_additional_exception_cases(cursor, 86836834, 10003001, 4, "REJECTED", "LEGAL_DOC_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 77186642, 10004001, 5, "REJECTED", "SSI_VALIDATION")
    add_transaction_for_additional_exception_cases(cursor, 61270683, 10005001, 4, "REJECTED", "SETTLEMENT_DATE_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 98962729, 10006001, 5, "REJECTED", "REFERENCE_ENTITY_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 25399440, 10007001, 4, "REJECTED", "RATE_VALIDATION")
    add_transaction_for_additional_exception_cases(cursor, 53850480, 10008001, 5, "REJECTED", "NOTIONAL_LIMIT_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 89369810, 10009001, 5, "REJECTED", "WWR_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 99202386, 10010001, 5, "REJECTED", "IM_REQUIREMENT")
    add_transaction_for_additional_exception_cases(cursor, 69269882, 10011001, 5, "REJECTED", "PAYMENT_INSTRUCTION")
    add_transaction_for_additional_exception_cases(cursor, 42511774, 10012001, 3, "REJECTED", "CREDIT_DOWNGRADE_ALERT")
    add_transaction_for_additional_exception_cases(cursor, 48712564, 10013001, 5, "REJECTED", "SUCCESSION_EVENT_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 14355627, 10014001, 4, "REJECTED", "CAPITAL_FLOW_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 88531321, 10015001, 5, "REJECTED", "RATE_VALIDATION")
    add_transaction_for_additional_exception_cases(cursor, 54146216, 10016001, 5, "REJECTED", "LEI_VALIDATION")
    add_transaction_for_additional_exception_cases(cursor, 72427554, 10017001, 5, "REJECTED", "AML_SCREENING")
    add_transaction_for_additional_exception_cases(cursor, 56535550, 10018001, 5, "REJECTED", "BOOKING_CONFIRMATION")
    add_transaction_for_additional_exception_cases(cursor, 67515456, 10019001, 5, "REJECTED", "INDEX_VERSION_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 81930671, 10020001, 5, "REJECTED", "SSI_COMPLETENESS")
    add_transaction_for_additional_exception_cases(cursor, 64737734, 10021001, 3, "REJECTED", "CLEARING_ELIGIBILITY")
    add_transaction_for_additional_exception_cases(cursor, 69755320, 10022001, 4, "REJECTED", "MATURITY_VALIDATION")
    add_transaction_for_additional_exception_cases(cursor, 66663488, 10023001, 5, "REJECTED", "DUAL_CURRENCY_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 15706882, 10024001, 5, "REJECTED", "PORTFOLIO_RECON")
    add_transaction_for_additional_exception_cases(cursor, 96904486, 10025001, 4, "REJECTED", "DELIVERABLE_OBLIGATION_CHECK")
    add_transaction_for_additional_exception_cases(cursor, 49964172, 10026001, 4, "REJECTED", "VALUE_DATE_VALIDATION")
    add_transaction_for_additional_exception_cases(cursor, 42668494, 10027001, 3, "REJECTED", "CREDIT_LINE_EXCEEDED")
    add_transaction_for_additional_exception_cases(cursor, 98159040, 10028001, 5, "REJECTED", "AFFIRMATION_TIMEOUT")
    add_transaction_for_additional_exception_cases(cursor, 27625806, 10029001, 5, "REJECTED", "NETTING_ELIGIBILITY")
    add_transaction_for_additional_exception_cases(cursor, 36106022, 10030001, 4, "REJECTED", "NOTIONAL_SCHEDULE_CHECK")

    add_transaction_for_additional_exception_cases(cursor, 33154292, 10031001, 7, "REJECTED", "TRADE_CAPTURE_MISMATCH")
    add_transaction_for_additional_exception_cases(cursor, 36349602, 10032001, 5, "REJECTED", "CCP_MARGIN_MODEL_UPDATE")
    add_transaction_for_additional_exception_cases(cursor, 85373053, 10033001, 5, "REJECTED", "EMIR_REPORTING_FAILURE")
    add_transaction_for_additional_exception_cases(cursor, 76689540, 10034001, 3, "REJECTED", "PORTFOLIO_LIMIT_BREACH")
    add_transaction_for_additional_exception_cases(cursor, 76369566, 10035001, 5, "REJECTED", "CROSS_MARGIN_INELIGIBLE")
    add_transaction_for_additional_exception_cases(cursor, 73847580, 10036001, 8, "REJECTED", "COLLATERAL_INELIGIBLE_SECURITY")
    add_transaction_for_additional_exception_cases(cursor, 17194044, 10037001, 4, "REJECTED", "TRADE_COMPRESSION_CONFLICT")
    add_transaction_for_additional_exception_cases(cursor, 58392014, 10038001, 5, "REJECTED", "DEFAULT_FUND_CONTRIBUTION_SHORTFALL")
    add_transaction_for_additional_exception_cases(cursor, 50899479, 10039001, 3, "REJECTED", "TRADE_CONFIRMATION_DISPUTE")
    add_transaction_for_additional_exception_cases(cursor, 87339954, 10040001, 4, "REJECTED", "BACKLOADING_VALIDATION_FAILURE")

    for expt in EXCEPTION_INIT:
        MESSAGE_QUEUE.append(expt)
        insertException(cursor, expt)

    MESSAGE_QUEUE.sort(
        key=lambda x: x.update_time or x.create_time
    )
    
    print(f"length: {len(MESSAGE_QUEUE)}")
    writeAll("data.xml",MESSAGE_QUEUE)

    counts = countMessageTypes(MESSAGE_QUEUE)
    print("Trades:", counts["trades"])
    print("Transactions:", counts["transactions"])
    print("Exceptions:", counts["exceptions"])
    counts = countTradeStatuses(MESSAGE_QUEUE)

    for status, count in counts.items():
        print(f"{status}: {count}")



# from TestCases import *
if __name__ == "__main__":
    main()
