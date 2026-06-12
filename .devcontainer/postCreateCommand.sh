#!/bin/bash
# Startup script for dev container

echo "🚀 Setting up New Horizon development environment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "📋 Copying .env.example to .env.local"
  cp .env.example .env.local
  echo "⚠️  Please fill in your Supabase credentials in .env.local"
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "✅ Dev environment ready!"
echo "🌐 Start the dev server with: npm run dev"
