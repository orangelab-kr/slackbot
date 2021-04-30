FROM node:14-alpine

COPY . /app
WORKDIR /app
RUN yarn --prod=false && \
  yarn build && \
  yarn --prod=true && \
  rm -rf src
CMD yarn start