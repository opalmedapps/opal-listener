/**
 * @file Makes and interprets API calls to the Django backend, to get information used in the Questionnaire module.
 * @author Stacey Beard
 */

const ApiRequest = require('../../src/core/api-request');
const logger = require('../logs/logger');

class QuestionnaireDjango {
    /**
     * @desc Calls the backend to get the list of care-receivers (and their relationship details) for the current user.
     * @param {string} userId The Firebase username of the user making the request.
     * @returns {Promise<any>} Resolves to the list of patient relationships (care-receivers) for the current user.
     */
    static async getCaregiverPatientRelationships(userId) {
        const requestParams = {
            Parameters: {
                method: 'get',
                url: `/api/caregivers/patients/`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            UserID: userId,
        };
        logger.log('info', "API: Calling backend to get the caregiver's list of relationships");
        const response = await ApiRequest.makeRequest(requestParams);
        if (response.data) return response.data;
        else throw new Error('Failed to get caregiver relationships from the backend');
    }

    /**
     * @desc Returns the relationship(s) between the current user (as the caregiver) and a specific patient (care-receiver).
     * @param {string} userId The Firebase username of the user making the request.
     * @param {number} patientSerNum The PatientSerNum of the care-receiver.
     * @returns {Promise<*>} Resolves to the list of relationships (usually one, but could be more) with the given patient.
     */
    static async getRelationshipsWithPatient(userId, patientSerNum) {
        let patientRelationshipList = await this.getCaregiverPatientRelationships(userId);
        return patientRelationshipList.filter(patientRelationship => patientRelationship.patient_legacy_id === patientSerNum);
    }

    /**
     * @desc Interprets a list of relationships between a caregiver and a given patient to determine if at least one of
     *       them is a "self" relationship (meaning that the caregiver is the patient).
     * @param {Object[]} relationships The list of relationships to check.
     * @returns {boolean} True if at least one of the relationships has the role type "self".
     */
    static caregiverIsSelf(relationships) {
        return relationships.some(relationship => relationship.relationship_type.role_type === "SELF");
    }

    /**
     * @desc Interprets a list of relationships between a caregiver and a given patient to determine if at least one of
     *       them allows the caregiver to access patient's list of questionnaires.
     *       Note! This check does not take into account the relationship's status (confirmed, expired, etc.)
     * @param {Object[]} relationships The list of relationships to check.
     * @returns {boolean} True if at least one of the relationships has "can_answer_questionnaire" enabled.
     */
    static caregiverCanAccessQuestionnairesList(relationships) {
        return relationships.some(relationship => relationship.relationship_type.can_answer_questionnaire === true);
    }

    /**
     * Check if given caregiver can answer patient's questionnaires.
     *
     * @param {string} userId The Firebase username of the user making the request.
     * @param {number} patientSerNum The PatientSerNum of the care-receiver.
     * @returns {boolean} True if at least one of the relationships has "can_answer_questionnaire" enabled.
     */
    static async caregiverCanAnswerQuestionnaire(userId, patientSerNum) {
        let relationships = await this.getRelationshipsWithPatient(userId, patientSerNum);
        // Ensure the relationships list contains only confirmed relationships
        relationships = relationships.filter(patientRelationship => patientRelationship.status === 'CON');
        return relationships.some(relationship => relationship.relationship_type.can_answer_questionnaire === true);
    }
}

module.exports = QuestionnaireDjango;
