#!/bin/sh

# Docker entrypoint script for environment-specific configuration

set -e

# Function to replace environment variables in built files
replace_env_vars() {
    echo "Replacing environment variables in built files..."
    
    # Replace environment variables in JavaScript files
    find /usr/share/nginx/html/static/js -name "*.js" -exec sed -i "s|REACT_APP_ENVIRONMENT_PLACEHOLDER|${REACT_APP_ENVIRONMENT:-production}|g" {} \;
    find /usr/share/nginx/html/static/js -name "*.js" -exec sed -i "s|REACT_APP_VERSION_PLACEHOLDER|${REACT_APP_VERSION:-1.0.0}|g" {} \;
    
    echo "Environment variables replaced successfully"
}

# Set default environment if not provided
export REACT_APP_ENVIRONMENT=${REACT_APP_ENVIRONMENT:-production}
export REACT_APP_VERSION=${REACT_APP_VERSION:-1.0.0}

# Replace environment variables in built files
replace_env_vars

# Execute the main command
exec "$@"