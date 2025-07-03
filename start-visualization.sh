#!/bin/bash

echo "🚀 Starting DynamoDB Distributed System with Stunning Visualization"
echo "=============================================================="

# Start the Go backend
echo "🔧 Starting Go backend server..."
NODE_ID=node-1 PORT=8081 go run cmd/server/main.go &
BACKEND_PID=$!

echo "⏱️  Waiting for backend to start..."
sleep 3

# Start the React visualization
echo "🎨 Starting React visualization dashboard..."
cd web
npm install --silent
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ System Started Successfully!"
echo "================================"
echo "🌐 Backend API: http://localhost:8081"
echo "🎨 Visualization: http://localhost:3000"
echo "📊 WebSocket: ws://localhost:8081/ws"
echo ""
echo "🎯 Try these operations:"
echo "• PUT: curl -X PUT http://localhost:8081/api/v1/data/user:123 -H 'Content-Type: application/json' -d '{\"value\":\"John Doe\"}'"
echo "• GET: curl http://localhost:8081/api/v1/data/user:123"
echo "• Ring: curl http://localhost:8081/api/v1/ring"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT
wait 