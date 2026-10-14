#!/bin/sh
set -e

# Only substitute if template exists
if [ -f /etc/nginx/templates/default.conf.template ]; then
  envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# Exec the provided CMD so signals are handled correctly
exec "$@"
