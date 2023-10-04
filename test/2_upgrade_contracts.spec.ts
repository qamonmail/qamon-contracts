import { expect } from "chai";
import {Contract, getRandomNonce, toNano} from "locklift";
import {MailAccountAbi, MailRootAbi} from "../build/factorySource";
import {deployUser} from "./utils";
import {Account} from 'locklift/everscale-client';

describe("upgrade contracts", () => {
  let user1: Account;
  let user2: Account;

  let acc1: Contract<MailAccountAbi>

  let mail_root: Contract<MailRootAbi>;

  before(async () => {
    user1 = await deployUser(10);
    user2 = await deployUser(10);

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
        owner_: user1.address,
        platformCode_: Platform.code,
        mailCode_: Mail.code,
        mailBoxCode_: MailBox.code,
        accountCode_: MailAccount.code,
      },
      value: toNano(2),
      publicKey: signer?.publicKey as string
    }));
    mail_root = _root;

    const acc1_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, user: {addr: user1.address, pubkey: 0}}).call().then(a => a.value0);
    const acc2_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, user: {addr: user2.address, pubkey: 0}}).call().then(a => a.value0);

    await locklift.tracing.trace(
      mail_root.methods.sendMails({
        receivers: [{addr: user2.address, pubkey: 0}],
        encryptedMail: '01',
        metaVersion: 1,
        senderMeta: '0x01',
        receiverMeta: ['0x02'],
        send_gas_to: user1.address
      }).send({from: user1.address, amount: toNano(1.5)}),
      {allowedCodes: {contracts: {[acc1_addr.toString()]: {compute: [null]}, [acc2_addr.toString()]: {compute: [null]}}}}
    );

    acc1 = await locklift.factory.getDeployedContract('MailAccount', acc1_addr);
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
          _remainingGasTo: null,
        })
        .send({ from: user1.address, amount: toNano(2) }),
    );

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
        .send({ from: user1.address, amount: toNano(0.2) }),
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
    const { traceTree } = await locklift.tracing.trace(
      mail_root.methods
        .upgradeMailAccounts({ _accounts: [acc1.address], _offset: 0, _remainingGasTo: user1.address })
        .send({ from: user1.address, amount: toNano(0.5) }),
    );

    const newAccount = await locklift.factory.getDeployedContract(
      "MailAccount",
      acc1.address,
    );

    expect(traceTree)
      .to.emit("VersionChanged", newAccount)
      .count(1)
      .withNamedArgs({ previous: "1", current: "2" });
  });
});
