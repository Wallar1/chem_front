# https://hub.docker.com/r/nikolaik/python-nodejs
FROM nikolaik/python-nodejs:python3.9-nodejs16


RUN pip install click
# copy <dest> <src>
COPY . ./web_app
WORKDIR /web_app
# commenting this out because right now it is just npm anyway
# RUN ./scripts/manage_reqs install -r ./requirements.json

RUN pip install ipdb
RUN apt-get update && apt-get install -y vim

# RUN npm prune --production # Remove dev dependencies
# run these steps manually in the container:
# RUN cd svelte-app
# TODO figure out why you need to run this manually in the container
RUN npm init -y
RUN npm install
# RUN npx degit sveltejs/template-webpack svelte-app
# RUN npm run build

# run this outside of the container:
# docker cp chem_front_chem_1:/web_app/svelte-app ./test_web_app_copy

EXPOSE 5000
ENV HOST=0.0.0.0

CMD [ "npm", "start" ]


# Dont add the user, so you can have root privilege
# ENV USER='craigw' 
# RUN adduser --disabled-password --gecos '' $USER
# giving this user "root" privilege
# RUN groupadd docker
# RUN newgrp docker 
# RUN sudo usermod -aG docker $USER
# RUN sudo chown "$USER":"$USER" /home/"$USER"/.docker -R