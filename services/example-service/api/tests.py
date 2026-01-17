import pytest
from django.urls import reverse
from django.contrib.auth.models import User


@pytest.mark.django_db
def test_create_user():
    """Test creating a user"""
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )
    assert user.username == 'testuser'
    assert user.email == 'test@example.com'
    assert User.objects.count() == 1


@pytest.mark.django_db
def test_user_str_representation():
    """Test user string representation"""
    user = User.objects.create_user(
        username='john',
        password='pass123'
    )
    assert str(user) == 'john'


def test_simple_calculation():
    """Test basic calculation without database"""
    result = 2 + 2
    assert result == 4