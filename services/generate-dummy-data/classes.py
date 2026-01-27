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
    # def printstuff(self):
    #     print("TEST")
    #     print(type(self.create_time))
    #     print(type(self.update_time))
    #     print(type(self.trade_id))
    def getXMLTreeRoot(self):
        root = et.Element("Trade")
        et.SubElement(root, "trade_id").text = str(self.trade_id)
        et.SubElement(root,"account").text = self.acc
        et.SubElement(root, "asset_type").text = self.asset_type
        et.SubElement(root, "booking_system").text = self.booking_system
        et.SubElement(root, "affirmation_system").text = self.affirmation_system
        et.SubElement(root, "clearing_house").text = self.clearing_house
        et.SubElement(root, "create_time").text = self.create_time
        et.SubElement(root, "update_time").text = self.update_time
        et.SubElement(root, "status").text = self.status
        return root

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
        root = et.Element("Transaction")
        et.SubElement(root, "trans_id").text = str(self.trans_id)
        et.SubElement(root, "trade_id").text = str(self.trade_id)
        et.SubElement(root, "create_time").text = self.create_time
        et.SubElement(root, "entity").text = self.entity
        et.SubElement(root, "direction").text = self.direction
        et.SubElement(root, "type").text = self._type
        et.SubElement(root, "status").text = self.status
        et.SubElement(root, "update_time").text = self.update_time
        et.SubElement(root, "step").text = str(self.step)
        # tree = et.ElementTree(root)
        return root

class TransException:
    def __init__(self, trade_id, trans_id, exception_id, status, msg, create_time, comment, priority, update_time):
        self.trade_id = trade_id
        self.trans_id = trans_id
        self.exception_id = exception_id
        self.status = status
        self.msg= msg
        self.create_time = create_time
        self.comment = comment
        self.priority = priority
        self.update_time = update_time

    def getXMLTreeRoot(self):
        root = et.Element("Exception")
        et.SubElement(root, "trade_id").text = str(self.trade_id)
        et.SubElement(root, "trans_id").text = str(self.trans_id)
        et.SubElement(root, "exception_id").text = str(self.exception_id)
        et.SubElement(root, "status").text = self.status
        et.SubElement(root, "msg").text = self.msg
        et.SubElement(root, "create_time").text = self.create_time
        et.SubElement(root, "comment").text = self.comment
        et.SubElement(root, "priority").text = self.priority
        et.SubElement(root, "update_time").text = self.update_time
        return root

# root = et.Element("transaction")
# doc = et.SubElement(root,"details")
# et.SubElement(doc,"field1", name="name1").text = "value 1"
# et.SubElement(doc,"field2", name="name2").text = "value 2"
#
# tree = et.ElementTree(root)
# tree.write("test.xml")

    

