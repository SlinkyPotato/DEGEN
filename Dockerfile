FROM node:16.10.0-buster-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install --quiet --yes \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev

COPY package*.json ./

RUN yarn install

COPY . ./

RUN yarn build

CMD ["yarn", "start"]