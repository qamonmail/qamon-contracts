import {expect} from "chai";
import {Address, Contract, getRandomNonce, toNano, zeroAddress} from "locklift";
import {MailAccountAbi, MailBoxAbi, MailRootAbi} from "../build/factorySource";
import {deployUser, getEvent} from "./utils";
import {Account} from 'locklift/everscale-client';


interface Mail {
    mail: Address;
    meta: string;
    metaVersion: string;
}

describe("Test mail contracts", async function () {
    let user1: Account;
    let user2: Account;
    const pubkey1 = 123123;

    let mail_root: Contract<MailRootAbi>;

    describe('Setup contracts', async function() {
        it('Deploy users', async function () {
            user1 = await deployUser(10);
            user2 = await deployUser(10);
        });

        it('Deploy Mail Root', async function() {
            const signer = await locklift.keystore.getSigner('0');

            const MailBox = await locklift.factory.getContractArtifacts('MailBox');
            const MailAccount = await locklift.factory.getContractArtifacts('MailAccount');
            const Mail = await locklift.factory.getContractArtifacts('Mail');
            const Platform = await locklift.factory.getContractArtifacts('DexPlatform');

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
        });
    });

    describe("Testing scenarios", async function () {
        let acc1: Contract<MailAccountAbi>, acc2: Contract<MailAccountAbi>, acc3: Contract<MailAccountAbi>;
        let user1_out_box: Contract<MailBoxAbi>, user2_out_box: Contract<MailBoxAbi>, user3_in_box: Contract<MailBoxAbi>;
        let user1_in_box: Contract<MailBoxAbi>, user2_in_box: Contract<MailBoxAbi>;

        it("Send 2 mails from address1 to address2", async function () {
            const acc1_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, user: {addr: user1.address, pubkey: 0}}).call();
            const acc2_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, user: {addr: user2.address, pubkey: 0}}).call();

            const {traceTree} = await locklift.tracing.trace(
                mail_root.methods.sendMails({
                    receivers: [{addr: user2.address, pubkey: 0}],
                    encryptedMail: '01',
                    metaVersion: 1,
                    senderMeta: '0x01',
                    receiverMeta: ['0x02'],
                    send_gas_to: user1.address
                }).send({from: user1.address, amount: toNano(1.5)}),
                {allowedCodes: {contracts: {[acc1_addr.value0.toString()]: {compute: [null]}, [acc2_addr.value0.toString()]: {compute: [null]}}}}
            );
            // await traceTree?.beautyPrint();
            acc1 = await locklift.factory.getDeployedContract('MailAccount', acc1_addr.value0);
            acc2 = await locklift.factory.getDeployedContract('MailAccount', acc2_addr.value0);

            // console.log(await traceTree.beautyPrint());
            // 1 - outbox, 0 - inbox
            const user1_out_box_addr = await acc1.methods.calculateMailBoxAddress({answerId: 0, mail_num: 1, _type: 1}).call();
            const user1_in_box_addr = await acc1.methods.calculateMailBoxAddress({answerId: 0, mail_num: 1, _type: 0}).call();
            const user2_in_box_addr = await acc2.methods.calculateMailBoxAddress({answerId: 0, mail_num: 1, _type: 0}).call();
            const user2_out_box_addr = await acc2.methods.calculateMailBoxAddress({answerId: 0, mail_num: 1, _type: 1}).call();

            user1_out_box = await locklift.factory.getDeployedContract('MailBox', user1_out_box_addr.value0);
            user2_in_box = await locklift.factory.getDeployedContract('MailBox', user2_in_box_addr.value0);

            user1_in_box = await locklift.factory.getDeployedContract('MailBox', user1_in_box_addr.value0);
            user2_out_box = await locklift.factory.getDeployedContract('MailBox', user2_out_box_addr.value0);

            const user1_mails = await user1_out_box.methods.mails().call();
            const user2_mails = await user2_in_box.methods.mails().call();

            const user1_mail: Mail = user1_mails.mails[0];
            const user2_mail: Mail = user2_mails.mails[0];

            const acc1_details = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details._outMailsNum).to.be.eq('1');

            const acc2_details = await acc2.methods.getDetails({answerId: 0}).call();
            expect(acc2_details._inMailsNum).to.be.eq('1');

            expect(user1_mail.meta.toString()).to.be.eq('0x01');
            expect(user1_mail.metaVersion.toString()).to.be.eq('1');
            expect(user2_mail.meta.toString()).to.be.eq('0x02');
            expect(user2_mail.metaVersion.toString()).to.be.eq('1');

            const mail_event = await getEvent(mail_root, 'MailCreated');
            expect(mail_event.sender.toString()).to.be.eq(user1.address.toString());

            const mail_addr: Address = mail_event.mail;

            expect(mail_addr.toString()).to.be.eq(user1_mail.mail.toString());
            expect(mail_addr.toString()).to.be.eq(user2_mail.mail.toString());

            const mail = await locklift.factory.getDeployedContract('Mail', mail_addr);

            const mail_details = await mail.methods.getDetails({answerId: 0}).call();
            expect(mail_details._sender.toString()).to.be.eq(user1.address.toString());

            await locklift.tracing.trace(mail_root.methods.sendMails({
                receivers: [{addr: user2.address, pubkey: 0}],
                encryptedMail: '02',
                metaVersion: 2,
                senderMeta: '0x02',
                receiverMeta: ['0x03'],
                send_gas_to: user1.address
            }).send({from: user1.address, amount: toNano(1.5)}));

            const acc1_details_1 = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details_1._outMailsNum).to.be.eq('2');

            const acc2_details_2 = await acc2.methods.getDetails({answerId: 0}).call();
            expect(acc2_details_2._inMailsNum).to.be.eq('2');

            const user1_mails_1 = await user1_out_box.methods.mails().call();
            const user2_mails_1 = await user2_in_box.methods.mails().call();

            const user1_mail_1 = user1_mails_1.mails[1];
            const user2_mail_1 = user2_mails_1.mails[1];

            expect(user1_mail_1.meta.toString()).to.be.eq('0x02');
            expect(user1_mail_1.metaVersion.toString()).to.be.eq('2');
            expect(user2_mail_1.meta.toString()).to.be.eq('0x03');
            expect(user2_mail_1.metaVersion.toString()).to.be.eq('2');

            const mail_event_1 = await getEvent(mail_root, 'MailCreated');
            expect(mail_event_1.sender.toString()).to.be.eq(user1.address.toString());

            const mail_addr_1: Address = mail_event_1.mail;

            expect(mail_addr_1.toString()).to.be.eq(user1_mail_1.mail.toString());
            expect(mail_addr_1.toString()).to.be.eq(user2_mail_1.mail.toString());

            const mail_1 = await locklift.factory.getDeployedContract('Mail', mail_addr_1);

            const mail_details_1 = await mail_1.methods.getDetails({answerId: 0}).call();
            expect(mail_details_1._sender.toString()).to.be.eq(user1.address.toString());
        });

        it('Send 2 mail from address2 to address1', async function() {
            const {traceTree} = await locklift.tracing.trace(
              mail_root.methods.sendMails({
                  receivers: [{addr: user1.address, pubkey: 0}],
                  encryptedMail: '01',
                  metaVersion: 1,
                  senderMeta: '0x04',
                  receiverMeta: ['0x05'],
                  send_gas_to: user2.address
              }).send({from: user2.address, amount: toNano(1.5)})
            );
            // await traceTree?.beautyPrint();

            const user1_mails = await user1_in_box.methods.mails().call();
            const user2_mails = await user2_out_box.methods.mails().call();

            const user1_mail = user1_mails.mails[0];
            const user2_mail = user2_mails.mails[0];

            const acc1_details = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details._inMailsNum).to.be.eq('1');

            const acc2_details = await acc2.methods.getDetails({answerId: 0}).call();
            expect(acc2_details._outMailsNum).to.be.eq('1');

            expect(user1_mail.meta.toString()).to.be.eq('0x05');
            expect(user1_mail.metaVersion.toString()).to.be.eq('1');
            expect(user2_mail.meta.toString()).to.be.eq('0x04');
            expect(user2_mail.metaVersion.toString()).to.be.eq('1');

            const mail_event = await getEvent(mail_root, 'MailCreated');
            expect(mail_event.sender.toString()).to.be.eq(user2.address.toString());

            const mail_addr: Address = mail_event.mail;

            expect(mail_addr.toString()).to.be.eq(user1_mail.mail.toString());
            expect(mail_addr.toString()).to.be.eq(user2_mail.mail.toString());

            const mail = await locklift.factory.getDeployedContract('Mail', mail_addr);

            const mail_details = await mail.methods.getDetails({answerId: 0}).call();
            expect(mail_details._sender.toString()).to.be.eq(user2.address.toString());

            await locklift.tracing.trace(mail_root.methods.sendMails({
                receivers: [{addr: user1.address, pubkey: 0}],
                encryptedMail: '02',
                metaVersion: 2,
                senderMeta: '0x06',
                receiverMeta: ['0x07'],
                send_gas_to: user2.address
            }).send({from: user2.address, amount: toNano(1.5)}));

            const acc1_details_1 = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details_1._inMailsNum).to.be.eq('2');

            const acc2_details_2 = await acc2.methods.getDetails({answerId: 0}).call();
            expect(acc2_details_2._outMailsNum).to.be.eq('2');

            const user1_mails_1 = await user1_in_box.methods.mails().call();
            const user2_mails_1 = await user2_out_box.methods.mails().call();

            const user1_mail_1 = user1_mails_1.mails[1];
            const user2_mail_1 = user2_mails_1.mails[1];

            expect(user1_mail_1.meta.toString()).to.be.eq('0x07');
            expect(user1_mail_1.metaVersion.toString()).to.be.eq('2');
            expect(user2_mail_1.meta.toString()).to.be.eq('0x06');
            expect(user2_mail_1.metaVersion.toString()).to.be.eq('2');

            const mail_event_1 = await getEvent(mail_root, 'MailCreated');
            expect(mail_event_1.sender.toString()).to.be.eq(user2.address.toString());

            const mail_addr_1: Address = mail_event_1.mail;

            expect(mail_addr_1.toString()).to.be.eq(user1_mail_1.mail.toString());
            expect(mail_addr_1.toString()).to.be.eq(user2_mail_1.mail.toString());

            const mail_1 = await locklift.factory.getDeployedContract('Mail', mail_addr_1);

            const mail_details_1 = await mail_1.methods.getDetails({answerId: 0}).call();
            expect(mail_details_1._sender.toString()).to.be.eq(user2.address.toString());
        })

        it('Send 2 mails from address1 to pubkey1', async function() {
            const acc1_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, user: {pubkey: 0, addr: user1.address}}).call();
            const acc3_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, user: {pubkey: pubkey1, addr: zeroAddress}}).call();

            const {traceTree} = await locklift.tracing.trace(
                mail_root.methods.sendMails({
                    receivers: [{addr: zeroAddress, pubkey: pubkey1}],
                    encryptedMail: '05',
                    metaVersion: 3,
                    senderMeta: '0x08',
                    receiverMeta: ['0x09'],
                    send_gas_to: user1.address
            }).send({from: user1.address, amount: toNano(1.5)}),
            {allowedCodes: {contracts: {[acc1_addr.value0.toString()]: {compute: [null]}, [acc3_addr.value0.toString()]: {compute: [null]}}}}
            );
            // await traceTree?.beautyPrint();

            acc3 = await locklift.factory.getDeployedContract('MailAccount', acc3_addr.value0);

            const user3_in_box_addr = await acc3.methods.calculateMailBoxAddress({answerId: 0, mail_num: 1, _type: 0}).call();
            user3_in_box = await locklift.factory.getDeployedContract('MailBox', user3_in_box_addr.value0);

            const user1_mails = await user1_out_box.methods.mails().call();
            const user3_mails = await user3_in_box.methods.mails().call();

            const user1_mail = user1_mails.mails[2];
            const user3_mail = user3_mails.mails[0];

            expect(user1_mail.meta.toString()).to.be.eq('0x08');
            expect(user3_mail.meta.toString()).to.be.eq('0x09');

            const acc1_details = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details._outMailsNum).to.be.eq('3');

            const acc3_details = await acc3.methods.getDetails({answerId: 0}).call();
            expect(acc3_details._inMailsNum).to.be.eq('1');

            const mail_event = await getEvent(mail_root, 'MailCreated');
            expect(mail_event.sender.toString()).to.be.eq(user1.address.toString());

            expect(mail_event.mail.toString()).to.be.eq(user1_mail.mail.toString());
            expect(mail_event.mail.toString()).to.be.eq(user3_mail.mail.toString());

            const mail = await locklift.factory.getDeployedContract('Mail', mail_event.mail);

            const mail_details = await mail.methods.getDetails({answerId: 0}).call();
            expect(mail_details._sender.toString()).to.be.eq(user1.address.toString());

            await locklift.tracing.trace(
                mail_root.methods.sendMails({
                    receivers: [{addr: zeroAddress, pubkey: pubkey1}],
                    encryptedMail: '05',
                    metaVersion: 3,
                    senderMeta: '0x10',
                    receiverMeta: ['0x11'],
                    send_gas_to: user1.address
                }).send({from: user1.address, amount: toNano(1.5)})
            );

            const user1_mails_1 = await user1_out_box.methods.mails().call();
            const user3_mails_1 = await user3_in_box.methods.mails().call();

            const user1_mail_1 = user1_mails_1.mails[3];
            const user3_mail_1 = user3_mails_1.mails[1];

            expect(user1_mail_1.meta.toString()).to.be.eq('0x10');
            expect(user3_mail_1.meta.toString()).to.be.eq('0x11');

            const acc1_details_1 = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details_1._outMailsNum).to.be.eq('4');

            const acc3_details_1 = await acc3.methods.getDetails({answerId: 0}).call();
            expect(acc3_details_1._inMailsNum).to.be.eq('2');

            const mail_event_1 = await getEvent(mail_root, 'MailCreated');
            expect(mail_event_1.sender.toString()).to.be.eq(user1.address.toString());

            expect(mail_event_1.mail.toString()).to.be.eq(user1_mail_1.mail.toString());
            expect(mail_event_1.mail.toString()).to.be.eq(user3_mail_1.mail.toString());

            const mail_1 = await locklift.factory.getDeployedContract('Mail', mail_event_1.mail);

            const mail_details_1 = await mail_1.methods.getDetails({answerId: 0}).call();
            expect(mail_details_1._sender.toString()).to.be.eq(user1.address.toString());

        });
    });
});
