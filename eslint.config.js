// SPDX-FileCopyrightText: Copyright 2025 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import js from '@eslint/js';
import { jsdoc } from 'eslint-plugin-jsdoc';
import mocha from 'eslint-plugin-mocha';
import stylistic from '@stylistic/eslint-plugin';

export default [
    // Globally ignored directories and files, including the project's legacy code
    {
        ignores: [
            'legacy-registration/**',
            'listener/**',
        ],
    },

    // Plugin configurations
    importPlugin.flatConfigs.recommended,
    js.configs.recommended,
    jsdoc({ config: 'flat/recommended' }),
    mocha.configs.recommended,
    stylistic.configs.customize({
        indent: 4,
        quotes: 'single',
        semi: true,
        jsx: true,
    }),

    // Main configuration
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'consistent-return': 'error',
            'import/exports-last': 'error',
            'import/extensions': ['error', 'ignorePackages'],
            'import/first': 'error',
            'import/newline-after-import': 'error',
            // Ignore issues with `firebase-admin/*` imports
            // See: https://github.com/firebase/firebase-admin-node/discussions/1359#discussioncomment-977158
            'import/no-unresolved': ['error', {
                ignore: ['^firebase-admin/.+'],
            }],
            'no-await-in-loop': 'error',
            'no-console': 'error',
            'no-new': 'error',
            'no-param-reassign': 'error',
            'no-unused-vars': 'error',
            'no-use-before-define': ['error', {
                functions: false,
            }],
            'sort-imports': ['error', {
                ignoreCase: true,
            }],
            '@stylistic/arrow-parens': ['error', 'as-needed'],
            '@stylistic/brace-style': ['error', 'stroustrup'],
            '@stylistic/max-len': ['error', 120, {
                ignorePattern: '^// SPDX-FileCopyrightText:.+',
                ignoreUrls: true,
            }],
            '@stylistic/quotes': ['error', 'single', {
                avoidEscape: true,
            }],
        },
    },

    // Additional configurations for test files
    {
        files: ['**/*.test.js'],
        rules: {
            'mocha/consistent-spacing-between-blocks': 'off',
            // See: https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-setup-in-describe.md
            // "If you're using dynamically generated tests, you should disable this rule"
            'mocha/no-setup-in-describe': 'off',
            'mocha/prefer-arrow-callback': 'error',
            'no-console': 'off',
        },
    },
];
