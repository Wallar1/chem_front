# https://hub.docker.com/r/nikolaik/python-nodejs
FROM nikolaik/python-nodejs:python3.9-nodejs16

WORKDIR /chem_front
COPY ./ /chem_front
COPY requirements.json .

RUN adduser --disabled-password --gecos '' craigw
RUN pip install click
RUN pip install ipdb
RUN apt-get update && apt-get install -y vim
RUN ./scripts/manage_reqs install -r requirements.json

RUN npx degit sveltejs/template chem-project
