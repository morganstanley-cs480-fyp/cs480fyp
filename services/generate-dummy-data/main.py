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
    expt = TransException(expt_id, trade_id,trans_id , "PENDING",msg, create_time, comment, random.choice(EXCEPTION_PRIORITY_LS), update_time)
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
    # print(step)
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
            print("transaction created")

        curr_entities["booking_system"] = random.choice(BOOKING_SYSTEM_LS)
        curr_entities["clearing_house"] = random.choice(CLEARING_HOUSE_LS)
    # print(len(MESSAGE_QUEUE))
    writeAll("TESTTEST.xml")





def writeToXML(root, fname):
    fname = next_available_xml(fname)
    tree = et.ElementTree(root)
    et.indent(tree, space="\t", level=0)
    tree.write(fname, encoding="utf-8")

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
    for trade in TRADES_INIT:
        insertTrade(cursor,trade)
    for trs in TRANSACTION_INIT:
        insertTransaction(cursor, trs)
    for expt in EXCEPTION_INIT:
        insertException(cursor, expt)
    ls = getAllMessages(cursor)
    # !!! enable for production data
    # ls.sort(key=lambda x: x.create_time)
    writeAll("2Test.xml",ls)



# from TestCases import *
if __name__ == "__main__":
    main()
