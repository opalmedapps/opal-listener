/**
 * @file Setup file to import into each mocha test file. Reduces boilerplate code at the beginning of test files.
 * @author Stacey Beard
 */

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
