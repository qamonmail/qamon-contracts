import {Contract, getRandomNonce, toNano, WalletTypes} from "locklift";
import {Account} from 'locklift/everscale-standalone-client';
import {MailAccountAbi, MailRootAbi} from "../build/factorySource";

const logger = require("mocha-logger");
const {expect} = require("chai");



export const getEvent = async function(contract: Contract<MailRootAbi> | Contract<MailAccountAbi>, event_name: string) {
    // @ts-ignore
    const events = (await contract.getPastEvents({filter: (event: { event: string; }) => event.event === event_name})).events;
    return (events.shift()).data;
}


export const deployUser = async function (initial_balance = 100): Promise<Account> {
    const signer = await locklift.keystore.getSigner('0');

    const {account: _user, tx} = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.MsigAccount,
        contract: "Wallet",
        //Value which will send to the new account from a giver
        value: toNano(initial_balance),
        publicKey: signer?.publicKey as string,
        initParams: {
            _randomNonce: getRandomNonce()
        },
        constructorParams: {}
    });

    logger.log(`User address: ${_user.address.toString()}`);
    return _user;
}
