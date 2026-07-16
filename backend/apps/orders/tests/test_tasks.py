from unittest.mock import patch

import pytest

from apps.orders.models import Order, OrderItem
from apps.orders.tasks import verify_payment


def make_pending_order(user, product, quantity):
    order = Order.objects.create(user=user)
    OrderItem.objects.create(order=order, product=product, quantity=quantity, unit_price=product.price)
    return order


@pytest.mark.django_db
@patch('apps.orders.tasks.random.random', return_value=0.1)
@patch('apps.orders.tasks.send_notification.delay')
def test_confirms_order_and_decrements_stock(mock_notify, mock_random, user, product):
    order = make_pending_order(user, product, quantity=3)

    verify_payment(order.id)

    order.refresh_from_db()
    product.refresh_from_db()
    assert order.status == Order.Status.CONFIRMED
    assert product.stock_quantity == 7
    mock_notify.assert_called_once_with(order.id)


@pytest.mark.django_db
@patch('apps.orders.tasks.random.random', return_value=0.99)
def test_marks_failed_on_payment_rejection(mock_random, no_broadcast, user, product):
    order = make_pending_order(user, product, quantity=3)

    verify_payment(order.id)

    order.refresh_from_db()
    product.refresh_from_db()
    assert order.status == Order.Status.FAILED
    assert product.stock_quantity == 10
    no_broadcast.assert_called_once_with(order)


@pytest.mark.django_db
@patch('apps.orders.tasks.random.random', return_value=0.1)
def test_marks_failed_when_stock_no_longer_sufficient(mock_random, user, product):
    order = make_pending_order(user, product, quantity=3)
    product.stock_quantity = 1
    product.save(update_fields=['stock_quantity'])

    verify_payment(order.id)

    order.refresh_from_db()
    product.refresh_from_db()
    assert order.status == Order.Status.FAILED
    assert product.stock_quantity == 1


@pytest.mark.django_db
@patch('apps.orders.tasks.random.random', return_value=0.1)
@patch('apps.products.models.Product.objects.select_for_update', side_effect=RuntimeError('boom'))
def test_marks_failed_on_unexpected_error(mock_locked, mock_random, no_broadcast, user, product):
    order = make_pending_order(user, product, quantity=3)

    verify_payment(order.id)

    order.refresh_from_db()
    assert order.status == Order.Status.FAILED
    no_broadcast.assert_called_once_with(order)


@pytest.mark.django_db
def test_verify_payment_handles_missing_order():
    verify_payment(999999)
