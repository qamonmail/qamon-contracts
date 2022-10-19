import {getRandomNonce, toNano} from "locklift";

const logger = require("mocha-logger");


async function main() {
    const signer = await locklift.keystore.getSigner('0');

    const MailBox = await locklift.factory.getContractArtifacts('MailBox');
    const MailAccount = await locklift.factory.getContractArtifacts('MailAccount');
    const Mail = await locklift.factory.getContractArtifacts('Mail');

    logger.log('Deploying mail root...')
    const {contract: _root} = await locklift.tracing.trace(locklift.factory.deployContract({
        contract: 'MailRoot',
        initParams: {
            mailCode: Mail.code,
            mailBoxCode: MailBox.code,
            accountCode: MailAccount.code,
            _randomNonce: getRandomNonce()
        },
        constructorParams: {},
        value: toNano(2),
        publicKey: signer?.publicKey as string
    }));
    logger.log(`Mail root deployed at ${_root.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
