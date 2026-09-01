# 🚀 Royal Chess Online - Setup Guide

## Prerequisites

- Python 3.11+
- MongoDB 7.0+
- Docker & Docker Compose (optional)
- Git

## Quick Start (Docker)

### 1. Clone Repository
```bash
git clone https://github.com/companymehra899-cloud/royalchessonline.git
cd royalchessonline
```

### 2. Create Environment File
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
MONGO_URL=mongodb://admin:password@mongodb:27017
DB_NAME=royal_chess_db
JWT_SECRET=your-very-secret-key-at-least-32-characters-long-!!!!
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret
ADMIN_EMAILS=admin@chess.local
```

### 3. Run with Docker Compose
```bash
docker-compose up -d
```

✅ API available at `http://localhost:8000`  
✅ MongoDB at `localhost:27017`

## Manual Setup (Local Development)

### 1. Install MongoDB

**macOS**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian)**:
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Windows**:
[Download installer](https://www.mongodb.com/try/download/community) and run installer

### 2. Setup Python Environment

```bash
# Clone repo
git clone https://github.com/companymehra899-cloud/royalchessonline.git
cd royalchessonline

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=royal_chess_db
JWT_SECRET=your-min-32-character-secret-key-here
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAILS=admin@chess.local
DEBUG=True
```

### 4. Run Backend Server

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

✅ Server running at `http://localhost:8000`
✅ API docs at `http://localhost:8000/docs`

## Testing

### Run Tests
```bash
pytest backend_test.py -v
```

### Test Coverage
```bash
pytest backend_test.py --cov=backend --cov-report=html
```

## API Testing

### Interactive Docs
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Using cURL

**Register User**:
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "player@chess.local", "password": "SecurePass123!", "username": "ChessPlayer"}'
```

**Login**:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "player@chess.local", "password": "SecurePass123!"}'
```

**Get AI Move**:
```bash
curl -X POST http://localhost:8000/api/chess/ai-move \
  -H "Content-Type: application/json" \
  -d '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "difficulty": "easy"}'
```

**Create Room**:
```bash
curl -X POST http://localhost:8000/api/online/rooms/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"color_preference": "white", "time_minutes": 10}'
```

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**:
```bash
# Check if MongoDB is running
mongosh

# Start MongoDB if not running
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### JWT_SECRET Not Set
```
RuntimeError: JWT_SECRET must be set and be at least 32 characters long
```

**Solution**:
```bash
# Generate secure secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Add to .env
JWT_SECRET=<generated-secret>
```

### Port Already in Use
```
OSError: [Errno 48] Address already in use
```

**Solution**:
```bash
# Use different port
uvicorn server:app --port 8001

# Or kill process using port 8000
lsof -ti:8000 | xargs kill -9
```

## Production Deployment

### Docker Image
```bash
# Build
docker build -t royal-chess-api:latest .

# Push to registry
docker tag royal-chess-api:latest myregistry/royal-chess-api:latest
docker push myregistry/royal-chess-api:latest
```

### Environment Variables (Production)
```env
JWT_SECRET=<generate-strong-secret>
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/royal_chess_db
DB_NAME=royal_chess_db
GOOGLE_CLIENT_ID=<production-google-id>
GOOGLE_CLIENT_SECRET=<production-google-secret>
ADMIN_EMAILS=admin@yourcompany.com
DEBUG=False
```

### Kubernetes Deployment
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## Code Quality

### Formatting
```bash
black backend/
```

### Linting
```bash
flake8 backend/ --max-line-length=120
```

### Type Checking
```bash
mypy backend/
```

## Development Workflow

1. Create feature branch: `git checkout -b feature/awesome-feature`
2. Make changes and test locally
3. Run quality checks: `black`, `flake8`, `mypy`
4. Commit: `git commit -am "Add awesome feature"`
5. Push: `git push origin feature/awesome-feature`
6. Create Pull Request

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [python-chess Documentation](https://python-chess.readthedocs.io/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)

## Support

For issues or questions:
1. Check existing GitHub Issues
2. Review [AGENTS.md](AGENTS.md) for architecture
3. Check logs: `docker logs royal-chess-backend`

---

**Happy Chess Playing! ♟️**
