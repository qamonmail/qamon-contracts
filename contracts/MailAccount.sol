pragma ever-solidity ^0.62.0;


import "./MailBox.sol";
import "./interfaces/IMailAccount.sol";
import "./interfaces/IMailBox.sol";
import "./interfaces/IMailRoot.sol";
import "./libraries/Gas.sol";
import "./libraries/Errors.sol";
import "@broxus/contracts/contracts/libraries/MsgFlag.tsol";


contract MailAccount is IMailAccount {
    address static root;
    address static user;
    uint static pubkey;
    TvmCell static public mailBoxCode;

    uint128 inMailsNum = 0;
    uint128 outMailsNum = 0;

    uint32 constant MAX_MAILS_PER_BOX = 1000;
    uint128 constant CONTRACT_MIN_BALANCE = 0.1 ever;

    event InMail(address mail);
    event OutMail(address mail);

    constructor (address send_gas_to) public onlyRoot {}

    function _reserve() internal pure returns (uint128) {
        return math.max(address(this).balance - msg.value, CONTRACT_MIN_BALANCE);
    }

    modifier onlyRoot() {
        require (msg.sender == root, Errors.NOT_ROOT);
        _;
    }

    function getDetails() external view responsible returns (
        address _root,
        address _user,
        uint _pubkey,
        uint128 _inMailsNum,
        uint128 _outMailsNum
    ) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false }(root, user, pubkey, inMailsNum, outMailsNum);
    }

    function saveInMailAddress(address receiver, address sender, uint32 nonce, address mail) external override onlyRoot {
        tvm.rawReserve(_reserve(), 0);

        address box = getOrCreateMailBox(inMailsNum, MailBoxType.Inbox);
        inMailsNum++;

        emit InMail(mail);
        IMailBox(box).saveMail{value: 0.01 ever}(receiver, sender, mail);
        IMailRoot(root).onMailSaved{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(nonce);
    }

    function saveOutMailAddress(address receiver, address sender, uint32 nonce, address mail) external override onlyRoot {
        tvm.rawReserve(_reserve(), 0);

        address box = getOrCreateMailBox(outMailsNum, MailBoxType.Outbox);
        outMailsNum++;

        emit OutMail(mail);
        IMailBox(box).saveMail{value: 0.01 ever}(receiver, sender, mail);
        IMailRoot(root).onMailSaved{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(nonce);
    }

    function getOrCreateMailBox(uint128 mail_num, MailBoxType _type) internal view returns (address) {
        uint128 _nonce = mail_num / MAX_MAILS_PER_BOX;
        if (mail_num % MAX_MAILS_PER_BOX == 0) {
            // first mail in box
            return _deployMailBox(_nonce, _type);
        }
        return getMailBoxAddress(_nonce, _type);
    }

    function calculateMailBoxAddress(uint128 mail_num, MailBoxType _type) public view responsible returns (address) {
        uint128 _nonce = mail_num / MAX_MAILS_PER_BOX;
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false }getMailBoxAddress(_nonce, _type);
    }

    function getMailBoxAddress(uint128 _nonce, MailBoxType _type) public view responsible returns (address) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } address(
            tvm.hash(_buildMailBoxInitData(_nonce, _type))
        );
    }

    function _buildMailBoxInitData(uint128 _nonce, MailBoxType _type) internal view returns (TvmCell) {
        return tvm.buildStateInit({
            contr: MailBox,
            varInit: {
                root: address(this),
                nonce: _nonce,
                boxType: _type
            },
            pubkey: 0,
            code: mailBoxCode
        });
    }

    function _deployMailBox(uint128 _nonce, MailBoxType _type) internal view returns (address) {
        return new MailBox{
            stateInit: _buildMailBoxInitData(_nonce, _type),
            value: Gas.MAIL_BOX_DEPLOY_VALUE,
            flag: MsgFlag.SENDER_PAYS_FEES
        }();
    }
}
