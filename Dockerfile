FROM node:14.17-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . ./