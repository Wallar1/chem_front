# https://hub.docker.com/r/nikolaik/python-nodejs
FROM nikolaik/python-nodejs:python3.9-nodejs16


RUN pip install click
# copy <dest> <src>
COPY . ./web_app
WORKDIR /web_app
RUN ./scripts/manage_reqs install -r ./requirements.json

RUN pip install ipdb
RUN apt-get update && apt-get install -y vim

RUN npm install
RUN npm run build
RUN npm prune --production # Remove dev dependencies

EXPOSE 5000
ENV HOST=0.0.0.0

CMD [ "npm", "start" ]


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