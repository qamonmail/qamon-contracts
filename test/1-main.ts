import {expect} from "chai";
import {Contract, getRandomNonce, toNano, zeroAddress} from "locklift";
import {MailAccountAbi, MailBoxAbi, MailRootAbi} from "../build/factorySource";
import {Account} from 'locklift/everscale-standalone-client';
import {deployUser, getEvent} from "./utils";

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
            mail_root = _root;
        });
    });

    describe("Testing scenarios", async function () {
        let acc1: Contract<MailAccountAbi>, acc2: Contract<MailAccountAbi>, acc3: Contract<MailAccountAbi>;
        let user1_out_box: Contract<MailBoxAbi>, user2_out_box: Contract<MailBoxAbi>, user3_in_box: Contract<MailBoxAbi>;
        let user1_in_box: Contract<MailBoxAbi>, user2_in_box: Contract<MailBoxAbi>;

        it("Send 2 mails from address1 to address2", async function () {
            const acc1_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, _pubkey: 0, _user: user1.address}).call();
            const acc2_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, _pubkey: 0, _user: user2.address}).call();

            await locklift.tracing.trace(
                mail_root.methods.sendMailAddress({
                    receiver: user2.address, encryptedByReceiverMail: '01', encryptedBySenderMail: '02', send_gas_to: user1.address
                }).send({from: user1.address, amount: toNano(1.5)}),
                {allowedCodes: {contracts: {[acc1_addr.value0.toString()]: {compute: [null]}, [acc2_addr.value0.toString()]: {compute: [null]}}}}
            );
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

            const user1_mail = user1_mails.mails[0];
            const user2_mail = user2_mails.mails[0];

            const acc1_details = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details._outMailsNum).to.be.eq('1');

            const acc2_details = await acc2.methods.getDetails({answerId: 0}).call();
            expect(acc2_details._inMailsNum).to.be.eq('1');

            const mail_event = await getEvent(mail_root, 'MailPairCreated');
            expect(mail_event.sender.toString()).to.be.eq(user1.address.toString());
            expect(mail_event.receiver.toString()).to.be.eq(user2.address.toString());

            const mail_receiver_addr = mail_event.mailEncryptedReceiver;
            const mail_sender_addr = mail_event.mailEncryptedSender;

            expect(mail_sender_addr.toString()).to.be.eq(user1_mail.toString());
            expect(mail_receiver_addr.toString()).to.be.eq(user2_mail.toString());

            const mail_receiver = await locklift.factory.getDeployedContract('Mail', mail_receiver_addr);
            const mail_sender = await locklift.factory.getDeployedContract('Mail', mail_sender_addr);

            const mail_receiver_details = await mail_receiver.methods.getDetails({answerId: 0}).call();
            const mail_sender_details = await mail_sender.methods.getDetails({answerId: 0}).call();

            expect(mail_receiver_details._mirror_mail.toString()).to.be.eq(mail_sender.address.toString());
            expect(mail_sender_details._mirror_mail.toString()).to.be.eq(mail_receiver.address.toString());

            expect(mail_receiver_details._receiver.toString()).to.be.eq(user2.address.toString());
            expect(mail_receiver_details._sender.toString()).to.be.eq(user1.address.toString());

            expect(mail_sender_details._receiver.toString()).to.be.eq(user2.address.toString());
            expect(mail_sender_details._sender.toString()).to.be.eq(user1.address.toString());

            await locklift.tracing.trace(mail_root.methods.sendMailAddress({
                receiver: user2.address, encryptedByReceiverMail: '03', encryptedBySenderMail: '04', send_gas_to: user1.address
            }).send({from: user1.address, amount: toNano(1.5)}));

            const acc1_details_1 = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details_1._outMailsNum).to.be.eq('2');

            const acc2_details_2 = await acc2.methods.getDetails({answerId: 0}).call();
            expect(acc2_details_2._inMailsNum).to.be.eq('2');

            const user1_mails_1 = await user1_out_box.methods.mails().call();
            const user2_mails_1 = await user2_in_box.methods.mails().call();

            const user1_mail_1 = user1_mails_1.mails[1];
            const user2_mail_1 = user2_mails_1.mails[1];

            const mail_event_1 = await getEvent(mail_root, 'MailPairCreated');
            expect(mail_event_1.sender.toString()).to.be.eq(user1.address.toString());
            expect(mail_event_1.receiver.toString()).to.be.eq(user2.address.toString());

            const mail_receiver_addr_1 = mail_event_1.mailEncryptedReceiver;
            const mail_sender_addr_1 = mail_event_1.mailEncryptedSender;

            expect(mail_sender_addr_1.toString()).to.be.eq(user1_mail_1.toString());
            expect(mail_receiver_addr_1.toString()).to.be.eq(user2_mail_1.toString());

            const mail_receiver_1 = await locklift.factory.getDeployedContract('Mail', mail_receiver_addr_1);
            const mail_sender_1 = await locklift.factory.getDeployedContract('Mail', mail_sender_addr_1);

            const mail_receiver_details_1 = await mail_receiver_1.methods.getDetails({answerId: 0}).call();
            const mail_sender_details_1 = await mail_sender_1.methods.getDetails({answerId: 0}).call();

            expect(mail_receiver_details_1._mirror_mail.toString()).to.be.eq(mail_sender_1.address.toString());
            expect(mail_sender_details_1._mirror_mail.toString()).to.be.eq(mail_receiver_1.address.toString());

            expect(mail_receiver_details_1._receiver.toString()).to.be.eq(user2.address.toString());
            expect(mail_receiver_details_1._sender.toString()).to.be.eq(user1.address.toString());

            expect(mail_sender_details_1._receiver.toString()).to.be.eq(user2.address.toString());
            expect(mail_sender_details_1._sender.toString()).to.be.eq(user1.address.toString());
        });

        it('Send 2 mails from address2 to address1', async function() {
            await locklift.tracing.trace(mail_root.methods.sendMailAddress({
                receiver: user1.address, encryptedByReceiverMail: '05', encryptedBySenderMail: '06', send_gas_to: user2.address
            }).send({from: user2.address, amount: toNano(1)}));

            const acc1_details = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details._inMailsNum).to.be.eq('1');

            const acc2_details = await acc2.methods.getDetails({answerId: 0}).call();
            expect(acc2_details._outMailsNum).to.be.eq('1');

            const user1_mails = await user1_in_box.methods.mails().call();
            const user2_mails = await user2_out_box.methods.mails().call();

            const user1_mail = user1_mails.mails[0];
            const user2_mail = user2_mails.mails[0];

            const mail_event = await getEvent(mail_root, 'MailPairCreated');
            expect(mail_event.sender.toString()).to.be.eq(user2.address.toString());
            expect(mail_event.receiver.toString()).to.be.eq(user1.address.toString());

            const mail_receiver_addr = mail_event.mailEncryptedReceiver;
            const mail_sender_addr = mail_event.mailEncryptedSender;

            expect(mail_sender_addr.toString()).to.be.eq(user2_mail.toString());
            expect(mail_receiver_addr.toString()).to.be.eq(user1_mail.toString());

            const mail_receiver = await locklift.factory.getDeployedContract('Mail', mail_receiver_addr);
            const mail_sender = await locklift.factory.getDeployedContract('Mail', mail_sender_addr);

            const mail_receiver_details = await mail_receiver.methods.getDetails({answerId: 0}).call();
            const mail_sender_details = await mail_sender.methods.getDetails({answerId: 0}).call();

            expect(mail_receiver_details._mirror_mail.toString()).to.be.eq(mail_sender.address.toString());
            expect(mail_sender_details._mirror_mail.toString()).to.be.eq(mail_receiver.address.toString());

            expect(mail_receiver_details._receiver.toString()).to.be.eq(user1.address.toString());
            expect(mail_receiver_details._sender.toString()).to.be.eq(user2.address.toString());

            expect(mail_sender_details._receiver.toString()).to.be.eq(user1.address.toString());
            expect(mail_sender_details._sender.toString()).to.be.eq(user2.address.toString());

            await locklift.tracing.trace(mail_root.methods.sendMailAddress({
                receiver: user1.address, encryptedByReceiverMail: '07', encryptedBySenderMail: '08', send_gas_to: user2.address
            }).send({from: user2.address, amount: toNano(1)}));

            const acc1_details_1 = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details_1._inMailsNum).to.be.eq('2');

            const acc2_details_1 = await acc2.methods.getDetails({answerId: 0}).call();
            expect(acc2_details_1._outMailsNum).to.be.eq('2');

            const user1_mails_1 = await user1_in_box.methods.mails().call();
            const user2_mails_1 = await user2_out_box.methods.mails().call();

            const user1_mail_1 = user1_mails_1.mails[1];
            const user2_mail_1 = user2_mails_1.mails[1];

            const mail_event_1 = await getEvent(mail_root, 'MailPairCreated');
            expect(mail_event_1.sender.toString()).to.be.eq(user2.address.toString());
            expect(mail_event_1.receiver.toString()).to.be.eq(user1.address.toString());

            const mail_receiver_addr_1 = mail_event_1.mailEncryptedReceiver;
            const mail_sender_addr_1 = mail_event_1.mailEncryptedSender;

            expect(mail_sender_addr_1.toString()).to.be.eq(user2_mail_1.toString());
            expect(mail_receiver_addr_1.toString()).to.be.eq(user1_mail_1.toString());

            const mail_receiver_1 = await locklift.factory.getDeployedContract('Mail', mail_receiver_addr_1);
            const mail_sender_1 = await locklift.factory.getDeployedContract('Mail', mail_sender_addr_1);

            const mail_receiver_details_1 = await mail_receiver_1.methods.getDetails({answerId: 0}).call();
            const mail_sender_details_1 = await mail_sender_1.methods.getDetails({answerId: 0}).call();

            expect(mail_receiver_details_1._mirror_mail.toString()).to.be.eq(mail_sender_1.address.toString());
            expect(mail_sender_details_1._mirror_mail.toString()).to.be.eq(mail_receiver_1.address.toString());

            expect(mail_receiver_details_1._receiver.toString()).to.be.eq(user1.address.toString());
            expect(mail_receiver_details_1._sender.toString()).to.be.eq(user2.address.toString());

            expect(mail_sender_details_1._receiver.toString()).to.be.eq(user1.address.toString());
            expect(mail_sender_details_1._sender.toString()).to.be.eq(user2.address.toString());
        });

        it('Send 2 mails from address1 to pubkey1', async function() {
            const acc1_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, _pubkey: 0, _user: user1.address}).call();
            const acc3_addr = await mail_root.methods.getMailAccountAddress({answerId: 0, _pubkey: pubkey1, _user: zeroAddress}).call();

            await locklift.tracing.trace(
                mail_root.methods.sendMailPubkey({
                pubkey: pubkey1, encryptedByReceiverMail: '09', encryptedBySenderMail: '10', send_gas_to: user1.address
            }).send({from: user1.address, amount: toNano(1.5)}),
            {allowedCodes: {contracts: {[acc1_addr.value0.toString()]: {compute: [null]}, [acc3_addr.value0.toString()]: {compute: [null]}}}}
            );

            acc3 = await locklift.factory.getDeployedContract('MailAccount', acc3_addr.value0);

            const user3_in_box_addr = await acc3.methods.calculateMailBoxAddress({answerId: 0, mail_num: 1, _type: 0}).call();
            user3_in_box = await locklift.factory.getDeployedContract('MailBox', user3_in_box_addr.value0);

            const user1_mails = await user1_out_box.methods.mails().call();
            const user3_mails = await user3_in_box.methods.mails().call();

            const user1_mail = user1_mails.mails[2];
            const user3_mail = user3_mails.mails[0];

            const acc1_details = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details._outMailsNum).to.be.eq('3');

            const acc3_details = await acc3.methods.getDetails({answerId: 0}).call();
            expect(acc3_details._inMailsNum).to.be.eq('1');

            const mail_event = await getEvent(mail_root, 'MailPairCreated');
            expect(mail_event.sender.toString()).to.be.eq(user1.address.toString());
            expect(mail_event.receiver.toString()).to.be.eq(zeroAddress.toString());
            expect(mail_event.receiver_pubkey.toString()).to.be.eq(pubkey1.toString());

            const mail_receiver_addr = mail_event.mailEncryptedReceiver;
            const mail_sender_addr = mail_event.mailEncryptedSender;

            expect(mail_sender_addr.toString()).to.be.eq(user1_mail.toString());
            expect(mail_receiver_addr.toString()).to.be.eq(user3_mail.toString());

            const mail_receiver = await locklift.factory.getDeployedContract('Mail', mail_receiver_addr);
            const mail_sender = await locklift.factory.getDeployedContract('Mail', mail_sender_addr);

            const mail_receiver_details = await mail_receiver.methods.getDetails({answerId: 0}).call();
            const mail_sender_details = await mail_sender.methods.getDetails({answerId: 0}).call();

            expect(mail_receiver_details._mirror_mail.toString()).to.be.eq(mail_sender.address.toString());
            expect(mail_sender_details._mirror_mail.toString()).to.be.eq(mail_receiver.address.toString());

            expect(mail_receiver_details._receiver.toString()).to.be.eq(zeroAddress.toString());
            expect(mail_receiver_details._sender.toString()).to.be.eq(user1.address.toString());
            expect(mail_receiver_details._receiver_pubkey.toString()).to.be.eq(pubkey1.toString());

            expect(mail_sender_details._receiver.toString()).to.be.eq(zeroAddress.toString());
            expect(mail_sender_details._sender.toString()).to.be.eq(user1.address.toString());
            expect(mail_sender_details._receiver_pubkey.toString()).to.be.eq(pubkey1.toString());

            await locklift.tracing.trace(
                mail_root.methods.sendMailPubkey({
                    pubkey: pubkey1, encryptedByReceiverMail: '11', encryptedBySenderMail: '12', send_gas_to: user1.address
                }).send({from: user1.address, amount: toNano(1.5)})
            );

            const user1_mails_1 = await user1_out_box.methods.mails().call();
            const user3_mails_1 = await user3_in_box.methods.mails().call();

            const user1_mail_1 = user1_mails_1.mails[3];
            const user3_mail_1 = user3_mails_1.mails[1];

            const acc1_details_1 = await acc1.methods.getDetails({answerId: 0}).call();
            expect(acc1_details_1._outMailsNum).to.be.eq('4');

            const acc3_details_1 = await acc3.methods.getDetails({answerId: 0}).call();
            expect(acc3_details_1._inMailsNum).to.be.eq('2');

            const mail_event_1 = await getEvent(mail_root, 'MailPairCreated');
            expect(mail_event_1.sender.toString()).to.be.eq(user1.address.toString());
            expect(mail_event_1.receiver.toString()).to.be.eq(zeroAddress.toString());
            expect(mail_event_1.receiver_pubkey.toString()).to.be.eq(pubkey1.toString());

            const mail_receiver_addr_1 = mail_event_1.mailEncryptedReceiver;
            const mail_sender_addr_1 = mail_event_1.mailEncryptedSender;

            expect(mail_sender_addr_1.toString()).to.be.eq(user1_mail_1.toString());
            expect(mail_receiver_addr_1.toString()).to.be.eq(user3_mail_1.toString());

            const mail_receiver_1 = await locklift.factory.getDeployedContract('Mail', mail_receiver_addr_1);
            const mail_sender_1 = await locklift.factory.getDeployedContract('Mail', mail_sender_addr_1);

            const mail_receiver_details_1 = await mail_receiver_1.methods.getDetails({answerId: 0}).call();
            const mail_sender_details_1 = await mail_sender_1.methods.getDetails({answerId: 0}).call();

            expect(mail_receiver_details_1._mirror_mail.toString()).to.be.eq(mail_sender_1.address.toString());
            expect(mail_sender_details_1._mirror_mail.toString()).to.be.eq(mail_receiver_1.address.toString());

            expect(mail_receiver_details_1._receiver.toString()).to.be.eq(zeroAddress.toString());
            expect(mail_receiver_details_1._sender.toString()).to.be.eq(user1.address.toString());
            expect(mail_receiver_details_1._receiver_pubkey.toString()).to.be.eq(pubkey1.toString());

            expect(mail_sender_details_1._receiver.toString()).to.be.eq(zeroAddress.toString());
            expect(mail_sender_details_1._sender.toString()).to.be.eq(user1.address.toString());
            expect(mail_sender_details_1._receiver_pubkey.toString()).to.be.eq(pubkey1.toString());
        });
    });
});
