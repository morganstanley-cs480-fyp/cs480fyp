from tortoise import fields, models
from enum import Enum

# Defines the Exception model class
# Tortoise ORM uses this to generate SQL and perform database operations

class ExceptionStatus(str, Enum):
    PENDING = "Pending"
    CLOSED = "Closed"

# Note: Tentative model. Might change
class Exception(models.Model):
    id = fields.IntField(pk=True)
    trade_id = fields.IntField()
    trans_id = fields.IntField()
    status = fields.CharEnumField(ExceptionStatus, max_length=10, default=ExceptionStatus.PENDING)
    msg = fields.TextField()
    comment = fields.TextField(null=True)
    priority = fields.CharField(max_length=50)
    create_time = fields.DatetimeField(auto_now_add=True)
    update_time = fields.DatetimeField(auto_now=True)

    # This class specifies the table name and other ORM options
    class Meta:
        table = "exceptions"
