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

describe('QuestionnaireFormatting', function () {
    describe('getAllowedRespondents', function() {
        afterEach(function() {
            clearStub();
        });
        it('should allow [patient] if the user is "self" and cannot answer patient questionnaires', async function() {
            stubRelationship(false, SELF);
            const respondents = await format.getAllowedRespondents("test", 51);
            expect(respondents).to.have.deep.members([PATIENT]);
        });
        it('should allow [patient] questionnaires if the user is "self" and can answer patient questionnaires', async function() {
            stubRelationship(true, SELF);
            const respondents = await format.getAllowedRespondents("test", 51);
            expect(respondents).to.have.deep.members([PATIENT]);
        });
        it('should allow [patient, caregiver] questionnaires if the user is not "self" and cannot answer patient questionnaires', async function() {
            stubRelationship(false, PARENT);
            const respondents = await format.getAllowedRespondents("test", 51);
            expect(respondents).to.have.deep.members([PATIENT, CAREGIVER]);
        });
        it('should allow [patient, caregiver] questionnaires if the user is not "self" and can answer patient questionnaires', async function() {
            stubRelationship(true, PARENT);
            const respondents = await format.getAllowedRespondents("test", 51);
            expect(respondents).to.have.deep.members([PATIENT, CAREGIVER]);
        });
    });
});

/**
 * @desc Test utility function that stubs the API call to get the list of relationships between a caregiver and patient.
 * @param {boolean} can_answer_questionnaire Whether the returned relationship should allow answering patient questionnaires.
 * @param {string} role_type The role_type of the returned relationship.
 */
function stubRelationship(can_answer_questionnaire, role_type) {
    sinon.stub(QuestionnaireDjango, 'getRelationshipsWithPatient').callsFake(() => {
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
