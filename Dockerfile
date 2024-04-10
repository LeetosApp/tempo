FROM docker:dind-stable

FROM node:14

RUN apt-get update && apt-get install -y g++

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "code_executor.js"]
