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
        INSERT INTO trade (
            trade_id,
            account,
            asset_type,
            booking_system,
            affirmation_system,
            clearing_house,
            create_time,
            update_time,
            status
        ) 
        VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(trade_id) DO UPDATE SET
            account = excluded.account,
            asset_type = excluded.asset_type,
            booking_system = excluded.booking_system,
            affirmation_system = excluded.affirmation_system,
            clearing_house = excluded.clearing_house,
            create_time = excluded.create_time,
            update_time = excluded.update_time,
            status = excluded.status;
    """, (
        trade.trade_id,
        trade.acc,
        trade.asset_type,
        trade.booking_system,
        trade.affirmation_system,
        trade.clearing_house,
        trade.create_time,
        trade.update_time,
        trade.status
    ))
    cursor.connection.commit()

def insertTransaction(cursor, trans):
    cursor.execute("""
        INSERT INTO TRANSACTIONS (
            trans_id,
            trade_id,
            create_time,
            entity,
            direction,
            type,
            status,
            update_time,
            step
        )
        VALUES (?,?,?,?,?,?,?,?,?);
    """, (
        trans.trans_id,
        trans.trade_id,
        trans.create_time,
        trans.entity,
        trans.direction,
        trans._type,
        trans.status,
        trans.update_time,
        trans.step
    ))
    cursor.connection.commit()

def insertException(cursor, expt):
    cursor.execute("""
        INSERT INTO EXCEPTION (
            exception_id,
            trade_id,
            trans_id,
            status,
            msg,
            comment,
            priority,
            create_time,
            update_time
        )
        VALUES (?,?,?,?,?,?,?,?,?);
    """, (
        expt.exception_id,
        expt.trade_id,
        expt.trans_id,
        expt.status,
        expt.msg,
        expt.comment,
        expt.priority,
        expt.create_time,
        expt.update_time
    ))
    cursor.connection.commit()

def getTradeById(cursor, trade_id):
    cursor.execute("""
        SELECT trade_id, account, asset_type, booking_system, affirmation_system, clearing_house, create_time, update_time, status
        FROM TRADE
        WHERE trade_id = ?;
    """, (trade_id,))
    row = cursor.fetchone()
    if not row:
        return None
    return Trade(
        trade_id=row[0],
        acc=row[1],
        asset_type=row[2],
        booking_system=row[3],
        affirmation_system=row[4],
        clearing_house=row[5],
        create_time=row[6],
        update_time=row[7],
        status=row[8]
    )
def tradeExists(cursor, trade_id):
    cursor.execute(
        "SELECT 1 FROM TRADE WHERE trade_id = ? LIMIT 1;",
        (trade_id,)
    )
    return cursor.fetchone() is not None

def transactionExists(cursor, trans_id):
    cursor.execute(
        "SELECT 1 FROM TRANSACTIONS WHERE trans_id = ? LIMIT 1;",
        (trans_id,)
    )
    return cursor.fetchone() is not None

def exceptionExists(cursor, exception_id):
    cursor.execute(
        "SELECT 1 FROM EXCEPTION WHERE exception_id = ? LIMIT 1;",
        (exception_id,)
    )
    return cursor.fetchone() is not None

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

def getAllMessages(cursor):
    result = []
    cursor.execute("SELECT * FROM TRADE;")
    trades = cursor.fetchall()

    for row in trades:
        result.append(
         Trade(
                 trade_id=row[0],
                 acc=row[1],
                 asset_type=row[2],
                 booking_system=row[3],
                 affirmation_system=row[4],
                 clearing_house=row[5],
                 create_time=row[6],
                 update_time=row[7],
                 status=row[8]
             )
        )
    
    cursor.execute("""SELECT * FROM TRANSACTIONS;""")
    transactions = cursor.fetchall()
    for tr in transactions:
        result.append(
        Transaction(
                    trans_id=tr[0],
                    trade_id=tr[1],
                    create_time=tr[2],
                    entity=tr[3],
                    direction=tr[4],
                    _type=tr[5],
                    status=tr[6],
                    update_time=tr[7],
                    step=tr[8]
                )
        )

    cursor.execute("""
        SELECT *
        FROM EXCEPTION;
    """)
    exceptions = cursor.fetchall()
    for ex in exceptions:
        result.append(
        TransException(
                    exception_id=ex[0],
                    trade_id=ex[1],
                    trans_id=ex[2],
                    status=ex[3],
                    msg=ex[4] if ex[4] else "",
                    comment=ex[5] if ex[5] else "",
                    priority=ex[6] if ex[6] else "",
                    create_time=ex[7],
                    update_time=ex[8]
                )
        )

    result.sort(key=lambda x: x.create_time)
    return result
