to run the dev server (svelte app):
```
npm run dev
```

useful docker commands:
```
docker-compose down --volume --remove-orphans

docker network ls
docker network inspect chem_front_mynet
```

log in to aws
```
aws ecr get-login-password --region us-east-1 | docker login --username AWS '
                       '--password-stdin 130175896899.dkr.ecr.us-east-1.amazonaws.com
```