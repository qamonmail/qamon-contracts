import {Contract, getRandomNonce, toNano, WalletTypes} from "locklift";
import {Account} from 'locklift/everscale-client';
import {MailAccountAbi, MailRootAbi} from "../build/factorySource";
import { BigNumber } from "bignumber.js";

const logger = require("mocha-logger");



export const getEvent = async function(contract: Contract<MailRootAbi> | Contract<MailAccountAbi>, event_name: string) {
    // @ts-ignore
    const events = (await contract.getPastEvents({filter: (event: { event: string; }) => event.event === event_name})).events;
    return (events.shift()).data;
}


export const deployUser = async function (initial_balance = 100): Promise<Account> {
    const signer = await locklift.keystore.getSigner('0');

    const {account: _user, tx} = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.EverWallet,
        //Value which will send to the new account from a giver
        value: toNano(initial_balance),
        publicKey: signer?.publicKey as string,
        nonce: getRandomNonce()
    });

    logger.log(`User address: ${_user.address.toString()}`);
    return _user;
}

const gasPrice = 1000;

export const calcValue = (
  gas: (ReturnType<
    ReturnType<
      Contract<MailRootAbi>["methods"]["getSendMailsGas"]
    >["call"]
  > extends Promise<infer T>
    ? T
    : never)["value0"],
  isTransfer = false,
): string =>
  new BigNumber(gas.dynamicGas)
    .plus(isTransfer ? 100000 : 0)
    .times(gasPrice)
    .plus(gas.fixedValue)
    .toString();

