from main import * 
from constants import *
from classes import *
from sqlQuery import *
import yaml
import os

def getYaml(caseNum):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    yaml_path = os.path.join(base_dir, "allcases.yml")

    with open(yaml_path, "r") as stream:
        try:
            return yaml.safe_load(stream)["Cases"][caseNum]
        except Exception as e:
            print("Error when reading yaml")
            print(e)

COMMON_ROOT=et.Element("root")
def Case1():
    print("creating case1")
    yml = getYaml("Case1")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(10000001, RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
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
    insertTrade(cursor, trade)
    global COMMON_ROOT
    appendRoot(COMMON_ROOT, trade_ls)
    appendRoot(COMMON_ROOT, trans_ls)
    

def Case2():
    print("creating case2")
    yml = getYaml("Case2")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(10000002, RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
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

    insertTrade(cursor, trade)
    global COMMON_ROOT
    appendRoot(COMMON_ROOT, trade_ls)
    appendRoot(COMMON_ROOT, trans_ls)
        
    
def Case3():
    print("creating case3")
    yml = getYaml("Case3")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(10000003, RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), start_date,start_date, "ALLEGED")
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
    start_date = add_seconds(start_date, 60)
    expt = TransException(RandNum(8),trade.trade_id, trans_ls[-1].trans_id,  "PENDING","INSUFFICIENT MARGIN" , start_date, "NO BIC", random.choice(EXCEPTION_PRIORITY_LS), start_date)
    trans_ls.append(expt)

    insertException(cursor, expt)
    insertTrade(cursor, trade)
    global COMMON_ROOT
    appendRoot(COMMON_ROOT, trade_ls)
    appendRoot(COMMON_ROOT, trans_ls)

def Case4():
    print("creating case4")
    yml = getYaml("Case4")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(10000004, RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), start_date,start_date, "ALLEGED")
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

    start_date = add_seconds(start_date, 60)
    expt = TransException(RandNum(8),trade.trade_id, trans_ls[-1].trans_id,  "PENDING","MISSING BIC" , start_date, "NO BIC", random.choice(EXCEPTION_PRIORITY_LS), start_date)
    trans_ls.append(expt)

    insertException(cursor,expt)
    insertTrade(cursor, trade)
    global COMMON_ROOT
    appendRoot(COMMON_ROOT, trade_ls)
    appendRoot(COMMON_ROOT, trans_ls)

def Case5():
    print("creating case5")
    yml = getYaml("Case5")
    if not yml:
        print("yaml is null")
        return 
    start_date = random_date(AUG2025, SEP2025)
    cursor = connectToDb(DBNAME)
    trade = Trade(10000005, RandAccNum(), random.choice(ASSET_TYPE_LS), random.choice(BOOKING_SYSTEM_LS), \
                  random.choice(AFFIRMATION_SYSTEM_LS), random.choice(CLEARING_HOUSE_LS), start_date,start_date, "ALLEGED")
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

    start_date = add_seconds(start_date, 60)
    expt = TransException(RandNum(8),trade.trade_id, trans_ls[-1].trans_id,"PENDING","MAPPING ISSUE" , start_date, "NO MAPPING FOR KINGSLANDING", random.choice(EXCEPTION_PRIORITY_LS), start_date)
    trans_ls.append(expt)

    insertException(cursor, expt)
    insertTrade(cursor, trade)
    global COMMON_ROOT
    appendRoot(COMMON_ROOT, trade_ls)
    appendRoot(COMMON_ROOT, trans_ls)

if __name__ == "__main__":
    Case1()
    Case2()
    Case3()
    Case4()
    Case5()
    writeToXML(COMMON_ROOT, "aefaga.xml")
