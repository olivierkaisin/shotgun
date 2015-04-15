FROM node:0.10.38

ENV APP_NAME shotgun

RUN npm i -g nodemon bunyan

RUN apt-get update &&\
  apt-get install -y libpng12-dev libjpeg62-turbo-dev libfreetype6-dev libjasper-dev fontconfig graphicsmagick imagemagick libmagickwand-dev &&\
  apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /var/www

COPY ./package.json /var/www/package.json
RUN npm install

COPY ./lib /var/www/lib

CMD ["npm", "start"]
