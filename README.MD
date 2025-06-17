<h1 align="center">URLink: A URL Shortening service 🔗</h1>

## 📚 | Introduction

- URLink is a distributed and highly available URL Shortening service, built on the MERN stack.
- It uses Redis as a cache, and MongoDB as a NoSQL database.
- It uses Nginx that acts as a load balancer, and a reverse proxy for the backend server.
- It uses Apache ZooKeeper to provide tokens for hash generation, and eliminates race conditions between nodes.
- The entire application is containerized by Docker.

<br/>

## 🚀 | Usage

- Install Docker Desktop and enable Kubernetes for a quick setup.
- Clone this repository:<br>

```sh
git clone https://github.com/shivansh9848/ShortURL.git
```

- Create a .env file with the following variables:

```js
REACT_APP_MONGODB_URI = "<enter your MongoDB URI>";
REACT_APP_REDIS_PORT = 1111;
REACT_APP_REDIS_HOST = "redis-server";
```

- Open the project folder and start the container with docker compose:<br>

```yml
docker compose up --build

Example: docker compose up --build --scale node-server=3
```

- Enjoy the project! 😉

<br/>

## 🌐 | API Endpoints

```yml
GET:
    /url/:identifier : Get the shortened URL from DB
    /del : Delete the Zookeeper token
POST:
    /url [body : {"OriginalUrl" : "url"}] : Shorten the URL and store in DB


Access the API using the following URLs:
    Client: http://localhost:3000/
    Load Balanced Server: http://localhost:4000/
```
<br/>

## 💻 | References

- [TinyURL System Design](https://www.codekarle.com/system-design/TinyUrl-system-design.html)
- [System Design : Scalable URL shortener service like TinyURL](https://medium.com/@sandeep4.verma/system-design-scalable-url-shortener-service-like-tinyurl-106f30f23a82)
- [An Illustrated Proof of the CAP Theorem](https://mwhittaker.github.io/blog/an_illustrated_proof_of_the_cap_theorem/)
- [What is eventual consistency and why should you care about it?](https://www.keboola.com/blog/eventual-consistency)
- [Redis Documentation](https://redis.io/documentation)
- [Apache Zookeeper Documentation](https://zookeeper.apache.org/doc/r3.7.0/index.html)
- [Nginx HTTP Load Balancing Documentation](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)
- [Docker Documentation](https://docs.docker.com/language/nodejs/)
- [Kompose Documentation](https://kompose.io/user-guide/)

<br/>
