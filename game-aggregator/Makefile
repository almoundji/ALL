.PHONY: setup api ui dev test docker
setup:              ## Environnement Python + dépendances
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
api:                ## API seule (http://localhost:8000, doc sur /docs)
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000
ui:                 ## Build de l'interface dans backend/app/static
	cd frontend && npm install --no-audit --no-fund && npm run build
dev: ui api         ## Interface + API
test:               ## Tests backend
	cd backend && . .venv/bin/activate && python -m pytest -q
docker:             ## API + PostgreSQL
	docker compose up --build
