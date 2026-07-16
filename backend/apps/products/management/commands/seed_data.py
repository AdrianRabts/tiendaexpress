from django.core.management.base import BaseCommand

from apps.products.models import Product
from apps.users.models import CustomUser

TEST_USER_EMAIL = 'demo@tiendaexpress.com'
TEST_USER_PASSWORD = 'Demo12345!'

PRODUCTS = [
    {'sku': 'SKU-001', 'name': 'Wireless Mouse', 'price': '15.99', 'stock_quantity': 50},
    {'sku': 'SKU-002', 'name': 'Mechanical Keyboard', 'price': '89.99', 'stock_quantity': 20},
    {'sku': 'SKU-003', 'name': 'USB-C Hub', 'price': '29.50', 'stock_quantity': 0},
    {'sku': 'SKU-004', 'name': '27" Monitor', 'price': '249.00', 'stock_quantity': 8},
    {'sku': 'SKU-005', 'name': 'Webcam 1080p', 'price': '45.00', 'stock_quantity': 35},
]


class Command(BaseCommand):
    help = 'Seeds a demo user and sample products'

    def handle(self, *args, **options):
        if not CustomUser.objects.filter(email=TEST_USER_EMAIL).exists():
            CustomUser.objects.create_user(
                email=TEST_USER_EMAIL,
                full_name='Demo User',
                password=TEST_USER_PASSWORD,
            )
            self.stdout.write(self.style.SUCCESS(f'Created test user {TEST_USER_EMAIL}'))
        else:
            self.stdout.write('Test user already exists')

        for data in PRODUCTS:
            Product.objects.get_or_create(sku=data['sku'], defaults=data)

        self.stdout.write(self.style.SUCCESS('Seed data loaded'))
