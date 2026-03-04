#!/usr/bin/env python3
"""
Parse data.xml and generate 04-insert-sample-data.sql
"""
import xml.etree.ElementTree as ET
import sys

def clean_value(value):
    """Clean a value by stripping whitespace and trailing commas"""
    if value is None:
        return None
    return value.strip().rstrip(',').strip()

def parse_xml_to_sql(xml_path, output_path):
    """Parse XML file and generate SQL insert statements"""
    
    # Parse XML
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    # Collect data - use dicts to keep only latest state for each ID
    trades_dict = {}
    transactions = []
    exceptions = []
    
    for child in root:
        if child.tag == 'trade':
            trade = {
                'id': clean_value(child.find('id').text if child.find('id') is not None else None),
                'account': clean_value(child.find('account').text if child.find('account') is not None else None),
                'asset_type': clean_value(child.find('asset_type').text if child.find('asset_type') is not None else None),
                'booking_system': clean_value(child.find('booking_system').text if child.find('booking_system') is not None else None),
                'affirmation_system': clean_value(child.find('affirmation_system').text if child.find('affirmation_system') is not None else None),
                'clearing_house': clean_value(child.find('clearing_house').text if child.find('clearing_house') is not None else None),
                'create_time': clean_value(child.find('create_time').text if child.find('create_time') is not None else None),
                'update_time': clean_value(child.find('update_time').text if child.find('update_time') is not None else None),
                'status': clean_value(child.find('status').text if child.find('status') is not None else None),
            }
            # Keep only the latest version of each trade (by update_time)
            trade_id = trade['id']
            if trade_id not in trades_dict or trade['update_time'] > trades_dict[trade_id]['update_time']:
                trades_dict[trade_id] = trade
            
        elif child.tag == 'transaction':
            transaction = {
                'id': clean_value(child.find('id').text if child.find('id') is not None else None),
                'trade_id': clean_value(child.find('trade_id').text if child.find('trade_id') is not None else None),
                'create_time': clean_value(child.find('create_time').text if child.find('create_time') is not None else None),
                'entity': clean_value(child.find('entity').text if child.find('entity') is not None else None),
                'direction': clean_value(child.find('direction').text if child.find('direction') is not None else None),
                'type': clean_value(child.find('type').text if child.find('type') is not None else None),
                'status': clean_value(child.find('status').text if child.find('status') is not None else None),
                'update_time': clean_value(child.find('update_time').text if child.find('update_time') is not None else None),
                'step': clean_value(child.find('step').text if child.find('step') is not None else None),
            }
            transactions.append(transaction)
            
        elif child.tag == 'exception':
            exception = {
                'id': clean_value(child.find('id').text if child.find('id') is not None else None),
                'trade_id': clean_value(child.find('trade_id').text if child.find('trade_id') is not None else None),
                'transaction_id': clean_value(child.find('transaction_id').text if child.find('transaction_id') is not None else None),
                'status': clean_value(child.find('status').text if child.find('status') is not None else None),
                'msg': clean_value(child.find('msg').text if child.find('msg') is not None else None),
                'create_time': clean_value(child.find('create_time').text if child.find('create_time') is not None else None),
                'comment': clean_value(child.find('comment').text if child.find('comment') is not None else None),
                'priority': clean_value(child.find('priority').text if child.find('priority') is not None else None),
                'update_time': clean_value(child.find('update_time').text if child.find('update_time') is not None else None),
            }
            exceptions.append(exception)
    
    # Convert trades dict to list for processing
    trades = list(trades_dict.values())
    
    # Generate SQL file
    with open(output_path, 'w') as f:
        f.write("-- Data imported from data.xml\n")
        f.write("-- Generated SQL insert statements for trades, transactions, and exceptions\n\n")
        
        # Insert trades
        if trades:
            f.write("-- Insert trades from data.xml\n")
            f.write("INSERT INTO trades\n")
            f.write("  (id, account, asset_type, booking_system, affirmation_system, clearing_house, create_time, update_time, status)\n")
            f.write("VALUES\n")
            
            trade_values = []
            for trade in trades:
                values = (
                    trade['id'],
                    f"'{trade['account']}'" if trade['account'] else 'NULL',
                    f"'{trade['asset_type']}'" if trade['asset_type'] else 'NULL',
                    f"'{trade['booking_system']}'" if trade['booking_system'] else 'NULL',
                    f"'{trade['affirmation_system']}'" if trade['affirmation_system'] else 'NULL',
                    f"'{trade['clearing_house']}'" if trade['clearing_house'] else 'NULL',
                    f"'{trade['create_time']}'" if trade['create_time'] else 'NULL',
                    f"'{trade['update_time']}'" if trade['update_time'] else 'NULL',
                    f"'{trade['status']}'" if trade['status'] else 'NULL',
                )
                trade_values.append(f"({', '.join(values)})")
            
            f.write(',\n'.join(trade_values))
            f.write(";\n\n")
        
        # Insert transactions
        if transactions:
            f.write("-- Insert transactions from data.xml\n")
            f.write("INSERT INTO transactions\n")
            f.write("  (id, trade_id, create_time, entity, direction, type, status, update_time, step)\n")
            f.write("VALUES\n")
            
            trans_values = []
            for trans in transactions:
                values = (
                    trans['id'],
                    trans['trade_id'],
                    f"'{trans['create_time']}'" if trans['create_time'] else 'NULL',
                    f"'{trans['entity']}'" if trans['entity'] else 'NULL',
                    f"'{trans['direction']}'" if trans['direction'] else 'NULL',
                    f"'{trans['type']}'" if trans['type'] else 'NULL',
                    f"'{trans['status']}'" if trans['status'] else 'NULL',
                    f"'{trans['update_time']}'" if trans['update_time'] else 'NULL',
                    trans['step'] if trans['step'] else 'NULL',
                )
                trans_values.append(f"({', '.join(str(v) for v in values)})")
            
            f.write(',\n'.join(trans_values))
            f.write(";\n\n")
        
        # Insert exceptions
        if exceptions:
            f.write("-- Insert exceptions from data.xml\n")
            f.write("INSERT INTO exceptions\n")
            f.write("  (id, trade_id, trans_id, msg, priority, status, comment, create_time, update_time)\n")
            f.write("VALUES\n")
            
            exc_values = []
            for exc in exceptions:
                # Escape single quotes in strings
                msg = exc['msg'].replace("'", "''") if exc['msg'] else None
                comment = exc['comment'].replace("'", "''") if exc['comment'] else None
                
                values = (
                    exc['id'],
                    exc['trade_id'],
                    exc['transaction_id'] if exc['transaction_id'] else 'NULL',
                    f"'{msg}'" if msg else 'NULL',
                    f"'{exc['priority']}'" if exc['priority'] else 'NULL',
                    f"'{exc['status']}'" if exc['status'] else 'NULL',
                    f"'{comment}'" if comment else 'NULL',
                    f"'{exc['create_time']}'" if exc['create_time'] else 'NULL',
                    f"'{exc['update_time']}'" if exc['update_time'] else 'NULL',
                )
                exc_values.append(f"({', '.join(str(v) for v in values)})")
            
            f.write(',\n'.join(exc_values))
            f.write(";\n")
    
    print(f"Generated SQL file: {output_path}")
    print(f"  Trades: {len(trades)}")
    print(f"  Transactions: {len(transactions)}")
    print(f"  Exceptions: {len(exceptions)}")

if __name__ == "__main__":
    # relative paths
    xml_path = "data.xml"
    output_path = "02-insert-sample-data.sql"
    
    parse_xml_to_sql(xml_path, output_path)
