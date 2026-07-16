import pytest
from rest_framework.test import APIClient

from apps.users.models import CustomUser


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(email='buyer@test.com', full_name='Buyer', password='pass12345')


@pytest.mark.django_db
def test_login_returns_tokens_for_valid_credentials(user):
    client = APIClient()

    response = client.post('/api/auth/login/', {'email': 'buyer@test.com', 'password': 'pass12345'}, format='json')

    assert response.status_code == 200
    assert 'access' in response.data
    assert 'refresh' in response.data


@pytest.mark.django_db
def test_login_rejects_invalid_password(user):
    client = APIClient()

    response = client.post('/api/auth/login/', {'email': 'buyer@test.com', 'password': 'wrong'}, format='json')

    assert response.status_code == 401
