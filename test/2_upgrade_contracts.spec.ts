import { expect } from "chai";
import {Contract, getRandomNonce, toNano} from "locklift";
import {MailAccountAbi, MailRootAbi} from "../build/factorySource";
import { calcValue, deployUser } from "./utils";
import {Account} from 'locklift/everscale-client';

describe("upgrade contracts", () => {
  let owner: Account;
  let users: Account[] = [];

  let mail_root: Contract<MailRootAbi>;

  before(async () => {
    owner = await deployUser(150);
    for (let i = 0; i < 75; i++) {
      users.push(await deployUser(10));
    }

    const signer = await locklift.keystore.getSigner('0');

    const MailBox = await locklift.factory.getContractArtifacts('MailBox');
    const MailAccount = await locklift.factory.getContractArtifacts('MailAccount');
    const Mail = await locklift.factory.getContractArtifacts('Mail');
    const Platform = await locklift.factory.getContractArtifacts('Platform');

    const {contract: _root} = await locklift.tracing.trace(locklift.factory.deployContract({
      contract: 'MailRoot',
      initParams: {
        _randomNonce: getRandomNonce(),
      },
      constructorParams: {
        owner_: owner.address,
        platformCode_: Platform.code,
        mailCode_: Mail.code,
        mailBoxCode_: MailBox.code,
        accountCode_: MailAccount.code,
      },
      value: toNano(2),
      publicKey: signer?.publicKey as string
    }));
    mail_root = _root;

    for (let i = 0; i < users.length; i += 10) {
      let gas = await mail_root.methods.getSendMailsGas({
        answerId: 0,
        _receiversNumber: Math.min(10, users.length - i),
        _deployAccount: true
      }).call().then(a => a.value0);

      const {traceTree} = await locklift.tracing.trace(
        mail_root.methods.sendMails({
          receivers: users.slice(i, i + 10).map((user) => {
            return { addr: user.address, pubkey: 0 }
          }),
          encryptedMail: '01',
          metaVersion: 1,
          senderMeta: '0x01',
          receiverMeta: new Array(Math.min(10, users.length - i)).fill('0x02'),
          deployAccount: true,
          send_gas_to: owner.address
        }).send({ from: owner.address, amount: calcValue(gas) }), {allowedCodes: {compute: [null]}}
      );
      // await traceTree?.beautyPrint();
    }
  });

  it("upgrade MailRoot", async () => {
    const mailRootNew = await locklift.factory.getContractArtifacts(
      "MailRoot",
    );

    const { traceTree } = await locklift.tracing.trace(
      mail_root.methods
        .upgrade({
          _code: mailRootNew.code,
          _version: null,
          _remainingGasTo: owner.address,
        })
        .send({ from: owner.address, amount: toNano(2) }),
    );
    // await traceTree?.beautyPrint();

    const newRoot = locklift.factory.getDeployedContract(
      "MailRoot",
      mail_root.address,
    );

    expect(traceTree).to.emit("VersionChanged", newRoot.address).count(1);
  });

  it("set MailAccount code in MailRoot", async () => {
    const NewMailAccount = await locklift.factory.getContractArtifacts(
      "MailAccount",
    );

    const oldVersionCodeInRoot = (
      await mail_root.methods.getAccountCode({ answerId: 0 }).call()
    ).value0.version;
    const { traceTree } = await locklift.tracing.trace(
      mail_root.methods
        .setAccountCode({
          _code: NewMailAccount.code,
        })
        .send({ from: owner.address, amount: toNano(0.2) }),
    );

    const newVersionCodeInRoot = (
      await mail_root.methods.getAccountCode({ answerId: 0 }).call()
    ).value0.version;

    expect(newVersionCodeInRoot).to.eq(
      (Number(oldVersionCodeInRoot) + 1).toString(),
      "Incorrect version of MailAccount code in MailRoot",
    );
    expect(traceTree).to.emit("AccountCodeUpdated").count(1);
  });

  it("upgrade MailAccount", async () => {
    let mailAccounts = await Promise.all(
      users.map(user => mail_root.methods
        .getMailAccountAddress({ answerId: 0, user: {addr: user.address, pubkey: 0 } })
        .call()
        .then(a => a.value0))
    )

    let gas = await mail_root.methods.getUpgradeMailAccountsGas({answerId: 0, _accountsNumber: mailAccounts.length}).call().then(a => a.value0);
    const { traceTree } = await locklift.tracing.trace(
      mail_root.methods
        .upgradeMailAccounts({ _accounts: mailAccounts, _offset: 0, _remainingGasTo: owner.address })
        .send({ from: owner.address, amount: calcValue(gas) }),
    );
    // await traceTree?.beautyPrint();

    // mailAccounts.forEach(accountAddress => {
    //   console.log(accountAddress);
    //   expect(traceTree)
    //     .to.emit("VersionChanged", accountAddress)
    //     .count(1)
    //     .withNamedArgs({ previous: "1", current: "2" });
    // })

    expect(traceTree)
      .to.emit("VersionChanged", mailAccounts[users.length - 1])
      .count(1)
      .withNamedArgs({ previous: "1", current: "2" });
  });
});
