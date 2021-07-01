# https://hub.docker.com/r/nikolaik/python-nodejs
FROM nikolaik/python-nodejs:python3.9-nodejs16

WORKDIR /chem_front
COPY ./ /chem_front
COPY requirements.json .

# ENV USER='craigw' 
# RUN adduser --disabled-password --gecos '' $USER
# giving this user "root" privilege
# RUN groupadd docker
# RUN newgrp docker 
# RUN sudo usermod -aG docker $USER
# RUN sudo chown "$USER":"$USER" /home/"$USER"/.docker -R

RUN pip install click
RUN pip install ipdb
RUN apt-get update && apt-get install -y vim
RUN ./scripts/manage_reqs install -r requirements.json

RUN npx degit sveltejs/template-webpack svelte-app
