pragma ever-solidity ^0.62.0;


interface IMailBox {
    function saveMail(address recipient, address sender, address mail) external;
}
