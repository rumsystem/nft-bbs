FROM nginx:alpine

COPY docker/router.nginx.conf /etc/nginx/templates/port.conf
COPY packages/client/dist /usr/share/nginx/html/
