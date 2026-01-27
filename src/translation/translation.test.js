// SPDX-FileCopyrightText: Copyright 2026 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Unit tests for the Translation class.
 */

import '../test/chai-setup.js';
import { assert, expect } from 'chai';
import { clone } from '../test/test-utilities.js';
import Translation from './translation.js';

describe('Translation', function () {
    describe('translateContent', function () {
        it('should do nothing if acceptLanguage is missing', async function () {
            const data = {
                key_EN: 'value',
            };
            const dataOriginal = clone(data);

            Translation.translateContent(data, undefined, 'EN');

            assert.deepEqual(data, dataOriginal);
        });
        it('should do nothing if fallbackLanguage is missing', async function () {
            const data = {
                key_EN: 'value',
            };
            const dataOriginal = clone(data);

            Translation.translateContent(data, 'EN', undefined);

            assert.deepEqual(data, dataOriginal);
        });
        it('should translate a simple _EN key', async function () {
            const data = {
                key_EN: 'English',
                key_FR: 'French',
            };
            const expectedResult = {
                key: 'English',
                key_EN: 'English',
                key_FR: 'French',
            };

            Translation.translateContent(data, 'EN', 'EN');

            assert.deepEqual(data, expectedResult);
        });
        it('should translate a simple _en key', async function () {
            const data = {
                key_en: 'English',
                key_fr: 'French',
            };
            const expectedResult = {
                key: 'English',
                key_en: 'English',
                key_fr: 'French',
            };

            Translation.translateContent(data, 'EN', 'EN');

            assert.deepEqual(data, expectedResult);
        });
        it('should translate a simple _FR key', async function () {
            const data = {
                key_EN: 'English',
                key_FR: 'French',
            };
            const expectedResult = {
                key: 'French',
                key_EN: 'English',
                key_FR: 'French',
            };

            Translation.translateContent(data, 'FR', 'FR');

            assert.deepEqual(data, expectedResult);
        });
        it('should translate a simple _fr key', async function () {
            const data = {
                key_en: 'English',
                key_fr: 'French',
            };
            const expectedResult = {
                key: 'French',
                key_en: 'English',
                key_fr: 'French',
            };

            Translation.translateContent(data, 'FR', 'FR');

            assert.deepEqual(data, expectedResult);
        });
        it('should translate a simple _ES key when unavailable using a fallback language', async function () {
            const data = {
                key_EN: 'English',
                key_FR: 'French',
            };
            const expectedResult = {
                key: 'French',
                key_EN: 'English',
                key_FR: 'French',
            };

            Translation.translateContent(data, 'ES', 'FR');

            assert.deepEqual(data, expectedResult);
        });
        it('should translate a simple _es key when unavailable using a fallback language', async function () {
            const data = {
                key_en: 'English',
                key_fr: 'French',
            };
            const expectedResult = {
                key: 'French',
                key_en: 'English',
                key_fr: 'French',
            };

            Translation.translateContent(data, 'ES', 'FR');

            assert.deepEqual(data, expectedResult);
        });
        it('should ignore an _id key', async function () {
            const data = {
                key_id: 'value',
            };
            const expectedResult = clone(data);

            Translation.translateContent(data, 'FR', 'EN');

            assert.deepEqual(data, expectedResult);
        });
        it('should translate attributes deeply nested in arrays', async function () {
            const data = {
                level1: [
                    {
                        key_EN: 'English',
                    },
                    {
                        level2: [
                            {
                                key_EN: 'English',
                            },
                        ],
                    },
                ],
            };
            const expectedResult = {
                level1: [
                    {
                        key: 'English',
                        key_EN: 'English',
                    },
                    {
                        level2: [
                            {
                                key: 'English',
                                key_EN: 'English',
                            },
                        ],
                    },
                ],
            };

            Translation.translateContent(data, 'EN', 'EN');

            assert.deepEqual(data, expectedResult);
        });
        it('should translate attributes deeply nested in objects', async function () {
            const data = {
                level1: {
                    level2: {
                        key_EN: 'English',
                        level3: {
                            key_EN: 'English',
                        },
                    },
                },
            };
            const expectedResult = {
                level1: {
                    level2: {
                        key: 'English',
                        key_EN: 'English',
                        level3: {
                            key: 'English',
                            key_EN: 'English',
                        },
                    },
                },
            };

            Translation.translateContent(data, 'EN', 'EN');

            assert.deepEqual(data, expectedResult);
        });
        it("should throw an error if both the chosen and fallback language keys aren't found", async function () {
            const data = {
                key_EN: 'English',
                key_FR: 'French',
            };

            expect(() => Translation.translateContent(data, 'ES', 'DE')).to.throw('Translation error');
        });
    });
});
