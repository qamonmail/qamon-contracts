pragma ever-solidity ^0.62.0;


import "./interfaces/IMailAccount.sol";
import "./interfaces/IMailBox.sol";
import "./libraries/Errors.sol";
import "@broxus/contracts/contracts/libraries/MsgFlag.tsol";
import "locklift/src/console.tsol";


contract MailBox is IMailBox {
    address static root;
    uint128 static nonce;
    IMailAccount.MailBoxType static boxType;
    uint128 mailsNum = 0;
    address[] public mails;

    constructor() public {
        require (msg.sender == root, Errors.NOT_ROOT);
    }

    function getDetails() external view responsible returns (
        address _root,
        uint128 _nonce,
        IMailAccount.MailBoxType _boxType,
        uint128 _mailsNum
    ) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false }(root, nonce, boxType, mailsNum);
    }

    function getMail(uint idx) external view responsible returns (address) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false }mails[idx];
    }

    function saveMail(address mail) external override {
        require (msg.sender == root, Errors.NOT_ROOT);

        mails.push(mail);
        mailsNum++;
    }
}
