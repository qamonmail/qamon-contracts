pragma ever-solidity ^0.62.0;


interface IMailRoot {
    function onMailSaved(uint32 nonce) external;
}
