import xml.etree.cElementTree as et
from random import randint
from constants import * 
from classes import *
from sqlQuery import *
import random
import time
from datetime import datetime
import sqlite3
from pathlib import Path
import re

def next_available_xml(fname: str) -> str:
    path = Path(fname)
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
def connectToDb(name):
    return sqlite3.connect(name).cursor()

def str_time_prop(start, end, time_format, prop):
    stime = time.mktime(time.strptime(start, time_format))
    etime = time.mktime(time.strptime(end, time_format))

    ptime = stime + prop * (etime - stime)

    return time.strftime(time_format, time.localtime(ptime))

def random_date(start, end, prop=None):
    # YYYY-MM-DDTHH:MM:SS      (isoformat without microseconds)
    prop = random.random()
    return str_time_prop(start, end, '%Y-%m-%dT%H:%M:%S', prop)
    
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
    return trade_id

def addTransactionToTrade(cursor, trade_id):
    global CURRENT_CREATED_TRANSACTIONS
    trans_id = RandNum(8)
    # trade_update_time = getTradeUpdateTime(cursor,trade_id)
    # trans_create_time = random_date(trade_update_time, OCT2025)
    
    trans_create_time = getLatestTransactionCreateTime(cursor, trade_id)
    if not trans_create_time:
        trans_create_time = getTradeUpdateTime(cursor, trade_id)
    if isException(cursor, trade_id):
        print("Exception for:", trade_id, " Not generating exception")
        # createException(cursor, trans_create_time, trade_id, trans_id)
        return
    step = getNextStep(cursor, trade_id)
    status = random.choice(TRANSACTION_STATUS_LS)
    trans = Transaction(trans_id, trade_id, trans_create_time, random.choice(ENTITY_LS), random.choice(["RECEIVE", "SEND"]), \
                        random.choice(TRANS_TYPE_LS),status, trans_create_time, step)
    CURRENT_CREATED_TRANSACTIONS.append(trans)
    insertTransaction(cursor,trans)
    if(status == "EXCEPTION"):
        createException(cursor, trans_create_time, trade_id, trans_id)
    return trans_id

def createException(cursor,create_time ,trade_id, trans_id):
    global CURRENT_CREATED_EXCEPTION
    expt_id = RandNum(8)
    msg = random.choice(EXCEPTION_MSG_LS)
    comment = random.choice(EXCEPTION_COMMENT_LS)
    if msg == "MAPPING ISSUE":
        comment = "NO MAPPING"
    # update_time = random_date(create_time, OCT2025)
    update_time = create_time  # initial update time of the exception is same as create time 
    expt = TransException(trade_id, trans_id, expt_id, "PENDING",msg, create_time, comment, random.choice(EXCEPTION_PRIORITY_LS), update_time)
    CURRENT_CREATED_EXCEPTION.append(expt)
    insertException(cursor, expt)
    return expt_id

def writeToXML(root, ls, fname):
    fname = next_available_xml(fname)
    for n in ls:
        root.append(n.getXMLTreeRoot())
    tree = et.ElementTree(root)
    et.indent(tree, space="\t", level=0)
    tree.write(fname, encoding="utf-8")

def writeTradeToXML():
    global CURRENT_CREATED_TRADE
    root = et.Element("Trades")
    writeToXML(root, CURRENT_CREATED_TRADE, "Trades.xml")

def writeTransactionsToXML():
    global CURRENT_CREATED_TRANSACTIONS 
    root = et.Element("Transactions")
    writeToXML(root, CURRENT_CREATED_TRANSACTIONS, "Transactions.xml")

def writeExceptionsToXML():
    global CURRENT_CREATED_EXCEPTION
    if len(CURRENT_CREATED_EXCEPTION) == 0:
        print("No exceptions generated")
        return
    root = et.Element("Exceptions")
    writeToXML(root, CURRENT_CREATED_EXCEPTION, "Exceptions.xml")
cursor = connectToDb(DBNAME)
# cursor.execute("DROP TABLE IF EXISTS TRADE")
# cursor.execute("DROP TABLE IF EXISTS TRANSACTIONS")
# cursor.execute("DROP TABLE IF EXISTS EXCEPTION")
cursor.execute(CREATE_TRADE_TABLE)
cursor.execute(CREATE_TRANSACTIONS_TABLE)
cursor.execute(CREATE_EXCEPTION_TABLE)



num_trades = 3
num_transactions = num_trades * 8

for i in range(num_trades):
    createTrade(cursor)

for i in range(num_transactions):
    addTransactionToTrade(cursor, random.choice(CURRENT_CREATED_TRADE).trade_id)

cursor.execute("SELECT * FROM trade")
rows = cursor.fetchall()
print("printing trade rows")
for row in rows:
    print(row)


cursor.execute("SELECT * FROM transactions")
rows = cursor.fetchall()
print("printing transactions rows")
for row in rows:
    print(row)

cursor.execute("SELECT * FROM exception")
rows = cursor.fetchall()
print("printing exception rows")
for row in rows:
    print(row)
# CURRENT_CREATED_TRADE[0].printstuff()
writeTradeToXML()
writeTransactionsToXML()
writeExceptionsToXML()





