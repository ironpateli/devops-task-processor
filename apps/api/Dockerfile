FROM node:20-alpine
WORKDIR /usr/src/app
COPY apps/api/package*.json ./
RUN npm ci
COPY apps/api/ ./
EXPOSE 4000
CMD ["npm", "start"]
