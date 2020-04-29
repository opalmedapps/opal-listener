class QuestionnaireConfig {

    // This config file stores the convention used in the questionnaire database.
    // If you modify anything here, you have to modify its corresponding fields in the database tables and/or routines.
    // One exception is the CHAR_LIMIT_FOR_TEXTBOX which is randomly decided
    static #QUESTIONNAIRE_DB_CONFIG = {
        "DATE_TYPE_ID": 7,
        "TIME_TYPE_ID": 6,
        "LABEL_TYPE_ID": 5,
        "RADIOBUTTON_TYPE_ID": 4,
        "SLIDER_TYPE_ID": 2,
        "CHECKBOX_TYPE_ID": 1,
        "TEXTBOX_TYPE_ID": 3,
        "CHAR_LIMIT_FOR_TEXTBOX": 500,
        "PROCEDURE_SUCCESS_CODE": 0,
        "NEW_QUESTIONNAIRE_STATUS": 0,
        "IN_PROGRESS_QUESTIONNAIRE_STATUS": 1,
        "COMPLETED_QUESTIONNAIRE_STATUS": 2
    };

    static getQuestionnaireConfig() {
        return this.#QUESTIONNAIRE_DB_CONFIG;
    }
}

module.exports = {QuestionnaireConfig};
