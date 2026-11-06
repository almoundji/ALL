.PHONY: dev api ui test build docker
dev: ui api            ## Build l'interface puis lance l'API (http://localhost:8000)
api:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000
ui:
	cd frontend && npm install --no-audit --no-fund && npm run build
test:
	cd backend && . .venv/bin/activate && python -m pytest -q
setup:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
docker:
	docker compose up --build
