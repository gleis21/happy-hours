FROM node:14-alpine3.11

# Create app directory
RUN mkdir -p /opt/src/app
RUN mkdir -p /opt/src/app/logs
WORKDIR /opt/src/app

# Install app dependencies
COPY package.json /opt/src/app/
RUN npm install

# Bundle app source
COPY . /opt/src/app

EXPOSE 3000
CMD ["npm", "start"]

