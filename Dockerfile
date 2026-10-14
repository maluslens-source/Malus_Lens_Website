FROM nginx:stable-alpine

# Cloud Run expects the container to listen on a port; we'll use 8080.
ENV PORT 8080

# Add a custom nginx config that listens on 8080 and serves static files
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy site files into nginx html dir
COPY . /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
