require('../test/chai-setup');
const { expect } = require('chai');
const { Keyv } = require('keyv');
const sinon = require('sinon');
const crypto = require('crypto');
const cache = require('./key-derivation-cache');

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
            it('should generate a correct value given the right inputs', async function () {
                const key = await cache.getKey('secret', 'salt', label, legacySetting);
                const expectedKey = legacySetting
                    ? 'fa7bab9eff3a06a5271ccfb9b6d8728d'
                    : 'c9cb8a8b7f0b9c1e161e3c920383d0db066ce7310e239bc035a2b544762edbf8';
                expect(key).to.equal(expectedKey);
            });
            it('should generate a value the first time a label is accessed (cache miss)', async function () {
                await cache.getKey('secret', 'salt', label, legacySetting);
                sinon.assert.calledOnce(pbkdf2);
            });
            it('should store the generated value the first time a label is accessed', async function () {
                await cache.getKey('secret', 'salt', label, legacySetting);
                sinon.assert.calledOnce(cacheSet);
            });
            it('should reuse a value if it was previously cached (cache hit)', async function () {
                await cache.getKey('secret', 'salt', label, legacySetting);
                await cache.getKey('secret', 'salt', label, legacySetting);
                sinon.assert.calledOnce(pbkdf2); // Not called a second time because the cached value was used instead
            });
            it('should read the same value back that was previously cached', async function () {
                const key = await cache.getKey('secret', 'salt', label, legacySetting);
                const cachedKey = await cache.getKey('secret', 'salt', label, legacySetting);
                expect(cachedKey).to.equal(key);
            });
            it('should leave a value in the cache for repeated use', async function () {
                for (let i = 0; i < 10; i += 1) {
                    // eslint-disable-next-line no-await-in-loop
                    await cache.getKey('secret', 'salt', label, legacySetting);
                }
                sinon.assert.calledOnce(pbkdf2); // Not called ten times, because the cached value was reused
            });
            it('should generate a new value if no label is provided', async function () {
                await cache.getKey('secret', 'salt', undefined, legacySetting);
                sinon.assert.calledOnce(pbkdf2);
            });
            it('should bypass the cache if no label is provided', async function () {
                await cache.getKey('secret', 'salt', undefined, legacySetting);
                sinon.assert.callCount(cacheSet, 0); // Bypassed the cache
            });
        });
    });
    describe('invalidate', function () {
        it('should cause a cache miss after a value is invalidated', async function () {
            await cache.getKey('secret', 'salt', label, false);
            await cache.invalidate(label);
            await cache.getKey('secret', 'salt', label, false);
            sinon.assert.calledTwice(pbkdf2); // Called a second time after the cached value was invalidated
        });
    });
    describe('clear', function () {
        it('should remove all values from the cache; causing a cache miss if any are accessed', async function () {
            await cache.getKey('secret-1', 'salt', `${label}-1`, false);
            await cache.getKey('secret-2', 'salt', `${label}-2`, false);
            await cache.clear();
            await cache.getKey('secret-1', 'salt', `${label}-1`, false);
            await cache.getKey('secret-2', 'salt', `${label}-2`, false);
            sinon.assert.callCount(pbkdf2, 4); // Required both values to be regenerated, so four calls in total
        });
    });
});
