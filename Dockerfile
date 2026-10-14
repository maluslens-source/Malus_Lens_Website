FROM nginx:stable-alpine

# Cloud Run sets PORT at runtime; default to 8080 for local builds
ENV PORT 8080

# Install envsubst (gettext) so we can substitute $PORT into the nginx conf
RUN apk add --no-cache gettext

# Copy templated nginx config and an entrypoint that substitutes $PORT
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy site files into nginx html dir (templates/entrypoint are excluded by .dockerignore)
COPY . /usr/share/nginx/html

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
