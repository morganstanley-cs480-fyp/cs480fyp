import xml.etree.cElementTree as et
class Trade:
    def __init__(self,trade_id, acc,asset_type, booking_system,affirmation_system ,clearing_house,create_time,update_time, status):
        self.trade_id = trade_id 
        self.acc = acc
        self.asset_type = asset_type
        self.booking_system = booking_system
        self.affirmation_system = affirmation_system
        self.clearing_house = clearing_house
        self.create_time = create_time
        self.update_time = update_time 
        self.status = status
    def getXMLTreeRoot(self):
        root = et.Element("trade")
        et.SubElement(root, "id").text = str(self.trade_id)
        et.SubElement(root,"account").text = self.acc
        et.SubElement(root, "asset_type").text = self.asset_type
        et.SubElement(root, "booking_system").text = self.booking_system
        et.SubElement(root, "affirmation_system").text = self.affirmation_system
        et.SubElement(root, "clearing_house").text = self.clearing_house
        et.SubElement(root, "create_time").text = self.create_time
        et.SubElement(root, "update_time").text = self.update_time
        et.SubElement(root, "status").text = self.status
        return root
    def __str__(self) -> str:
        return f'Trade("{self.trade_id}","{self.acc}","{self.asset_type}","{self.booking_system}", "{self.affirmation_system}","{self.clearing_house}", "{self.create_time}", "{self.update_time}", "{self.status}")'

class Transaction:
    def __init__(self,trans_id, trade_id, create_time, entity, direction, _type, status, update_time, step):
        self.trans_id = trans_id
        self.trade_id = trade_id
        self.create_time = create_time
        self.entity = entity
        self.direction = direction
        self._type = _type
        self.status = status
        self.update_time = update_time
        self.step = step
    def getXMLTreeRoot(self):
        root = et.Element("transaction")
        et.SubElement(root, "id").text = str(self.trans_id)
        et.SubElement(root, "trade_id").text = str(self.trade_id)
        et.SubElement(root, "create_time").text = self.create_time
        et.SubElement(root, "entity").text = self.entity
        et.SubElement(root, "direction").text = self.direction
        et.SubElement(root, "type").text = self._type
        et.SubElement(root, "status").text = self.status
        et.SubElement(root, "update_time").text = self.update_time
        et.SubElement(root, "step").text = str(self.step)
        return root
    def __str__(self) -> str:
        return f'Transaction("{self.trans_id}", "{self.trade_id}", "{self.create_time}", "{self.entity}", "{self.direction}", "{self._type}", "{self.status}", "{self.update_time}", {self.step})'

class TransException:
    def __init__(self, exception_id,trade_id, trans_id, status, msg, create_time, comment, priority, update_time):
        self.exception_id = exception_id
        self.trade_id = trade_id
        self.trans_id = trans_id
        self.status = status
        self.msg= msg
        self.create_time = create_time
        self.comment = comment
        self.priority = priority
        self.update_time = update_time

    def getXMLTreeRoot(self):
        root = et.Element("exception")
        et.SubElement(root, "id").text = str(self.exception_id)
        et.SubElement(root, "trade_id").text = str(self.trade_id)
        et.SubElement(root, "transaction_id").text = str(self.trans_id)
        et.SubElement(root, "status").text = self.status
        et.SubElement(root, "msg").text = self.msg
        et.SubElement(root, "create_time").text = self.create_time
        et.SubElement(root, "comment").text = self.comment
        et.SubElement(root, "priority").text = self.priority
        et.SubElement(root, "update_time").text = self.update_time
        return root

