FROM node:14.18.1-alpine3.14

RUN apk add bash
RUN apk add git

WORKDIR /account-server
COPY . /account-server

EXPOSE 8000

RUN yarn
RUN yarn build

CMD [ "yarn", "start" ]