const config = require('../../../../config-adaptor');
const moment = require("moment");
const mysql = require("mysql");
const utility = require("./../../../../utility/utility.js");

/**
 *  Class encapsulates all the queries pertaining the patient test results.
 */
class PatientTestResultQuery {

	/**
	 * Returns query to obtain the patients lab tests given a date
	 * @param {String} userId - Firebase userId making the request
	 * @param {string|number} patientSerNum PatientSerNum for patient
	 * @param {Date} date string representation of date in format '2018-05-21'
	 * @returns string query to obtain the patients lab tests given a date
	 */
	static getTestResultsByDateQuery(userId, patientSerNum, date) {
		return mysql.format(
					`SELECT
						ptr.PatientTestResultSerNum as patientTestResultSerNum,
						IfNull((Select tge.ExpressionName from TestGroupExpression as tge
							where ptr.TestGroupExpressionSerNum = tge.TestGroupExpressionSerNum), "") as groupName,
						ptr.SequenceNum as sequenceNum,
						JSON_CONTAINS(ptr.ReadBy, ?) as readStatus,
						tc.Name_EN as name_EN,
						tc.Name_FR as name_FR,
						ptr.TestExpressionSerNum as testExpressionSerNum,
						IfNull((Select emc.URL_EN from EducationalMaterialControl emc
							where tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"${config.DEFAULT_LAB_EDUCATIONAL_URL_EN}") as educationalMaterialURL_EN,
						IfNull((Select emc.URL_FR from EducationalMaterialControl emc
							where tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"${config.DEFAULT_LAB_EDUCATIONAL_URL_FR}") as educationalMaterialURL_FR,
						ptr.AbnormalFlag as abnormalFlag,
						ptr.NormalRange as normalRange,
						ptr.NormalRangeMin as normalRangeMin,
						ptr.NormalRangeMax as normalRangeMax,
						ptr.TestValue as testValue,
						ptr.TestValueNumeric as testValueNumeric,
						ptr.UnitDescription as unitDescription,
						tc.InterpretationRecommended as interpretationRecommended
					FROM
						PatientTestResult as ptr,
						TestExpression as te,
						/* TestControl: only aliased lab results are sent to the app */
						TestControl as tc
					WHERE
						ptr.CollectedDateTime = ?
						AND ptr.PatientSerNum = ?
						AND ptr.TestExpressionSerNum = te.TestExpressionSerNum
						AND te.TestControlSerNum = tc.TestControlSerNum
						AND tc.PublishFlag = 1
						/* use the AvailableAt column to determine if the lab result is available to be viewed by the patient */
						AND ptr.AvailableAt <= NOW()
					ORDER BY groupName, sequenceNum;`,
				[userId, moment(date).format("YYYY-MM-DD HH:mm:ss"), patientSerNum]);
	}

	/**
	 * Query to return the collected dates the patient had tests for the test types
	 * that are aliased.
	 * @param {string|number} patientSerNum PatientSerNum in the DB
	 * @param {Date} lastUpdated - Only items with 'LastUpdated' after this time are returned.
	 */
	static getTestDatesQuery(patientSerNum, lastUpdated) {
		let numLastUpdated = 3;
		let params = [patientSerNum];
		params = utility.addSeveralToArray(params, lastUpdated, numLastUpdated);

		return mysql.format(`
                    SELECT DISTINCT
                        DATE_FORMAT(CONVERT_TZ(CollectedDateTime, 'America/Montreal', 'UTC'), '%Y-%m-%d %H:%i:%sZ') as collectedDateTime
                    FROM
                        PatientTestResult as ptr,
                        TestExpression as te,
						/* TestControl: only aliased lab results are sent to the app */
						TestControl as tc
                    WHERE
                        ptr.PatientSerNum = ?
                        AND ptr.TestExpressionSerNum = te.TestExpressionSerNum
						AND te.TestControlSerNum = tc.TestControlSerNum
                        AND tc.PublishFlag = 1
                        AND (ptr.LastUpdated > ? OR te.LastUpdated > ? OR tc.LastUpdated > ?)
                        /* use the AvailableAt column to determine if the lab result is available to be viewed by the patient */
                        AND ptr.AvailableAt <= NOW()
                    ORDER BY collectedDateTime DESC;`,
				params);
	}

	/**
	 * Query to return all test types for the patient including the latest results for the given type
	 * @param {String} userId - Firebase userId making the request.
	 * @param {string|number} patientSerNum PatientSerNum in the DB
	 * @param {Date} lastUpdated - Only items with 'LastUpdated' after this time are returned.
	 * @returns {string} query test types for the patient
	 */
	static getTestTypesQuery(userId, patientSerNum, lastUpdated) {
		let numLastUpdated = 3;
		let params = [userId, patientSerNum];
		params = utility.addSeveralToArray(params, lastUpdated, numLastUpdated);
		// Coalesce gets the first non-null value, in this case that's the last test value
		return mysql.format(
					`SELECT
						ptr.PatientTestResultSerNum as latestPatientTestResultSerNum,
						te.TestExpressionSerNum as testExpressionSerNum,
						JSON_CONTAINS(ptr.ReadBy, ?) as readStatus,
						tc.Name_EN as name_EN,
						tc.Name_FR as name_FR,
						IfNull((SELECT emc.URL_EN FROM EducationalMaterialControl emc
							WHERE tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"${config.DEFAULT_LAB_EDUCATIONAL_URL_EN}") as educationalMaterialURL_EN,
						IfNull((SELECT emc.URL_FR FROM EducationalMaterialControl emc
							WHERE tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"${config.DEFAULT_LAB_EDUCATIONAL_URL_FR}") as educationalMaterialURL_FR,
						ptr.UnitDescription as unitDescription,
						ptr.CollectedDateTime as latestCollectedDateTime,
						ptr.AbnormalFlag as latestAbnormalFlag,
						ptr.TestValue as latestTestValue,
						ptr.NormalRange as normalRange,
						ptr.NormalRangeMin as normalRangeMin,
						ptr.NormalRangeMax as normalRangeMax
					FROM
						PatientTestResult as ptr,
						TestExpression as te,
						TestControl as tc,
						(
							SELECT ptr2.PatientSerNum, ptr2.TestExpressionSerNum, MAX(ptr2.CollectedDateTime) CollectedDateTime
							FROM PatientTestResult ptr2
							WHERE
							ptr2.PatientSerNum = ?
							/* use the AvailableAt column to determine if the latest test type and value is available to be returned */
							AND ptr2.AvailableAt <= NOW()
							GROUP BY ptr2.TestExpressionSerNum
						) as A
					WHERE
						/* Uniqueness of [A.PatientSerNum, A.TestExpressionSerNum, A.CollectedDateTime] guaranteed by unique key */
						/* There will be only one "latest" test result row per TestExpressionSerNum per patient */
						ptr.PatientSerNum = A.PatientSerNum
						AND ptr.CollectedDateTime = A.CollectedDateTime
						AND ptr.TestExpressionSerNum = A.TestExpressionSerNum
						AND ptr.TestExpressionSerNum = te.TestExpressionSerNum
						AND te.TestControlSerNum = tc.TestControlSerNum
						AND tc.PublishFlag = 1
						AND (ptr.LastUpdated > ? OR te.LastUpdated > ? OR tc.LastUpdated > ?)
					ORDER BY name_EN;`,
				params);
	}
	/**
	 * Returns results for the given test type given a TestExpressionSerNum
	 * @param {String} userId - Firebase userId making the request
	 * @param {number} patientSerNum PatientSerNum to use to build query
	 * @param {number} testExpressionSerNum TestExpressionSerNum to get results for
	 * @returns string query for all the test results for the given test type.
	 */
	static getLatestTestResultByTestType(userId, patientSerNum, testExpressionSerNum) {
		return mysql.format(
					`SELECT
						ptr.PatientTestResultSerNum as latestPatientTestResultSerNum,
						JSON_CONTAINS(ptr.ReadBy, ?) as readStatus,
						tc.Name_EN as name_EN,
						tc.Name_FR as name_FR,
						IfNull((Select emc.URL_EN from EducationalMaterialControl emc
							where tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"${config.DEFAULT_LAB_EDUCATIONAL_URL_EN}") as educationalMaterialURL_EN,
						IfNull((Select emc.URL_FR from EducationalMaterialControl emc
							where tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"${config.DEFAULT_LAB_EDUCATIONAL_URL_FR}") as educationalMaterialURL_FR,
						ptr.CollectedDateTime as latestCollectedDateTime,
						ptr.AbnormalFlag as latestAbnormalFlag,
						ptr.TestValue as latestTestValue,
						ptr.NormalRange as normalRange,
						ptr.NormalRangeMin as normalRangeMin,
						ptr.NormalRangeMax as normalRangeMax,
						ptr.UnitDescription as unitDescription,
						tc.InterpretationRecommended as interpretationRecommended
					FROM
						PatientTestResult as ptr,
						TestExpression as te,
						/* TestControl: only aliased lab results are sent to the app */
						TestControl as tc
					WHERE
						ptr.PatientSerNum = ?
						AND ptr.TestExpressionSerNum = ?
						AND ptr.TestExpressionSerNum = te.TestExpressionSerNum
						AND te.TestControlSerNum = tc.TestControlSerNum
						AND tc.PublishFlag = 1
						/* use the AvailableAt column to determine if the lab result is available to be viewed by the patient */
						AND ptr.AvailableAt <= NOW()
					ORDER BY latestCollectedDateTime DESC LIMIT 1;`,
				[userId, patientSerNum, testExpressionSerNum]);
	}
	/**
	 * Returns results for the given test type given a TestExpressionSerNum
	 * @param patientSerNum PatientSerNum to use to build query
	 * @param {number} testExpressionSerNum TestExpressionSerNum to get results for
	 * @returns string all the test results for the given test type.
	 */
	static getTestResultValuesByTestType(patientSerNum, testExpressionSerNum) {
		return mysql.format(`
					SELECT
						ptr.PatientTestResultSerNum as patientTestResultSerNum,
						ptr.CollectedDateTime as collectedDateTime,
						ptr.AbnormalFlag as abnormalFlag,
						ptr.TestValue as testValue,
						ptr.TestValueNumeric as testValueNumeric
					FROM
						PatientTestResult as ptr
					WHERE
						ptr.PatientSerNum = ?
						AND ptr.TestExpressionSerNum = ?
						/* use the AvailableAt column to determine if the lab result is available to be viewed by the patient */
						AND ptr.AvailableAt <= NOW()
					ORDER BY CollectedDateTime;`,
				[patientSerNum, testExpressionSerNum]);
	}

	/**
	 * Mark test results as read for a given list of testResultSerNums.
	 * @param {String} userId - Firebase userId making the request
	 * @param {Array.<Number>} testResultSerNums Test results that should be marked as read
	 * @returns String query to mark test results as read for the given list of tests' serial numbers.
	 */
	static markTestResultsAsRead(userId, testResultSerNums) {
		return mysql.format(`
			UPDATE PatientTestResult
			SET ReadBy = JSON_ARRAY_APPEND(ReadBy, '$', ?), ReadStatus = 1
			WHERE PatientTestResultSerNum IN (?)
			AND JSON_CONTAINS(ReadBy, ?) = 0;
		`,
		[userId, testResultSerNums, `"${userId}"`]);
	}
}

module.exports = {PatientTestResultQuery};
