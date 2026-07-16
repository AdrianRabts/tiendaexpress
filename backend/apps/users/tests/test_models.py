import pytest

from apps.users.models import CustomUser


@pytest.mark.django_db
def test_create_user_normalizes_email_and_sets_password():
    user = CustomUser.objects.create_user(
        email='Buyer@Test.COM', full_name='Buyer', password='pass12345',
    )

    assert user.email == 'Buyer@test.com'
    assert user.check_password('pass12345')
    assert user.is_active
    assert not user.is_staff
    assert not user.is_superuser


@pytest.mark.django_db
def test_create_user_requires_email():
    with pytest.raises(ValueError):
        CustomUser.objects.create_user(email='', full_name='Buyer', password='pass12345')


@pytest.mark.django_db
def test_create_superuser_sets_staff_and_superuser_flags():
    user = CustomUser.objects.create_superuser(
        email='admin@test.com', full_name='Admin', password='pass12345',
    )

    assert user.is_staff
    assert user.is_superuser
