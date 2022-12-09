
to build and run:
```
docker-compose build chem 
docker-compose run --rm chem npm install
docker-compose up
```

useful docker commands:
```
docker-compose down --volume --remove-orphans

docker network ls
docker network inspect chem_front_mynet


force a container to disconnet so you can bring it down:
docker network disconnect -f devenv_default <container-name>

docker ps -a - lists all containers. You can format this like docker ps -a --format "{{.Names}} {{.Status}} {{.ID}}"

docker rm -f <image> - remove an image

docker system prune
```

log in to aws
```
aws ecr get-login-password --region us-east-1 | docker login --username AWS '
                       '--password-stdin 130175896899.dkr.ecr.us-east-1.amazonaws.com
```



Story:
You and a friend are groaning about doing chemistry homework, when a portal appears and someone from the future appears.
They say there is an attack on the scientists throughout history, and it is up to us to stop the attacker.
We are transported to the different times, where we see the scientists are being mind-controlled.
We defeat them, and each scientist thanks us and gives us a prize (new element/compound/weapon).
While fighting them, we talk to each other to figure out the best strategy (which gives the player hints on what to do).
After we free all of the scientists from the mind-control, the time traveler brings us back to the present.
He says we are the next great scientists, and we will make many great discoveries, so we have to be on the lookout for the next attack!