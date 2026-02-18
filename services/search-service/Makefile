.PHONY: help install freeze test test-cov test-watch lint format clean build run compose-up compose-down seed-data check-db

help:
	@echo "Search Service - Development Commands"
	@echo "======================================"
	@echo "make install       - Install dependencies"
	@echo "make freeze        - Freeze dependencies to requirements.txt"
	@echo "make test          - Run all tests"
	@echo "make test-cov      - Run tests with coverage report"
	@echo "make test-watch    - Run tests in watch mode"
	@echo "make lint          - Run linting checks"
	@echo "make format        - Format code with black"
	@echo "make clean         - Clean cache and build files"
	@echo "make build         - Build Docker image"
	@echo "make run           - Run service with uvicorn"
	@echo "make compose-up    - Start all services with docker-compose"
	@echo "make compose-down  - Stop all services"
	@echo "make seed-data     - Seed database with test data"
	@echo "make check-db      - Check database connection"

install:
	pip install -r requirements.txt

freeze:
	pip freeze > requirements.txt

test:
	pytest -v

test-cov:
	pytest --cov=app --cov-report=html --cov-report=term --cov-report=xml -v

test-watch:
	pytest-watch -v

lint:
	@echo "Running flake8..."
	flake8 app/ tests/
	@echo "Running pylint..."
	pylint app/ tests/ || true

format:
	@echo "Formatting with black..."
	black app/ tests/
	@echo "Sorting imports with isort..."
	isort app/ tests/

clean:
	@echo "Cleaning cache and build files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	rm -rf htmlcov/ .coverage coverage.xml
	@echo "Clean complete!"

build:
	docker build -t search-service .

run:
	uvicorn app.main:app --reload --port 8000 --log-level debug

compose-up:
	cd .. && docker-compose up --build search-service postgres redis

compose-down:
	cd .. && docker-compose down

seed-data:
	python -m scripts.seed_data

check-db:
	python -m scripts.check_db
