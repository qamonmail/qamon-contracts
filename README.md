# Everscale Mail
## Setup
1. Setup all dependencies
```
npm ci
```
2. Create env file from template with following structure
```
# Your evercloud gql enpoint, it has for of https://mainnet.evercloud.dev/{YOUR_KEY}/graphql
# Required for mainnet deploy/tests tracing
MAIN_GQL_ENDPOINT=
# Your wallet seed phrase, needed to fund deploy/tests on mainnet
MAIN_SEED_PHRASE=
```
## Test
1. Run local node on localhost:5000
```
docker run -d --name local-node123 -e USER_AGREEMENT=yes -p5000:80 --restart unless-stopped tonlabs/local-node:latest
```
2. Run tests
```
npx locklift test -n local
```
## Deploy to mainnet
1. Run deploy script
```
everscale mainet: npx locklift run -n mainnet --script scripts/1-deploy-root.ts
venom testnet: npx locklift run -n venom_testnet --script scripts/1-deploy-root.ts
