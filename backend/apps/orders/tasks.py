import logging
import random
import time

from celery import shared_task
from django.db import transaction

from apps.products.models import Product

from .models import Order

logger = logging.getLogger(__name__)

PAYMENT_SUCCESS_RATE = 0.8


@shared_task
def verify_payment(order_id):
    time.sleep(2)

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        logger.error('Order %s not found for payment verification', order_id)
        return

    if random.random() >= PAYMENT_SUCCESS_RATE:
        order.status = Order.Status.FAILED
        order.save(update_fields=['status'])
        return

    try:
        with transaction.atomic():
            items = list(order.items.select_related('product'))
            product_ids = [item.product_id for item in items]
            locked_products = {
                product.id: product
                for product in Product.objects.select_for_update().filter(id__in=product_ids).order_by('id')
            }

            for item in items:
                if locked_products[item.product_id].stock_quantity < item.quantity:
                    order.status = Order.Status.FAILED
                    order.save(update_fields=['status'])
                    return

            for item in items:
                product = locked_products[item.product_id]
                product.stock_quantity -= item.quantity
                product.save(update_fields=['stock_quantity'])

            order.status = Order.Status.CONFIRMED
            order.save(update_fields=['status'])
    except Exception:
        logger.exception('Unexpected error confirming order %s', order_id)
        order.status = Order.Status.FAILED
        order.save(update_fields=['status'])
        return

    send_notification.delay(order.id)


@shared_task
def send_notification(order_id):
    try:
        order = Order.objects.select_related('user').get(id=order_id)
    except Order.DoesNotExist:
        logger.error('Order %s not found for notification', order_id)
        return

    items = [
        (item.product.sku, item.quantity)
        for item in order.items.select_related('product')
    ]
    logger.info('Order #%s confirmed for %s - items: %s', order.id, order.user.email, items)
