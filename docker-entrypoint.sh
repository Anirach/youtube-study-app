#!/bin/bash

set -e

echo "🚀 Starting YouTube Study App..."

# Initialize database if it doesn't exist
cd /app/backend
if [ ! -f /app/data/app.db ]; then
    echo "📊 Initializing database..."
    npx prisma generate
    npx prisma db push --skip-generate
    echo "✅ Database initialized"
else
    echo "✅ Database already exists"
fi

# Start backend server in background
echo "🔧 Starting backend server on port 8000..."
cd /app/backend
PORT=8000 node src/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Start frontend server
echo "🎨 Starting frontend server on port 3000..."
cd /app/frontend
PORT=3000 npm start &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
sleep 5

echo ""
echo "✨ YouTube Study App is ready!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:8000/api"
echo ""

# Keep container running and handle shutdown gracefully
trap "echo '🛑 Shutting down...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" SIGTERM SIGINT

wait
