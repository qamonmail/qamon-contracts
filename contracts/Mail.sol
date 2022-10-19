pragma ever-solidity ^0.62.0;


import "@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "./libraries/Errors.sol";
import "locklift/src/console.sol";


contract Mail {
    address static root;
    uint128 static nonce;
    address sender;
    address receiver;
    uint receiver_pubkey;
    address mirror_mail;
    bytes body;

    constructor(
        bytes _body, address _sender, address _receiver,
        uint256 _receiver_pubkey, address _mirror_mail
    ) public {
        require (msg.sender == root, Errors.NOT_ROOT);

        body = _body;
        sender = _sender;
        receiver = _receiver;
        receiver_pubkey = _receiver_pubkey;
        mirror_mail = _mirror_mail;
    }

    function getDetails() external view responsible returns (
        address _root,
        uint128 _nonce,
        address _sender,
        address _receiver,
        uint _receiver_pubkey,
        address _mirror_mail,
        bytes _body
    ) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } (
            root, nonce, sender, receiver, receiver_pubkey, mirror_mail, body
        );
    }
}
