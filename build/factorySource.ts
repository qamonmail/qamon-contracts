const mailAbi = {"ABIversion":2,"version":"2.2","header":["time"],"functions":[{"name":"constructor","inputs":[{"name":"_body","type":"bytes"},{"name":"_sender","type":"address"},{"name":"_receiver","type":"address"},{"name":"_receiver_pubkey","type":"uint256"},{"name":"_mirror_mail","type":"address"}],"outputs":[]},{"name":"getDetails","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"_root","type":"address"},{"name":"_nonce","type":"uint128"},{"name":"_sender","type":"address"},{"name":"_receiver","type":"address"},{"name":"_receiver_pubkey","type":"uint256"},{"name":"_mirror_mail","type":"address"},{"name":"_body","type":"bytes"}]}],"data":[{"key":1,"name":"root","type":"address"},{"key":2,"name":"nonce","type":"uint128"}],"events":[],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"root","type":"address"},{"name":"nonce","type":"uint128"},{"name":"sender","type":"address"},{"name":"receiver","type":"address"},{"name":"receiver_pubkey","type":"uint256"},{"name":"mirror_mail","type":"address"},{"name":"body","type":"bytes"}]} as const
const mailAccountAbi = {"ABIversion":2,"version":"2.2","header":["time"],"functions":[{"name":"constructor","inputs":[{"name":"send_gas_to","type":"address"}],"outputs":[]},{"name":"getDetails","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"_root","type":"address"},{"name":"_user","type":"address"},{"name":"_pubkey","type":"uint256"},{"name":"_inMailsNum","type":"uint128"},{"name":"_outMailsNum","type":"uint128"}]},{"name":"saveInMailAddress","inputs":[{"name":"nonce","type":"uint32"},{"name":"mail","type":"address"}],"outputs":[]},{"name":"saveOutMailAddress","inputs":[{"name":"nonce","type":"uint32"},{"name":"mail","type":"address"}],"outputs":[]},{"name":"calculateMailBoxAddress","inputs":[{"name":"answerId","type":"uint32"},{"name":"mail_num","type":"uint128"},{"name":"_type","type":"uint8"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"getMailBoxAddress","inputs":[{"name":"answerId","type":"uint32"},{"name":"_nonce","type":"uint128"},{"name":"_type","type":"uint8"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"mailBoxCode","inputs":[],"outputs":[{"name":"mailBoxCode","type":"cell"}]}],"data":[{"key":1,"name":"root","type":"address"},{"key":2,"name":"user","type":"address"},{"key":3,"name":"pubkey","type":"uint256"},{"key":4,"name":"mailBoxCode","type":"cell"}],"events":[{"name":"InMail","inputs":[{"name":"mail","type":"address"}],"outputs":[]},{"name":"OutMail","inputs":[{"name":"mail","type":"address"}],"outputs":[]}],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"root","type":"address"},{"name":"user","type":"address"},{"name":"pubkey","type":"uint256"},{"name":"mailBoxCode","type":"cell"},{"name":"inMailsNum","type":"uint128"},{"name":"outMailsNum","type":"uint128"}]} as const
const mailBoxAbi = {"ABIversion":2,"version":"2.2","header":["time"],"functions":[{"name":"constructor","inputs":[],"outputs":[]},{"name":"getDetails","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"_root","type":"address"},{"name":"_nonce","type":"uint128"},{"name":"_boxType","type":"uint8"},{"name":"_mailsNum","type":"uint128"}]},{"name":"getMail","inputs":[{"name":"answerId","type":"uint32"},{"name":"idx","type":"uint256"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"saveMail","inputs":[{"name":"mail","type":"address"}],"outputs":[]},{"name":"mails","inputs":[],"outputs":[{"name":"mails","type":"address[]"}]}],"data":[{"key":1,"name":"root","type":"address"},{"key":2,"name":"nonce","type":"uint128"},{"key":3,"name":"boxType","type":"uint8"}],"events":[],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"root","type":"address"},{"name":"nonce","type":"uint128"},{"name":"boxType","type":"uint8"},{"name":"mailsNum","type":"uint128"},{"name":"mails","type":"address[]"}]} as const
const mailRootAbi = {"ABIversion":2,"version":"2.2","header":["pubkey","time","expire"],"functions":[{"name":"constructor","inputs":[],"outputs":[]},{"name":"sendMailAddress","inputs":[{"name":"receiver","type":"address"},{"name":"encryptedByReceiverMail","type":"bytes"},{"name":"encryptedBySenderMail","type":"bytes"},{"name":"send_gas_to","type":"address"}],"outputs":[]},{"name":"sendMailPubkey","inputs":[{"name":"pubkey","type":"uint256"},{"name":"encryptedByReceiverMail","type":"bytes"},{"name":"encryptedBySenderMail","type":"bytes"},{"name":"send_gas_to","type":"address"}],"outputs":[]},{"name":"onMailSaved","inputs":[{"name":"nonce","type":"uint32"}],"outputs":[]},{"name":"getMailAccountAddress","inputs":[{"name":"answerId","type":"uint32"},{"name":"_user","type":"address"},{"name":"_pubkey","type":"uint256"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"getMailAddress","inputs":[{"name":"answerId","type":"uint32"},{"name":"_nonce","type":"uint128"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"_randomNonce","inputs":[],"outputs":[{"name":"_randomNonce","type":"uint256"}]},{"name":"mailCount","inputs":[],"outputs":[{"name":"mailCount","type":"uint32"}]}],"data":[{"key":1,"name":"_randomNonce","type":"uint256"},{"key":2,"name":"accountCode","type":"cell"},{"key":3,"name":"mailBoxCode","type":"cell"},{"key":4,"name":"mailCode","type":"cell"}],"events":[{"name":"MailPairCreated","inputs":[{"name":"sender","type":"address"},{"name":"receiver","type":"address"},{"name":"receiver_pubkey","type":"uint256"},{"name":"mailEncryptedReceiver","type":"address"},{"name":"mailEncryptedSender","type":"address"}],"outputs":[]}],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"_randomNonce","type":"uint256"},{"name":"accountCode","type":"cell"},{"name":"mailBoxCode","type":"cell"},{"name":"mailCode","type":"cell"},{"name":"mailCount","type":"uint32"},{"name":"_mail_nonce","type":"uint32"},{"components":[{"name":"user","type":"address"},{"name":"pubkey","type":"uint256"},{"name":"mail","type":"address"},{"name":"send_gas_to","type":"address"}],"name":"_pending_mails","type":"map(uint32,tuple)"}]} as const
const walletAbi = {"ABIversion":2,"version":"2.2","header":["pubkey","time","expire"],"functions":[{"name":"sendTransaction","inputs":[{"name":"dest","type":"address"},{"name":"value","type":"uint128"},{"name":"bounce","type":"bool"},{"name":"flags","type":"uint8"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"transferOwnership","inputs":[{"name":"newOwner","type":"uint256"}],"outputs":[]},{"name":"constructor","inputs":[],"outputs":[]},{"name":"owner","inputs":[],"outputs":[{"name":"owner","type":"uint256"}]},{"name":"_randomNonce","inputs":[],"outputs":[{"name":"_randomNonce","type":"uint256"}]}],"data":[{"key":1,"name":"_randomNonce","type":"uint256"}],"events":[{"name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"uint256"},{"name":"newOwner","type":"uint256"}],"outputs":[]}],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"owner","type":"uint256"},{"name":"_randomNonce","type":"uint256"}]} as const

export const factorySource = {
    Mail: mailAbi,
    MailAccount: mailAccountAbi,
    MailBox: mailBoxAbi,
    MailRoot: mailRootAbi,
    Wallet: walletAbi
} as const

export type FactorySource = typeof factorySource
export type MailAbi = typeof mailAbi
export type MailAccountAbi = typeof mailAccountAbi
export type MailBoxAbi = typeof mailBoxAbi
export type MailRootAbi = typeof mailRootAbi
export type WalletAbi = typeof walletAbi