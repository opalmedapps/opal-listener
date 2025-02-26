require('../test/test-setup');
const { expect } = require('chai');
const Keyv = require('keyv');
const sinon = require('sinon');
const crypto = require('crypto');
const cache = require('./key-derivation-cache');

const noop = () => {};

describe('KeyDerivationCache', function () {
    const label = 'test-label';
    const legacySettings = [false, true];
    let cacheSet;
    let pbkdf2;

    beforeEach(function () {
        cache.clear();
        cacheSet = sinon.spy(cache.cache, 'set');
        pbkdf2 = sinon.spy(crypto, 'pbkdf2Sync');
    });
    afterEach(function () {
        cacheSet.restore();
        pbkdf2.restore();
    });

    describe('constructor', function () {
        it('should initialize a Keyv cache', function () {
            expect(cache.cache).to.be.instanceOf(Keyv);
        });
    });
    legacySettings.forEach(legacySetting => {
        describe(`getKey, with useLegacySettings=${legacySetting}`, function () {
            it('should generate the value the first time a label is accessed (cache miss)', async function () {
                await cache.getKey('secret', 'salt', label, legacySetting, noop);
                sinon.assert.calledOnce(pbkdf2);
            });
            it('should store the generated value the first time a label is accessed', async function () {
                await cache.getKey('secret', 'salt', label, legacySetting, noop);
                sinon.assert.calledOnce(cacheSet);
            });
            it('should reuse a value if it was previously cached (cache hit)', async function () {
                await cache.getKey('secret', 'salt', label, legacySetting, noop);
                await cache.getKey('secret', 'salt', label, legacySetting, noop);
                sinon.assert.calledOnce(pbkdf2); // Not called a second time because the cached value was used instead
            });
            it("should leave a value in the cache if it's valid, for repeated use", async function () {
                for (let i = 0; i < 10; i += 1) {
                    // eslint-disable-next-line no-await-in-loop
                    await cache.getKey('secret', 'salt', label, legacySetting, noop);
                }
                sinon.assert.calledOnce(pbkdf2); // Not called ten times, because the cached value was reused
            });
            it('should regenerate the value if the cached value is bad', async function () {
                let counter = 0;
                const failOnce = () => {
                    counter += 1;
                    if (counter === 1) throw new Error('Forced failure');
                };
                await cache.getKey('secret', 'salt', label, legacySetting, noop); // Init cached value
                await cache.getKey('secret', 'salt', label, legacySetting, failOnce); // Force to fail on first read
                sinon.assert.calledTwice(pbkdf2); // Once to generate the original value, once to recover from failure
            });
            it('should fail if both the cached value and the regenerated value are bad', async function () {
                const failAlways = () => {
                    throw new Error('Forced failure');
                };
                await cache.getKey('secret', 'salt', label, legacySetting, noop); // Init cached value
                const promise = cache.getKey('secret', 'salt', label, legacySetting, failAlways); // Force it to fail
                await expect(promise).to.be.rejectedWith('Forced failure');
            });
            it('should generate a new value if no label is provided', async function () {
                await cache.getKey('secret', 'salt', undefined, legacySetting, noop);
                sinon.assert.calledOnce(pbkdf2);
            });
            it('should bypass the cache if no label is provided', async function () {
                await cache.getKey('secret', 'salt', undefined, legacySetting, noop);
                sinon.assert.callCount(cacheSet, 0); // Bypassed the cache
            });
        });
    });
});
