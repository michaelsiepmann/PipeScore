FROM ubuntu:latest

RUN apt update && \
    apt upgrade --yes && \
    apt install --yes python3 pip python3-svgwrite npm

WORKDIR "/usr/local/pipescore"

COPY "." "/usr/local/pipescore/"

RUN npm install

EXPOSE 8000

ENTRYPOINT ["npm", "run", "dev"]
#ENTRYPOINT ["top", "-b"]