from unittest.mock import patch

import pytest

from apps.products.models import Product
from apps.users.models import CustomUser


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(email='buyer@test.com', full_name='Buyer', password='pass12345')


@pytest.fixture
def product(db):
    return Product.objects.create(sku='SKU-TEST', name='Test Product', price='10.00', stock_quantity=10)


@pytest.fixture(autouse=True)
def no_sleep():
    with patch('apps.orders.tasks.time.sleep'):
        yield
