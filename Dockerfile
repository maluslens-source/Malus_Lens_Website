FROM nginx:stable-alpine

# Default port; Cloud Run will set PORT if needed
ENV PORT 8080

# Create an entrypoint script that writes nginx config using the runtime $PORT
RUN cat > /entrypoint.sh <<'SH'
#!/bin/sh
# Generate nginx config using runtime $PORT
cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen ${PORT};
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(?:css|js|jpg|jpeg|gif|png|svg|ico|woff2?|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    error_page 404 /index.html;

    gzip on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

exec nginx -g 'daemon off;'
SH

RUN chmod +x /entrypoint.sh

# Copy site files into nginx html dir
COPY . /usr/share/nginx/html

EXPOSE 8080

CMD ["/entrypoint.sh"]
