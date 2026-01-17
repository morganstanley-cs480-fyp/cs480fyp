import django
from django.conf import settings
from django.core.management import call_command

def pytest_configure():
    settings.configure(
        DEBUG=True,
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': ':memory:',
            }
        },
        INSTALLED_APPS=[
            'django.contrib.auth',
            'django.contrib.contenttypes',
            'api',
        ],
        SECRET_KEY='test-secret-key',
    )
    django.setup()
    call_command('migrate', '--run-syncdb', verbosity=0)