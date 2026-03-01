import pytest
from app.models import Exception
from app.models.exception import ExceptionStatus


@pytest.mark.asyncio
async def test_create_exception_model():
    """Test creating exception via model"""
    exception = await Exception.create(
        trade_id=1111,
        trans_id=22222,
        msg="Model test",
        priority="Medium",
        status=ExceptionStatus.PENDING,
    )

    assert exception.id is not None
    assert exception.trade_id == 1111
    assert exception.status == ExceptionStatus.PENDING
    assert exception.create_time is not None
    assert exception.update_time is not None

    await exception.delete()


@pytest.mark.asyncio
async def test_exception_default_status():
    """Test that default status is PENDING"""
    exception = await Exception.create(
        trade_id=3333, trans_id=44444, msg="Default status test", priority="Low"
    )

    assert exception.status == ExceptionStatus.PENDING

    await exception.delete()


@pytest.mark.asyncio
async def test_exception_update():
    """Test updating exception model"""
    exception = await Exception.create(
        trade_id=5555,
        trans_id=66666,
        msg="Original message",
        priority="High",
        status=ExceptionStatus.PENDING,
    )

    exception.status = ExceptionStatus.CLOSED
    exception.comment = "Now closed"
    await exception.save()

    # Fetch again to verify
    updated = await Exception.get(id=exception.id)
    assert updated.status == ExceptionStatus.CLOSED
    assert updated.comment == "Now closed"

    await exception.delete()
