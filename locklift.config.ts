import { LockliftConfig } from "locklift";
import { FactorySource } from "./build/factorySource";
import { SimpleGiver, GiverWallet, GiverWalletV2_3 } from "./giverSettings";
import * as dotenv from "dotenv";
import "locklift-verifier";
import "locklift-deploy";
import { Deployments } from "locklift-deploy";

declare global {
  const locklift: import("locklift").Locklift<FactorySource>;
}

declare module "locklift" {
  //@ts-ignore
  export interface Locklift {
    deployments: Deployments<FactorySource>;
  }
}
dotenv.config();

const LOCAL_NETWORK_ENDPOINT = "http://localhost:5000/graphql";
const VENOM_TESTNET_ENDPOINT = "https://jrpc-testnet.venom.foundation/rpc";

const config: LockliftConfig = {
  verifier: {
    verifierVersion: "latest", // contract verifier binary, see https://github.com/broxus/everscan-verify
    apiKey: process.env.VERIFIER_KEY || "",
    secretKey: process.env.VERIFIER_SECRET || "",
    // license: "AGPL-3.0-or-later", <- this is default value and can be overrided
  },
  compiler: {
    // Specify path to your TON-Solidity-Compiler
    // path: "/mnt/o/projects/broxus/TON-Solidity-Compiler/build/solc/solc",

    // Or specify version of compiler
    version: "0.62.0",

    // Specify config for extarnal contracts as in exapmple
    // externalContracts: {
    //   "node_modules/broxus-ton-tokens-contracts/build": ['TokenRoot', 'TokenWallet']
    // }
  },
  linker: {
    // Specify path to your stdlib
    // lib: "/mnt/o/projects/broxus/TON-Solidity-Compiler/lib/stdlib_sol.tvm",
    // // Specify path to your Linker
    // path: "/mnt/o/projects/broxus/TVM-linker/target/release/tvm_linker",

    // Or specify version of linker
    version: "0.15.48",
  },
  networks: {
    local: {
      // Specify connection settings for https://github.com/broxus/everscale-standalone-client/
      connection: {
        id: 1,
        group: "localnet",
        type: "graphql",
        data: {
          endpoints: [LOCAL_NETWORK_ENDPOINT],
          latencyDetectionInterval: 1000,
          local: true,
        },
      },
      // This giver is default local-node giverV2
      giver: {
        // Check if you need provide custom giver
        giverFactory: (ever, keyPair, address) => new SimpleGiver(ever, keyPair, address),
        address: "0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415",
        key: "172af540e43a524763dd53b26a066d472a97c4de37d5498170564510608250c3",
      },
      tracing: {
        endpoint: LOCAL_NETWORK_ENDPOINT,
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        // phrase: "action inject penalty envelope rabbit element slim tornado dinner pizza off blood",
        amount: 20,
      },
    },
    mainnet: {
      // Specify connection settings for https://github.com/broxus/everscale-standalone-client/
      connection: "mainnetJrpc",
      // This giver is default Wallet
      giver: {
        // Check if you need provide custom giver
        giverFactory: (ever, keyPair, address) => new GiverWalletV2_3(ever, keyPair, address),
        address: "0:f8938c6b8ed47a4b2fb2c3f85054e899918a812724a3d9f84ccbf65016b20638",
        phrase: process.env.MAIN_SEED_PHRASE ?? "",
        accountId: 0
      },
      tracing: {
        endpoint: process.env.MAIN_GQL_ENDPOINT ?? ""
      },
      keys: {
        phrase: process.env.MAIN_SEED_PHRASE ?? "",
        amount: 500
      }
    },
    venom_testnet: {
      connection: {
        id: 1000,
        type: "jrpc",
        group: "dev",
        data: {
          endpoint: VENOM_TESTNET_ENDPOINT,
        },
      },
      giver: {
        giverFactory: (ever, keyPair, address) => new GiverWalletV2_3(ever, keyPair, address),
        address: "0:f6b457fe3bc70bc58069dd6eb01e43431be9b459e806ec812ab895fb0f2e7843",
        phrase: process.env.VENOM_TESTNET_SEED_PHRASE ?? "",
        accountId: 0
      },
      tracing: {
        endpoint: process.env.VENOM_TESTNET_GQL_ENDPOINT ?? ""
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        phrase: process.env.VENOM_TESTNET_SEED_PHRASE ?? "",
        amount: 20,
      },
    },
  },
  mocha: {
    timeout: 2000000,
  },
};

export default config;
