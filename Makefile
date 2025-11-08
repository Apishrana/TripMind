.PHONY: help install run build docker-build docker-up docker-down clean test

help:
	@echo "Travel Planner AI Agent - Build Commands"
	@echo ""
	@echo "Available commands:"
	@echo "  make install      - Install dependencies"
	@echo "  make run          - Run the application"
	@echo "  make build        - Build the application"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make test         - Run tests (if available)"

install:
	pip install --upgrade pip
	pip install -r requirements.txt

run:
	python3 main.py

build: install
	@echo "✅ Build complete!"

docker-build:
	docker build -t travel-planner-ai .

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down

clean:
	find . -type d -name __pycache__ -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.log" -delete
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	rm -rf dist
	rm -rf build
	rm -rf *.egg-info

test:
	@echo "Tests not yet implemented"

