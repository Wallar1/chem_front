# https://hub.docker.com/r/nikolaik/python-nodejs
FROM nikolaik/python-nodejs:python3.9-nodejs16


RUN pip install click
COPY ./scripts/ /scripts
COPY ./web_app /web_app
RUN ./scripts/manage_reqs install -r /web_app/requirements.json
WORKDIR /web_app

RUN pip install ipdb
RUN apt-get update && apt-get install -y vim


# Dont need these steps now right? Once these files are copied, I will build the container with them
# RUN npx degit sveltejs/template-webpack svelte-app
# RUN cd svelte-app
# RUN npm install
# RUN docker cp chem_front_chem_1:/chem_front/svelte-app ./svelte-app


# Dont add the user, so you can have root privilege
# ENV USER='craigw' 
# RUN adduser --disabled-password --gecos '' $USER
# giving this user "root" privilege
# RUN groupadd docker
# RUN newgrp docker 
# RUN sudo usermod -aG docker $USER
# RUN sudo chown "$USER":"$USER" /home/"$USER"/.docker -R
