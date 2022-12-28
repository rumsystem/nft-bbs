# Port
Port is a forum-like application base on [quorum](https://github.com/rumsystem/quorum).  
Online Site: [https://port.base.one/](https://port.base.one/)

## Quick Start: run in docker
Install [docker](https://docs.docker.com/engine/install/) and [docker-compose](https://docs.docker.com/compose/install/)
```sh
# Clone this repo
git clone git@github.com:rumsystem/nft-bbs.git
cd nft-bbs
PORT=80 # Optional. Otherwise using fallback port 35572 defined in docker-compose.yml
docker-compose up -d
```

### Custom Configuration
Make a copy of the sample config file and modify it, then restart the application
```sh
cd nft-bbs/packages/server
cp config.sample.yml config.yml
vi config.yml
```

## Dev Dependencies
- Node lts-16 or greater
- [Yarn](https://yarnpkg.com/)
- Postgres

### Install dependencies for this monorepo
```sh
cd port
yarn
```

### Start server
Create `nft-bbs/packages/server/.env` and set following envs
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=nft-bbs
DB_USER=postgres
DB_PASSWORD=123456
```
```sh
cd nft-bbs/packages/server
yarn dev
```

### Start client
[optional] To enable https, place `fullchain.pem` and `key.pem` under `/nft-bbs/cert/` folder 
```sh
cd nft-bbs/packages/client
yarn dev
```

## Build
### Build all packages
```sh
cd nft-bbs
yarn build
```
