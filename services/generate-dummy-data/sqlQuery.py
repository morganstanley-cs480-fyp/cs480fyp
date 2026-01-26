import xml.etree.cElementTree as et
from random import randint
from constants import * 
from classes import *
import random
import time
from datetime import datetime
import sqlite3


def insertTrade(cursor, trade):
    cursor.execute("""
        INSERT INTO TRADE (trade_id,create_time,update_time, status) 
        VALUES (?,?,?,?);
    """, (trade.trade_id, trade.create_time, trade.update_time, trade.status))
    cursor.connection.commit()

def insertTransaction(cursor, trans):
    cursor.execute("""
        INSERT INTO TRANSACTIONS (trans_id, trade_id, create_time, update_time, step)
        VALUES (?,?,?,?,?);
    """,(trans.trans_id, trans.trade_id, trans.create_time, trans.update_time, trans.step))
    cursor.connection.commit()

def insertException(cursor, expt):
    cursor.execute("""
        INSERT INTO EXCEPTION (trade_id, trans_id,exception_id, create_time, update_time, status)
        VALUES (?,?,?,?,?,?);
    """,(expt.trade_id, expt.trans_id, expt.exception_id, expt.create_time, expt.update_time, expt.status))
    cursor.connection.commit() 
    
def getTradeUpdateTime(cursor, trade_id):
    cursor.execute("""
        SELECT update_time FROM TRADE WHERE trade_id = ?;
    """, (trade_id,))
    row = cursor.fetchone()
    return row[0] if row is not None else None
def getLatestTransactionCreateTime(cursor, trade_id):
    cursor.execute("""
        SELECT create_time FROM TRANSACTIONS WHERE trade_id = ? ORDER BY create_time DESC limit 1;
    """, (trade_id,))
    row = cursor.fetchone()
    return row[0] if row is not None else None

def getNextStep(cursor, trade_id):
    cursor.execute("""
        SELECT MAX(step) FROM TRANSACTIONS where trade_id = ?;
    """, (trade_id,))
    row = cursor.fetchone()
    # print("GET STEP: ", row)
    return row[0]+1 if row and row[0] is not None else 1

def isException(cursor, trade_id):
    cursor.execute("""
        SELECT exception_id FROM EXCEPTION where trade_id = ?
    """, (trade_id,))
    rows = cursor.fetchall()
    return True if len(rows) > 0 else False

def getAllTradeIDs(cursor):
    cursor.execute("""
        SELECT trade_id FROM TRADE 
    """)
    rows = cursor.fetchall()
    # print(len(rows))
    # print(rows)
    return rows
def getAllTransactionsIDs(cursor):
    cursor.execute("""
        SELECT trade_id,trans_id, create_time FROM TRANSACTIONS 
    """)
    rows = cursor.fetchall()
    return rows
# (To be confirmed) Depending on status, if it is alleged, that means trade is not completed yet/trade flow has not terminated
# Trade flow terminates when status is CLEARED, REJECTED, CANCELLED or one of the transaction encounters an exception
def isTradeAppendable(cursor, trade_id):
    hasExpt = isException(cursor,trade_id)
    if hasExpt:
        return False

    cursor.execute("""
        SELECT status from TRADE where trade_id = ?
    """, (trade_id,))
    row = cursor.fetchone()
    if row:
        if row[0] == "ALLEGED":
            return True
    return False
