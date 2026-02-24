import xml.etree.cElementTree as et
from random import randint
from constants import * 
from classes import *
from sqlQuery import *
from config import *
import random
import time
from datetime import datetime
import sqlite3
from pathlib import Path
import re
import xml.etree.ElementTree as et

BASE_DIR = Path(__file__).resolve().parent

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
    global CURRENT_CREATED_TRADE
    trade_id = RandNum(8)
    create_date = random_date(AUG2025,OCT2025)
    trade = Trade(trade_id, RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), create_date,create_date, "ALLEGED")
    CURRENT_CREATED_TRADE.append(trade)
    insertTrade(cursor, trade)
    print(f"Trade {trade_id} created")
    return trade 

def addTransactionToTrade(cursor, trade_id):
    global CURRENT_CREATED_TRANSACTIONS
    trans_id = RandNum(8)
    # trade_update_time = getTradeUpdateTime(cursor,trade_id)
    # trans_create_time = random_date(trade_update_time, OCT2025)
    
    trans_create_time = getLatestTransactionCreateTime(cursor, trade_id)
    if not trans_create_time:
        trans_create_time = getTradeUpdateTime(cursor, trade_id)
    if isException(cursor, trade_id):
        print("Exception for:", trade_id, " Not generating transaction")
        # createException(cursor, trans_create_time, trade_id, trans_id)
        return -1
    step = getNextStep(cursor, trade_id)
    status = random.choice(TRANSACTION_STATUS_LS)
    trans = Transaction(trans_id, trade_id, trans_create_time, random.choice(ENTITY_LS), random.choice(["RECEIVE", "SEND"]), \
                        random.choice(TRANS_TYPE_LS),status, trans_create_time, step)
    CURRENT_CREATED_TRANSACTIONS.append(trans)
    insertTransaction(cursor,trans)

    print(f"Transaction '{trans_id}' added to Trade {trade_id}")
    return trans 

def createException(cursor,create_time ,trade_id, trans_id):
    global CURRENT_CREATED_EXCEPTION

    if isException(cursor, trade_id):
        print("Trade id:", trade_id , "already has a exception")
        return -1

    expt_id = RandNum(8)
    msg = random.choice(EXCEPTION_MSG_LS)
    comment = random.choice(EXCEPTION_COMMENT_LS)
    if msg == "MAPPING ISSUE":
        comment = "NO MAPPING"
    # update_time = random_date(create_time, OCT2025)
    update_time = create_time  # initial update time of the exception is same as create time 
    expt = TransException(trade_id, trans_id, expt_id, "PENDING",msg, create_time, comment, random.choice(EXCEPTION_PRIORITY_LS), update_time)
    CURRENT_CREATED_EXCEPTION.append(expt)

    print(f"Exception created for trade id:{trade_id}, transaction_id:{trans_id}")
    insertException(cursor, expt)
    return expt 

def writeToXML(root, fname):
    fname = next_available_xml(fname)
    tree = et.ElementTree(root)
    et.indent(tree, space="\t", level=0)
    tree.write(fname, encoding="utf-8")

def appendRoot(root, ls):
    for child in ls:
        root.append(child.getXMLTreeRoot())
def writeAll(fname):
    global CURRENT_CREATED_TRADE, CURRENT_CREATED_TRANSACTIONS, CURRENT_CREATED_EXCEPTION
    root = et.Element("root")
    appendRoot(root, CURRENT_CREATED_TRADE)
    appendRoot(root, CURRENT_CREATED_TRANSACTIONS)
    appendRoot(root, CURRENT_CREATED_EXCEPTION)
    writeToXML(root, fname)

def main():
    cursor = connectToDb(DBNAME)
    # cursor.execute("DROP TABLE IF EXISTS TRADE")
    # cursor.execute("DROP TABLE IF EXISTS TRANSACTIONS")
    # cursor.execute("DROP TABLE IF EXISTS EXCEPTION")
    cursor.execute(CREATE_TRADE_TABLE)
    cursor.execute(CREATE_TRANSACTIONS_TABLE)
    cursor.execute(CREATE_EXCEPTION_TABLE)

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

    writeAll("data.xml")

if __name__ == "__main__":
    main()
