// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group <info@opalmedapps.tld>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Setup file to import into each mocha test file. Reduces boilerplate code at the beginning of test files.
 */

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
