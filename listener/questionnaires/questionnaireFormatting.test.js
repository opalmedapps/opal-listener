const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = require('chai');
const sinon = require('sinon');

const format = require('./questionnaireFormatting');
const questionnaireConfig = require('./questionnaireConfig.json');
const QuestionnaireDjango = require('./questionnaireDjango');

// Values used as a questionnaire's respondent_id
const PATIENT = questionnaireConfig.QUESTIONNAIRE_RESPONDENT_ID.PATIENT;
const CAREGIVER = questionnaireConfig.QUESTIONNAIRE_RESPONDENT_ID.CAREGIVER;

// Values used as a questionnaire's role_type
const SELF = 'SELF';
const PARENT = 'PARENT';

// Keeps track of the stubbed API call to get caregiver relationships
let relationshipStub;

describe('QuestionnaireFormatting', function () {
    describe('filterPatientQuestionnaires', function() {
        it('should not modify the original array', function() {
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
            ];

            format.filterPatientQuestionnaires(list, false);

            expect(list).to.have.deep.members([
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
            ]);
        });
        it("should filter out respondent=PATIENT questionnaires if the user isn't allowed to answer them", function() {
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
                questionnaire(3, CAREGIVER),
                questionnaire(4, PATIENT),
            ];

            expect(format.filterPatientQuestionnaires(list, false)).to.have.deep.members([
                questionnaire(2, CAREGIVER),
                questionnaire(3, CAREGIVER),
            ]);
        });
        it('should not filter out respondent=PATIENT questionnaires if the user is allowed to answer them', function() {
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
                questionnaire(3, PATIENT),
            ];

            expect(format.filterPatientQuestionnaires(list, true)).to.have.deep.members(list);
        });
    });
    describe('filterCaregiverQuestionnaires', function() {
        it('should not modify the original array', function() {
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
            ];

            format.filterCaregiverQuestionnaires(list, true);

            expect(list).to.have.deep.members([
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
            ]);
        });
        it('should filter out respondent=CAREGIVER questionnaires if the user is "self"', function() {
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
                questionnaire(3, CAREGIVER),
                questionnaire(4, PATIENT),
            ];

            expect(format.filterCaregiverQuestionnaires(list, true)).to.have.deep.members([
                questionnaire(1, PATIENT),
                questionnaire(4, PATIENT),
            ]);
        });
        it('should not filter out respondent=CAREGIVER questionnaires if the user is not "self"', function() {
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
                questionnaire(3, PATIENT),
            ];
            expect(format.filterCaregiverQuestionnaires(list, false)).to.have.deep.members(list);
        });
    });
    describe('filterByRespondent', function() {
        it('should filter out everything if the user is "self" and cannot answer patient questionnaires', async function() {
            stubRelationship(false, SELF);
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
            ];
            const filteredList = await format.filterByRespondent(list, "test", 51);
            clearStub();
            expect(filteredList).to.have.deep.members([]);
        });
        it('should filter out caregiver questionnaires if the user is "self" and can answer patient questionnaires', async function() {
            stubRelationship(true, SELF);
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
            ];
            const filteredList = await format.filterByRespondent(list, "test", 51);
            clearStub();
            expect(filteredList).to.have.deep.members([
                questionnaire(1, PATIENT),
            ]);
        });
        it('should filter out patient questionnaires if the user is not "self" and cannot answer patient questionnaires', async function() {
            stubRelationship(false, PARENT);
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
            ];
            const filteredList = await format.filterByRespondent(list, "test", 51);
            clearStub();
            expect(filteredList).to.have.deep.members([
                questionnaire(2, CAREGIVER),
            ]);
        });
        it('should filter out nothing if the user is not "self" and can answer patient questionnaires', async function() {
            stubRelationship(true, PARENT);
            let list = [
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
            ];
            const filteredList = await format.filterByRespondent(list, "test", 51);
            clearStub();
            expect(filteredList).to.have.deep.members([
                questionnaire(1, PATIENT),
                questionnaire(2, CAREGIVER),
            ]);
        });
    });
});

/**
 * @desc Test utility function that quickly builds a minimal questionnaire object.
 * @param {number} qp_ser_num Value of the questionnaire's qp_ser_num.
 * @param {number} respondent_id Value of the questionnaire's respondent_id.
 * @returns {object} An object made up of the provided configurations.
 */
function questionnaire(qp_ser_num, respondent_id) {
    return {qp_ser_num, respondent_id};
}

/**
 * @desc Test utility function that stubs the API call to get the list of relationships between a caregiver and patient.
 * @param {boolean} can_answer_questionnaire Whether the returned relationship should allow answering patient questionnaires.
 * @param {string} role_type The role_type of the returned relationship.
 */
function stubRelationship(can_answer_questionnaire, role_type) {
    relationshipStub = sinon.stub(QuestionnaireDjango, 'getRelationshipsWithPatient').callsFake(() => {
        return [
            {
                patient_id: 1,
                patient_legacy_id: 51,
                first_name: 'Test',
                last_name: 'Simpson',
                status: 'CON',
                relationship_type: {
                    name: 'Type',
                    can_answer_questionnaire: can_answer_questionnaire,
                    role_type: role_type
                }
            },
        ];
    });
}

/**
 * @desc Test utility function that clears the API stub.
 */
function clearStub() {
    QuestionnaireDjango.getRelationshipsWithPatient.restore();
}
