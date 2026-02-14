from tortoise import fields, models
from enum import Enum

# Defines the Exception model class
# Tortoise ORM uses this to generate SQL and perform database operations

class ExceptionStatus(str, Enum):
    PENDING = "PENDING"
    CLOSED = "CLOSED"

# Note: Tentative model. Might change
class Exception(models.Model):
    id = fields.IntField(pk=True)
    # Foreign keys from trade-flow-service (different microservice)
    trade_id = fields.IntField(index=True)
    trans_id = fields.IntField(index=True)
    status = fields.CharEnumField(ExceptionStatus, max_length=10, default=ExceptionStatus.PENDING)
    msg = fields.TextField()
    comment = fields.TextField(null=True)
    priority = fields.CharField(max_length=50)
    create_time = fields.DatetimeField(auto_now_add=True)
    update_time = fields.DatetimeField(auto_now=True)

    # This class specifies the table name and other ORM options
    class Meta:
        table = "exceptions"
        # Composite index for common queries filtering by trade_id and trans_id
        indexes = [("trade_id", "trans_id")]