// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

require('../../src/test/chai-setup');
const { expect } = require('chai');

const utility = require('../utility/utility.js');

describe('Legacy Utility', function () {
    describe('addSeveralToArray', function () {
        it('should add the right number of elements to an array', function() {
            let arr = ['a', 'b', 'c', 'd'];
            let item = "e";
            let amount = 4;
            let newArr = utility.addSeveralToArray(arr, item, amount);
            expect(newArr).to.have.members(['a', 'b', 'c', 'd', 'e', 'e', 'e', 'e']);
        });

        it('should not alter the original array', function() {
            let originalArr = ['a', 'b'];
            let item = "c";
            let amount = 5;
            utility.addSeveralToArray(originalArr, item, amount);
            expect(originalArr).to.have.members(['a', 'b']);
        });

        it('should have no effect if asked to add 0 objects', function() {
            let arr = ['a', 'b', 'c', 'd'];
            let item = "e";
            let amount = 0;
            let newArr = utility.addSeveralToArray(arr, item, amount);
            expect(newArr).to.have.members(['a', 'b', 'c', 'd']);
        });
    });
});
