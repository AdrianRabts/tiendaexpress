import pytest
from rest_framework.test import APIClient

from apps.orders.models import Order


@pytest.mark.django_db
def test_create_order_rejects_insufficient_stock(user, product):
    product.stock_quantity = 1
    product.save(update_fields=['stock_quantity'])
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post('/api/orders/', {'items': [{'product_id': product.id, 'quantity': 5}]}, format='json')

    assert response.status_code == 400
    assert Order.objects.count() == 0


@pytest.mark.django_db
def test_create_order_starts_pending(user, product):
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post('/api/orders/', {'items': [{'product_id': product.id, 'quantity': 2}]}, format='json')

    assert response.status_code == 201
    assert response.data['status'] == 'PENDING'


@pytest.mark.django_db
def test_list_orders_filters_by_status(user, product):
    Order.objects.create(user=user, status=Order.Status.CONFIRMED)
    Order.objects.create(user=user, status=Order.Status.FAILED)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get('/api/orders/', {'status': 'FAILED'})

    assert response.status_code == 200
    assert response.data['count'] == 1
    assert response.data['results'][0]['status'] == 'FAILED'
