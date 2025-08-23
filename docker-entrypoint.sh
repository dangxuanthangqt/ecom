#!/bin/sh

echo "Running database migrations..."

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Check if migrations succeeded
if [ $? -eq 0 ]; then
  echo "Migrations completed successfully!"
else
  echo "Migrations failed!"
  exit 1
fi

# Start the application
echo "Starting the application..."
exec "$@"

node dist/main.js
