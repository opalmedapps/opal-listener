/**
 * @description Proof of concept of session key encryption.
 * @author Stacey Beard
 */
// eslint-disable-next-line no-underscore-dangle
const _sodium = require('libsodium-wrappers');
const { ENVIRONMENT } = require('../environment');

// Sodium library in its ready state
let sodium;

class SessionKeyManager {
    // { keyType, privateKey, publicKey }
    publicKeyPair;

    async init() {
        await _sodium.ready;
        sodium = _sodium;

        // this.generatePublicKeyPair();
        this.readPublicKeyPair();
    }

    async generatePublicKeyPair() {
        this.publicKeyPair = sodium.crypto_box_keypair();
        this.print();
    }

    async readPublicKeyPair() {
        this.publicKeyPair = {
            keyType: ENVIRONMENT.KEY_TYPE,
            publicKey: sodium.from_hex(ENVIRONMENT.PUBLIC_KEY),
            privateKey: sodium.from_hex(ENVIRONMENT.PRIVATE_KEY),
        };
        console.log('Read keypair from environment file');
        this.print();
    }

    async generateSessionKeys(userPublicKeyRaw) {
        const userPublicKey = sodium.from_hex(userPublicKeyRaw);

        const userSessionKeys = sodium.crypto_kx_server_session_keys(
            this.publicKeyPair.publicKey,
            this.publicKeyPair.privateKey,
            userPublicKey,
        );

        console.log('Generated user session keys', userSessionKeys);
        return {
            incoming: sodium.to_hex(userSessionKeys.sharedRx),
            outgoing: sodium.to_hex(userSessionKeys.sharedTx),
        };
    }

    print() {
        console.log('Keytype', this.publicKeyPair.keyType);
        console.log('Publickey', sodium.to_hex(this.publicKeyPair.publicKey));
        console.log('Privatekey', sodium.to_hex(this.publicKeyPair.privateKey));
    }
}
exports.SessionKeyManager = new SessionKeyManager();
