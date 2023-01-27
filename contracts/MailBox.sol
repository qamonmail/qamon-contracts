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

    struct Mail {
        address receiver;
        address sender;
        address mailAddress;
    }

    Mail[] public mails;

    constructor() public {
        require (msg.sender == root, Errors.NOT_ROOT);
    }

    function getDetails() external view responsible returns (
        address _root,
        uint128 _nonce,
        IMailAccount.MailBoxType _boxType,
        uint128 _mailsNum
    ) {
        return (root, nonce, boxType, mailsNum);
    }

    function getMail(uint idx) external view responsible returns (address) {
        return mails[idx].mailAddress;
    }

    function saveMail(address receiver, address sender, address mail) external override {
        require (msg.sender == root, Errors.NOT_ROOT);

        mails.push(Mail({
            receiver: receiver,
            sender: sender,
            mailAddress: mail
        }));

        mailsNum++;
    }
}
