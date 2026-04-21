#!/bin/bash
# Source .env file
if [ -f .env ]; then
  source .env
else
  echo "Error: .env file not found."
  exit 1
fi

# Export the SWAGGER_URL variable
export SWAGGER_URL=$SWAGGER_URL

echo "Using Swagger URL: ${SWAGGER_URL}"