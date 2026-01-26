freeze:
	pip freeze > requirements.txt

build:
	docker build -t exception-service .

run:
	docker run -p 8001:8001 exception-service

compose-up:
	docker compose up -d

compose-down:
	docker compose down

aerich-update:
	aerich migrate --name
	aerich upgrade

aerich-downgrade:
	aerich downgrade

seed-data:
	python -m scripts.seed_data

test:
	pytest -v

test-cov:
	pytest --cov=app --cov-report=html --cov-report=term

test-watch:
	pytest-watch
