from django.db import transaction
from rest_framework import serializers

from apps.products.models import Product
from apps.products.serializers import ProductSerializer

from .models import Order, OrderItem
from .tasks import verify_payment


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    items = OrderItemInputSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('At least one item is required')

        products = Product.objects.in_bulk(item['product_id'] for item in items)
        errors = []
        for item in items:
            product = products.get(item['product_id'])
            if product is None:
                errors.append(f"Product {item['product_id']} does not exist")
            elif product.stock_quantity < item['quantity']:
                errors.append(
                    f"Insufficient stock for {product.sku}: "
                    f"available {product.stock_quantity}, requested {item['quantity']}"
                )

        if errors:
            raise serializers.ValidationError(errors)

        return items

    def create(self, validated_data):
        user = self.context['request'].user
        items_data = validated_data['items']
        products = Product.objects.in_bulk(item['product_id'] for item in items_data)

        with transaction.atomic():
            order = Order.objects.create(user=user)
            OrderItem.objects.bulk_create(
                OrderItem(
                    order=order,
                    product=products[item['product_id']],
                    quantity=item['quantity'],
                    unit_price=products[item['product_id']].price,
                )
                for item in items_data
            )
            transaction.on_commit(lambda: verify_payment.delay(order.id))

        return order


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'unit_price']


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'status', 'created_at', 'items']


class OrderListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'status', 'created_at']
