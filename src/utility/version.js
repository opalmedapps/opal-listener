/**
 * @file Utility functions used to manage or compare semver version numbers.
 * @author Stacey Beard
 */
const fs = require('fs');

class Version {
    // Constants
    static version_1_12_2 = '1.12.2';

    // Functions
    static versionGreaterThan = (v1, v2) => this.compareVersions(v1, v2) === 1;

    static versionLessThan = (v1, v2) => this.compareVersions(v1, v2) === -1;

    static versionGreaterOrEqual = (v1, v2) => this.compareVersions(v1, v2) >= 0;

    static versionLessOrEqual = (v1, v2) => this.compareVersions(v1, v2) <= 0;

    /**
     * @description Compares two version numbers in semver format and returns a number (0, 1, -1) representing
     *              the result.
     * @param {string} v1 The first version string to compare.
     * @param {string} v2 The second version string to compare.
     * @returns {number} -1 if v1 < v2; 0 if v1 = v2; 1 if v1 > v2.
     */
    static compareVersions(v1, v2) {
        const format = /^\d+.\d+.\d+$/;
        if (!format.test(v1) || !format.test(v2)) {
            throw new Error(`Version strings must contain only digits and dots; tried to use: '${v1}' and '${v2}'`);
        }

        const a = v1.split('.');
        const b = v2.split('.');
        if (a.length !== b.length) {
            throw new Error(
                `Cannot compare two version strings with a different number of parts (dots): '${v1}' and '${v2}'`,
            );
        }
        const parts = a.map((aPart, i) => ({ a: Number(aPart), b: Number(b[i]) }));

        for (const part of parts) {
            if (part.a > part.b) return 1;
            if (part.a < part.b) return -1;
        }
        return 0;
    }

    /**
     * @description Reads and returns the listener's version from the VERSION file.
     * @returns {string} The version read from the VERSION file, or undefined if not found or if an error occurs.
     */
    static getListenerVersion() {
        try {
            return fs.readFileSync('./VERSION').toString().trim();
        }
        catch (error) {
            return undefined;
        }
    }
}

exports.Version = Version;
