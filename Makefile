.PHONY: dev-web dev-api install 
	
install:
	bun install


dev-frontend:
	cd frontend && bun run dev

dev-backend:
	cd backend && .\gradlew bootRun --continuous