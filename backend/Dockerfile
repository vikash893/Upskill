FROM node:20-alpine

# Install build dependencies for native modules (mediasoup/c++)
RUN apk add --no-cache python3 make g++ gcc libtool autoconf automake ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create uploads and recording directories
RUN mkdir -p uploads/recordings

EXPOSE 8000 10000-10100/udp

ENV NODE_ENV=production

CMD ["node", "server.js"]
