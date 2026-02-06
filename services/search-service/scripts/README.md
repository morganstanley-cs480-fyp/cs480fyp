# Code Quality Scripts

This directory contains scripts for running code quality checks.

## Available Scripts

### Run All Checks
```bash
# From search-service/ directory
python scripts/lint.py
```

### Run Individual Tools

**Pylint:**
```bash
pylint app/
```

**Flake8:**
```bash
flake8 app/
```

**Run on specific files:**
```bash
pylint app/config/settings.py
flake8 app/models/domain.py
```

## Configuration Files

- `.pylintrc` - Pylint configuration
- `.flake8` - Flake8 configuration

## Common Issues and Fixes

### Line too long
```python
# Bad
this_is_a_very_long_variable_name = some_function_with_many_arguments(arg1, arg2, arg3, arg4, arg5)

# Good
this_is_a_very_long_variable_name = some_function_with_many_arguments(
    arg1, arg2, arg3, arg4, arg5
)
```

### Missing docstrings
```python
# Bad
def calculate_total(items):
    return sum(items)

# Good
def calculate_total(items):
    """Calculate total sum of items.
    
    Args:
        items: List of numeric values
        
    Returns:
        Sum of all items
    """
    return sum(items)
```

### Too many arguments
```python
# Bad
def create_user(name, email, age, address, phone, city, country):
    pass

# Good - use a dataclass or Pydantic model
from pydantic import BaseModel

class UserData(BaseModel):
    name: str
    email: str
    age: int
    address: str
    phone: str
    city: str
    country: str

def create_user(user_data: UserData):
    pass
```

## Pre-commit Hook (Optional)

To run linting automatically before commits:

```bash
# Install pre-commit
pip install pre-commit

# Set up the git hook
pre-commit install
```

Then create `.pre-commit-config.yaml` in the project root.
