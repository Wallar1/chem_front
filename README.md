
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