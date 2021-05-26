const moment = require("moment");
const mysql = require("mysql");

/**
 *  Class encapsulates all the queries pertaining the patient test results.
 */
class PatientTestResultQuery {

	/**
	 * Returns query to obtain the patients lab tests given a date
	 * @param {string|number} patientSerNum PatientSerNum for patient
	 * @param {Date} date string representation of date in format '2018-05-21'
	 * @returns string query to obtain the patients lab tests given a date
	 */
	static getTestResultsByDateQuery(patientSerNum, date) {
		return mysql.format(
					`SELECT
						ptr.PatientTestResultSerNum as patientTestResultSerNum,
						IfNull((Select tge.ExpressionName from TestGroupExpression as tge
							where ptr.TestGroupExpressionSerNum = tge.TestGroupExpressionSerNum), "") as groupName,
						ptr.SequenceNum as sequenceNum,
						ptr.ReadStatus as readStatus,
						tc.Name_EN as name_EN,
						tc.Name_FR as name_FR,
						ptr.TestExpressionSerNum as testExpressionSerNum,
						IfNull((Select emc.URL_EN from EducationalMaterialControl emc
							where tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"https://labtestsonline.org/tests/") as educationalMaterialURL_EN,
						IfNull((Select emc.URL_FR from EducationalMaterialControl emc
							where tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"https://labtestsonline.org/tests/") as educationalMaterialURL_FR,
						ptr.AbnormalFlag as abnormalFlag,
						ptr.NormalRange as normalRange,
						ptr.NormalRangeMin as normalRangeMin,
						ptr.NormalRangeMax as normalRangeMax,
						ptr.TestValue as testValue,
						ptr.TestValueNumeric as testValueNumeric,
						ptr.UnitDescription as unitDescription
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
					ORDER BY groupName, sequenceNum;`,
				[moment(date).format("YYYY-MM-DD HH:mm:ss"), patientSerNum]);
	}

	/**
	 * Query to return the collected dates the patient had tests for the test types
	 * that are aliased.
	 * @param {string|number} patientSerNum PatientSerNum in the DB
	 */
	static getTestDatesQuery(patientSerNum) {
		return mysql.format(`
					SELECT DISTINCT CollectedDateTime as collectedDateTime
					FROM 
						PatientTestResult as ptr, 
						TestExpression as te,
						/* TestControl: only aliased lab results are sent to the app */
						TestControl as tc
					WHERE 
						ptr.PatientSerNum = ?
						AND ptr.TestExpressionSerNum = te.TestExpressionSerNum
						AND te.TestControlSerNum = tc.TestControlSerNum
					ORDER BY collectedDateTime DESC;`, 
				[patientSerNum]);
	}

	/**
	 * Query to return all test types for the patient including the latest results for the given type
	 * @param {string|number} patientSerNum PatientSerNum in the DB
	 * @returns {string} query test types for the patient
	 */
	static getTestTypesQuery(patientSerNum) {
		// Coalesce gets the first non-null value, in this case that's the last test value
		return mysql.format(
					`SELECT
						ptr.PatientTestResultSerNum as latestPatientTestResultSerNum,
						te.TestExpressionSerNum as testExpressionSerNum,
						ptr.ReadStatus as readStatus,
						tc.Name_EN as name_EN,
						tc.Name_FR as name_FR,
						IfNull((SELECT emc.URL_EN FROM EducationalMaterialControl emc
							WHERE tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"https://labtestsonline.org/tests/") as educationalMaterialURL_EN,
						IfNull((SELECT emc.URL_FR FROM EducationalMaterialControl emc
							WHERE tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"https://labtestsonline.org/tests/") as educationalMaterialURL_FR,
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
							WHERE ptr2.PatientSerNum = ?
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
						ORDER BY name_EN;`,
				[patientSerNum])
	}
	/**
	 * Returns results for the given test type given a TestExpressionSerNum
	 * @param {number} patientSerNum PatientSerNum to use to build query
	 * @param {number} testExpressionSerNum TestExpressionSerNum to get results for
	 * @returns string query for all the test results for the given test type.
	 */
	static getLatestTestResultByTestType(patientSerNum, testExpressionSerNum) {
		return mysql.format(
					`SELECT
						ptr.PatientTestResultSerNum as latestPatientTestResultSerNum,
						ptr.ReadStatus as readStatus,
						tc.Name_EN as name_EN,
						tc.Name_FR as name_FR,
						IfNull((Select emc.URL_EN from EducationalMaterialControl emc
							where tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"https://labtestsonline.org/tests/") as educationalMaterialURL_EN,
						IfNull((Select emc.URL_FR from EducationalMaterialControl emc
							where tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum),
							"https://labtestsonline.org/tests/") as educationalMaterialURL_FR,
						ptr.CollectedDateTime as latestCollectedDateTime,
						ptr.AbnormalFlag as latestAbnormalFlag,
						ptr.TestValue as latestTestValue,
						ptr.NormalRange as normalRange,
						ptr.NormalRangeMin as normalRangeMin,
						ptr.NormalRangeMax as normalRangeMax,
						ptr.UnitDescription as unitDescription
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
					ORDER BY latestCollectedDateTime DESC LIMIT 1;`,
				[patientSerNum, testExpressionSerNum]);
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
					ORDER BY CollectedDateTime;`,
				[patientSerNum, testExpressionSerNum]);
	}
}

module.exports = {PatientTestResultQuery};