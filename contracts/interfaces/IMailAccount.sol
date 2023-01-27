pragma ever-solidity ^0.62.0;


interface IMailAccount {
    enum MailBoxType {
        Inbox,
        Outbox
    }

    function saveInMailAddress(address receiver, address sender, uint32 nonce, address mail) external;
    function saveOutMailAddress(address receiver, address sender, uint32 nonce, address mail) external;
}
