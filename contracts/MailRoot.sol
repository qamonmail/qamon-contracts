pragma ever-solidity ^0.62.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "@broxus/contracts/contracts/utils/RandomNonce.sol";
import "@broxus/contracts/contracts/access/InternalOwner.sol";
import "./libraries/Errors.sol";
import "./libraries/Gas.sol";
import "./interfaces/IMailAccount.sol";
import "./interfaces/IMailRoot.sol";
import "./MailAccount.sol";
import "./Mail.sol";


contract MailRoot is IMailRoot, RandomNonce {
    TvmCell static accountCode;
    TvmCell static mailBoxCode;
    TvmCell static mailCode;
    uint32 public mailCount = 0;
    event MailPairCreated(address sender, address receiver, uint receiver_pubkey, address mailEncryptedReceiver, address mailEncryptedSender);

    struct PendingMail {
        address user;
        uint pubkey;
        address mail;
        address send_gas_to;
    }
    uint32 _mail_nonce = 0;
    mapping (uint32 => PendingMail) _pending_mails;
    uint128 constant CONTRACT_MIN_BALANCE = 1 ever;

    constructor () public {
        require (tvm.pubkey() != 0, Errors.WRONG_PUBKEY);
        require (tvm.pubkey() == msg.pubkey(), Errors.WRONG_PUBKEY);
        tvm.accept();
    }

    function _reserve() internal pure returns (uint128) {
        return math.max(address(this).balance - msg.value, CONTRACT_MIN_BALANCE);
    }

    function _deployMailPair(
        address receiver, uint256 pubkey, bytes encryptedByReceiverMail, bytes encryptedBySenderMail
    ) internal returns (address mail_receiver, address mail_sender) {
        address mail_1_expected = getMailAddress(mailCount);
        address mail_2_expected = getMailAddress(mailCount + 1);

        mail_receiver = _deployMail(mailCount, encryptedByReceiverMail, msg.sender, receiver, pubkey, mail_2_expected);
        // just to proof that everything is calculated correctly
        require (mail_1_expected == mail_receiver, Errors.BAD_MAIL_ADDRESS);

        mail_sender = _deployMail(mailCount + 1, encryptedBySenderMail, msg.sender, receiver, pubkey, mail_1_expected);
        // 1 more proof
        require (mail_2_expected == mail_sender, Errors.BAD_MAIL_ADDRESS);

        mailCount += 2;

        emit MailPairCreated(msg.sender, receiver, pubkey, mail_receiver, mail_sender);
    }

    function _saveOutMail(address mail, address send_gas_to) internal {
        address sender_mail_account = getMailAccountAddress(msg.sender, 0);
        _mail_nonce += 1;
        _pending_mails[_mail_nonce] = PendingMail(msg.sender, 0, mail, send_gas_to);
        IMailAccount(sender_mail_account).saveOutMailAddress{value: Gas.SAVE_MAIL_VALUE}(_mail_nonce, mail);
    }

    function _saveInMail(address receiver, uint256 pubkey, address mail, address send_gas_to) internal {
        address receiver_mail_account = getMailAccountAddress(receiver, pubkey);
        _mail_nonce += 1;
        _pending_mails[_mail_nonce] = PendingMail(receiver, pubkey, mail, send_gas_to);
        IMailAccount(receiver_mail_account).saveInMailAddress{value: Gas.SAVE_MAIL_VALUE}(_mail_nonce, mail);
    }

    function sendMailAddress(address receiver, bytes encryptedByReceiverMail, bytes encryptedBySenderMail, address send_gas_to) external {
        require (msg.value >= Gas.MAIL_DEPLOY_VALUE * 2 + Gas.SAVE_MAIL_VALUE * 2 + 0.05 ever, Errors.LOW_MSG_VALUE);
        tvm.rawReserve(_reserve(), 0);

        (address mail_receiver, address mail_sender) = _deployMailPair(receiver, 0, encryptedByReceiverMail, encryptedBySenderMail);

        _saveOutMail(mail_sender, send_gas_to);
        _saveInMail(receiver, 0, mail_receiver, send_gas_to);

        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function sendMailPubkey(uint256 pubkey, bytes encryptedByReceiverMail, bytes encryptedBySenderMail, address send_gas_to) external {
        require (msg.value >= Gas.MAIL_DEPLOY_VALUE * 2 + Gas.SAVE_MAIL_VALUE * 2 + 0.05 ever, Errors.LOW_MSG_VALUE);
        tvm.rawReserve(_reserve(), 0);

        address zero_receiver = address.makeAddrStd(address(this).wid, 0);
        (address mail_receiver, address mail_sender) = _deployMailPair(zero_receiver, pubkey, encryptedByReceiverMail, encryptedBySenderMail);

        _saveOutMail(mail_sender, send_gas_to);
        _saveInMail(zero_receiver, pubkey, mail_receiver, send_gas_to);

        send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function onMailSaved(uint32 nonce) external override {
        tvm.rawReserve(_reserve(), 0);

        PendingMail _mail = _pending_mails[nonce];
        address mail_acc = getMailAccountAddress(_mail.user, _mail.pubkey);

        require (msg.sender == mail_acc, Errors.NOT_MAIL_ACC);

        delete _pending_mails[nonce];
        _mail.send_gas_to.transfer({ value: 0, bounce: false, flag: MsgFlag.ALL_NOT_RESERVED });
    }

    function getMailAccountAddress(address _user, uint256 _pubkey) public view responsible returns (address) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } address(
            tvm.hash(_buildAccountInitData(_user, _pubkey))
        );
    }

    function _buildAccountInitData(address _user, uint256 _pubkey) internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: MailAccount,
            varInit: {
                root: address(this),
                user: _user,
                pubkey: _pubkey,
                mailBoxCode: mailBoxCode
            },
            pubkey: 0,
            code: accountCode
        });
    }

    function _deployMailAccount(address _user, uint256 _pubkey, address send_gas_to) internal view returns (address) {
        return new MailAccount{
            stateInit: _buildAccountInitData(_user, _pubkey),
            value: Gas.ACCOUNT_DEPLOY_VALUE
        }(send_gas_to);
    }

    function _buildMailInitData(uint128 _nonce) internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: Mail,
            varInit: {
                root: address(this),
                nonce: _nonce
            },
            pubkey: 0,
            code: mailCode
        });
    }

    function _deployMail(
        uint128 _nonce,
        bytes body,
        address sender,
        address receiver,
        uint receiver_pubkey,
        address mirror_mail
    ) internal view returns (address) {
        return new Mail{
            stateInit: _buildMailInitData(_nonce),
            value: Gas.MAIL_DEPLOY_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }(body, sender, receiver, receiver_pubkey, mirror_mail);
    }

    function getMailAddress(uint128 _nonce) public view responsible returns (address) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } address(
            tvm.hash(_buildMailInitData(_nonce))
        );
    }

    onBounce(TvmSlice slice) external view {
        tvm.accept();

        uint32 functionId = slice.decode(uint32);
        // if processing failed - contract was not deployed. Deploy and try again
        if (functionId == tvm.functionId(IMailAccount.saveOutMailAddress)) {
            tvm.rawReserve(_reserve(), 0);

            uint32 _nonce = slice.decode(uint32);
            PendingMail _mail = _pending_mails[_nonce];
            address mail_acc = _deployMailAccount(_mail.user, _mail.pubkey, _mail.send_gas_to);

            IMailAccount(mail_acc).saveOutMailAddress{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                _nonce, _mail.mail
            );
        } else if (functionId == tvm.functionId(IMailAccount.saveInMailAddress)) {
            tvm.rawReserve(_reserve(), 0);

            uint32 _nonce = slice.decode(uint32);
            PendingMail _mail = _pending_mails[_nonce];
                address mail_acc = _deployMailAccount(_mail.user, _mail.pubkey, _mail.send_gas_to);

            IMailAccount(mail_acc).saveInMailAddress{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(
                _nonce, _mail.mail
            );
        }
    }
}
