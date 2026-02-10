from main import * 
from constants import *
from classes import *
from sqlQuery import *
import yaml


def getYaml(caseNum):
    with open("allcases.yml") as stream:
        try:
            return yaml.safe_load(stream)['Cases'][caseNum]
        except Exception as e:
            print("Error when reading yaml")
            print(e)

def Case1():
    print("creating case1")
    yml = getYaml("Case1")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(RandNum(8), RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), start_date,start_date, "CLEARED")
    trade_ls = []
    trade_ls.append(trade)
    trans_ls = []
    
    for i,edge in enumerate(yml):
        # trans_create_time = random_date(start_date, OCT2025)
        trans_create_time = add_seconds(start_date, 5 * 60 * random.random())
        trans = Transaction(RandNum(8), trade.trade_id, trans_create_time, edge['name'], edge['direction'], \
                            edge['type'], edge['status'], trans_create_time, i+1) 
        start_date = trans_create_time
        trans_ls.append(trans)
        insertTransaction(cursor, trans)
    root = et.Element("Root")

    # trade.update_time = start_date
    insertTrade(cursor, trade)
    appendRoot(root, trade_ls)
    appendRoot(root, trans_ls)
    writeToXML(root, "case1.xml")
    

def Case2():
    print("creating case2")
    yml = getYaml("Case2")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(RandNum(8), RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), start_date,start_date, "CLEARED")
    trade_ls = []
    trade_ls.append(trade)
    trans_ls = []
    
    for i,edge in enumerate(yml):
        trans_create_time = add_seconds(start_date, 5 * 60 * random.random())
        trans = Transaction(RandNum(8), trade.trade_id, trans_create_time, edge['name'], edge['direction'], \
                            edge['type'], edge['status'], trans_create_time, i+1) 
        start_date = trans_create_time
        trans_ls.append(trans)
        insertTransaction(cursor, trans)
    root = et.Element("Root")

    # trade.update_time = start_date
    insertTrade(cursor, trade)
    appendRoot(root, trade_ls)
    appendRoot(root, trans_ls)
    writeToXML(root, "case2.xml")
        
    
def Case3():
    print("creating case3")
    yml = getYaml("Case3")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(RandNum(8), RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), start_date,start_date, "PENDING")
    trade_ls = []
    trade_ls.append(trade)
    trans_ls = []
    
    for i,edge in enumerate(yml):
        trans_create_time = add_seconds(start_date, 5 * 60 * random.random())
        trans = Transaction(RandNum(8), trade.trade_id, trans_create_time, edge['name'], edge['direction'], \
                            edge['type'], edge['status'], trans_create_time, i+1) 
        start_date = trans_create_time
        trans_ls.append(trans)
        insertTransaction(cursor, trans)

    # EXCEPTION_MSG_LS=["MISSING BIC", "INSUFFICIENT MARGIN", "TIME OUT OF RANGE", "MAPPING ISSUE"]
    # EXCEPTION_COMMENT_LS=["RETRY LIMIT EXCEEDED", "NO BIC", "NO MAPPING"]
    # EXCEPTION_PRIORITY_LS=["LOW","MEDIUM","HIGH"]
    start_date = add_seconds(start_date, 60)
    expt = TransException(trade.trade_id, trans_ls[-1].trans_id, RandNum(8), "PENDING","INSUFFICIENT MARGIN" , start_date, "NO BIC", random.choice(EXCEPTION_PRIORITY_LS), start_date)
    trans_ls.append(expt)
    root = et.Element("Root")

    # trade.update_time = start_date
    insertException(cursor, expt)
    insertTrade(cursor, trade)
    appendRoot(root, trade_ls)
    appendRoot(root, trans_ls)
    writeToXML(root, "case3.xml")

def Case4():
    print("creating case4")
    yml = getYaml("Case4")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(RandNum(8), RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), start_date,start_date, "PENDING")
    trade_ls = []
    trade_ls.append(trade)
    trans_ls = []
    
    for i,edge in enumerate(yml):
        trans_create_time = add_seconds(start_date, 5 * 60 * random.random())
        trans = Transaction(RandNum(8), trade.trade_id, trans_create_time, edge['name'], edge['direction'], \
                            edge['type'], edge['status'], trans_create_time, i+1) 
        start_date = trans_create_time
        trans_ls.append(trans)
        insertTransaction(cursor, trans)

    # EXCEPTION_MSG_LS=["MISSING BIC", "INSUFFICIENT MARGIN", "TIME OUT OF RANGE", "MAPPING ISSUE"]
    # EXCEPTION_COMMENT_LS=["RETRY LIMIT EXCEEDED", "NO BIC", "NO MAPPING"]
    # EXCEPTION_PRIORITY_LS=["LOW","MEDIUM","HIGH"]
    start_date = add_seconds(start_date, 60)
    expt = TransException(trade.trade_id, trans_ls[-1].trans_id, RandNum(8), "PENDING","MISSING BIC" , start_date, "NO BIC", random.choice(EXCEPTION_PRIORITY_LS), start_date)
    trans_ls.append(expt)
    root = et.Element("Root")

    # trade.update_time = start_date
    insertException(cursor,expt)
    insertTrade(cursor, trade)
    appendRoot(root, trade_ls)
    appendRoot(root, trans_ls)
    writeToXML(root, "case4.xml")

def Case5():
    print("creating case5")
    yml = getYaml("Case5")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(RandNum(8), RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), start_date,start_date, "PENDING")
    trade_ls = []
    trade_ls.append(trade)
    trans_ls = []
    
    for i,edge in enumerate(yml):
        trans_create_time = add_seconds(start_date, 5 * 60 * random.random())
        trans = Transaction(RandNum(8), trade.trade_id, trans_create_time, edge['name'], edge['direction'], \
                            edge['type'], edge['status'], trans_create_time, i+1) 
        start_date = trans_create_time
        trans_ls.append(trans)
        insertTransaction(cursor, trans)

    # EXCEPTION_MSG_LS=["MISSING BIC", "INSUFFICIENT MARGIN", "TIME OUT OF RANGE", "MAPPING ISSUE"]
    # EXCEPTION_COMMENT_LS=["RETRY LIMIT EXCEEDED", "NO BIC", "NO MAPPING"]
    # EXCEPTION_PRIORITY_LS=["LOW","MEDIUM","HIGH"]
    start_date = add_seconds(start_date, 60)
    expt = TransException(trade.trade_id, trans_ls[-1].trans_id, RandNum(8), "PENDING","MAPPING ISSUE" , start_date, "NO MAPPING FOR KINGSLANDING", random.choice(EXCEPTION_PRIORITY_LS), start_date)
    trans_ls.append(expt)
    root = et.Element("Root")

    # trade.update_time = start_date
    insertException(cursor, expt)
    insertTrade(cursor, trade)
    appendRoot(root, trade_ls)
    appendRoot(root, trans_ls)
    writeToXML(root, "case5.xml")
Case1()
Case2()
Case3()
Case4()
Case5()
    # cursor = connectToDb(DBNAME)
    # trade = createTrade(cursor)
    # for _ in range(20):
    #     addTransactionToTrade(cursor, trade.trade_id)


    
