from tortoise import fields, models
from tortoise.validators import MinValueValidator, MaxValueValidator
from enum import Enum

# Defines the Solution model class
# Tortoise ORM uses this to generate SQL and perform database operations

# Note: Tentative model. Might change
class Solution(models.Model):
    id = fields.IntField(pk=True)
    # Foreign key from exception-service (different microservice)
    exception_id = fields.IntField(index=True)
    title = fields.TextField()
    exception_description = fields.TextField(null=True)
    reference_event = fields.TextField(null=True)
    solution_description = fields.TextField(null=True)
    create_time = fields.DatetimeField(auto_now_add=True)
    scores = fields.IntField(validators=[MinValueValidator(0), MaxValueValidator(27)])

    # This class specifies the table name and other ORM options
    class Meta:
        table = "solutions"
