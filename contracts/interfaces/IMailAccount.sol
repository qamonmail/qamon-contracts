pragma ever-solidity ^0.62.0;


interface IMailAccount {
    enum MailBoxType {
        Inbox,
        Outbox
    }

    function saveInMailAddress(uint32 nonce, address mail) external;
    function saveOutMailAddress( uint32 nonce, address mail) external;
}
