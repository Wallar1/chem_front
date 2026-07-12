FROM node:22-bookworm

WORKDIR /web_app

# Install deps into the image so builds/CI work without a bind mount.
# Dev compose overlays a named volume at /web_app/node_modules and runs
# npm install again so .bin symlinks live on a Linux filesystem (not sshfs).
COPY package.json package-lock.json ./
RUN npm install

EXPOSE 8082
ENV HOST=0.0.0.0
