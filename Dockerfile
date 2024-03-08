FROM node:18.15.0

WORKDIR /usr/src/app

COPY . .

RUN npm ci

EXPOSE 8000

CMD ["npm", "run", "dev"]