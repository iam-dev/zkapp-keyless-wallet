# Mina zkApp Keyless Wallet

Introducing zkApp Keyless Wallet - the smart contract wallet that offers effortless security for your cryptocurrency. In a market where wallet security and usability are major concerns, zkApp Keyless Wallet provides an easy-to-use and secure solution. Our mobile-ready wallet uses Social Recovery and SmartOTP's, allowing users to restore access without revealing any personal information, using zero-knowledge proof. We also enable advanced security features like social recovery, plus, our integration of Google Auth ensures familiarity and secure transactions. zkApp Keyless Wallet is designed for both seasoned cryptocurrency experts and newcomers, offering a smooth and hassle-free experience. With zkApp Keyless Wallet , you have full custody and self-control of your wallet. Don't risk losses or thefts, make the smart choice with zkApp Keyless Wallet .

## How it is supposed to work

### Social Recovery

1. Each Guardian commitments state within a merkle tree root.
2. Every Guardian in the merkletree can preform a Wallet Recovery.
3. User stores a hash secret to start a recovery process without using a private key with the new wallet address.
4. (Optional) Main Guardian of the user, can be guard by Smart OTP/password/social login
5. It needs at least 50% + 1 to execute the recovery.
6. Each Guardian can only perform the recovery proces once.
7. The funds will be send to a new deployed wallet after recovery proces

### Smart OTP's

1. Implement with Merkle inclusion proof
2. During setup, a secret seed thus a list of future timestamps and the corresponding TOTPs (currently 2^7=128 ~ 1 hour) are generated.
3. Hashed the list of OTP's together to form the leaves of a 7-layer Merkle tree, and the Merkle root is committed onto the blockchain.
4. The secret seed will then be discarded after the user adds it to their Google Authenticator app.

## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)
