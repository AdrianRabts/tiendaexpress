import pytest
from rest_framework.test import APIClient

from apps.products.models import Product
from apps.products.serializers import ProductSerializer
from apps.users.models import CustomUser


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(email='buyer@test.com', full_name='Buyer', password='pass12345')


@pytest.mark.django_db
def test_product_serializer_exposes_expected_fields():
    product = Product.objects.create(sku='SKU-1', name='Mouse', price='15.99', stock_quantity=10)

    data = ProductSerializer(product).data

    assert data == {
        'id': product.id,
        'sku': 'SKU-1',
        'name': 'Mouse',
        'price': '15.99',
        'stock_quantity': 10,
    }


@pytest.mark.django_db
def test_list_products_requires_authentication():
    Product.objects.create(sku='SKU-1', name='Mouse', price='15.99', stock_quantity=10)
    client = APIClient()

    response = client.get('/api/products/')

    assert response.status_code == 401


@pytest.mark.django_db
def test_list_products_is_paginated(user):
    for index in range(15):
        Product.objects.create(sku=f'SKU-{index}', name=f'Product {index}', price='9.99', stock_quantity=5)

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get('/api/products/')

    assert response.status_code == 200
    assert response.data['count'] == 15
    assert len(response.data['results']) == 10
    assert response.data['next'] is not None
