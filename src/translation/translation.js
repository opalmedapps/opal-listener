// SPDX-FileCopyrightText: Copyright 2026 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

class Translation {
    /**
     * @description Translates content in place inside of an object, recursively at deeper levels,
     *              by looking for keys ending in _EN, _FR, etc.
     *              New keys are then added alongside existing ones, with copies of data in the user's chosen language.
     *              For example, given the keys Description_EN and Description_FR and an acceptLanguage of EN,
     *              a new key Description will be created with the same value as Description_EN.
     * @param {object} object The object to translate.
     * @param {string} acceptLanguage The user's app language.
     * @param {string} fallbackLanguage A system-defined fallback language to use when the user's app language
     *                                  is not available for the data.
     */
    static translateContent(object, acceptLanguage, fallbackLanguage) {
        // If one of the language parameters wasn't provided, skip execution of this function
        if (!acceptLanguage || !fallbackLanguage) return;

        // Find two-letter language suffixes (with certain exceptions: _id)
        const hasLanguageSuffix = key => key.match(/^.+_[a-zA-Z]{2}$/) && !key.match(/^.+_id$/);
        const acceptLanguageLower = acceptLanguage.toLowerCase();
        const fallbackLanguageLower = fallbackLanguage.toLowerCase();

        if (Array.isArray(object)) {
            for (let element of object) {
                this.translateContent(element, acceptLanguage, fallbackLanguage);
            }
        }
        else if (typeof object === 'object' && object !== null) {
            for (const [key, value] of Object.entries(object)) {
                if (hasLanguageSuffix(key)) {
                    // Parse the language tag away from the end of the key; e.g. Description_EN becomes Description
                    let keyBase = key.slice(0, -3);

                    // Pick which value to use: the one for the acceptLanguage, if it exists, or the fallbackLanguage
                    if (Object.prototype.hasOwnProperty.call(object, `${keyBase}_${acceptLanguage}`)) {
                        object[keyBase] = object[`${keyBase}_${acceptLanguage}`];
                    }
                    else if (Object.prototype.hasOwnProperty.call(object, `${keyBase}_${acceptLanguageLower}`)) {
                        object[keyBase] = object[`${keyBase}_${acceptLanguageLower}`];
                    }
                    else if (Object.prototype.hasOwnProperty.call(object, `${keyBase}_${fallbackLanguage}`)) {
                        object[keyBase] = object[`${keyBase}_${fallbackLanguage}`];
                    }
                    else if (Object.prototype.hasOwnProperty.call(object, `${keyBase}_${fallbackLanguageLower}`)) {
                        object[keyBase] = object[`${keyBase}_${fallbackLanguageLower}`];
                    }
                    else {
                        throw `Translation error; an attribute in the format \`${keyBase}_XX\` does not exist `
                            + `for either the accept language (${acceptLanguage}) `
                            + `or the fallback language (${fallbackLanguage}), `
                            + `in upper or lower case (original key: \`${key}\`)`;
                    }
                }

                this.translateContent(value, acceptLanguage, fallbackLanguage);
            }
        }
    }
}

export default Translation;
