const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = require('chai');

const deleteExpiredBranches = require('./delete-expired-branches.js');

describe('Registration cron deleteExpiredBranches', function() {
    describe('getBranchPath', function() {
        it('should return the right path when the root ends in a slash', function() {
            const path = deleteExpiredBranches.getBranchPath('root/','example');
            expect(path).to.equal('root/registration/branch/example');
        })
        it("should return the right path when the root doesn't end in a slash", function() {
            const path = deleteExpiredBranches.getBranchPath('root','example');
            expect(path).to.equal('root/registration/branch/example');
        })
    });
});
