FROM node:latest

RUN npm install -g pm2

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
ADD package.json /usr/src/app/
RUN npm install

# Bundle app source
ADD . /usr/src/app

EXPOSE 3000
CMD ["npm", "start"]

