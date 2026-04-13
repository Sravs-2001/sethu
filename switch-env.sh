#!/bin/bash

ENV=$1

if [ -z "$ENV" ]; then
  echo "Usage: ./switch-env.sh [dev|local]"
  exit 1
fi

if [ "$ENV" = "dev" ]; then
  cp config/env.dev .env.local
  echo "Switched to DEV environment"
elif [ "$ENV" = "local" ]; then
  cp config/env.local .env.local
  echo "Switched to LOCAL environment"
else
  echo "Unknown environment: $ENV. Use 'dev' or 'local'."
  exit 1
fi
