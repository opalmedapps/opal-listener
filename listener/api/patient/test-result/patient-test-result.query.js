const mysql = require("mysql");

/**
 *  Class encapsulates the PatientTestsQuery
 */
class PatientTestResultQuery {

	/**
	 * Returns query to obtain the patients lab tests given a date
	 * @param {string|number} patientSerNum PatientSerNum for patient
	 * @param {string} date string representation of date in format '2018-05-21'
	 * @returns string query to obtain the patients lab tests given a date
	 */
	static getTestResultsByDateQuery(patientSerNum, date) {
		return mysql.format(
			`   SELECT DISTINCT
                        ptr.PatientTestResultSerNum as patientTestResultSerNum, 
                        IF(ptr.TestGroupExpressionSerNum IS NULL , "", tge.ExpressionName) as groupName,
                     	ptr.SequenceNum as sequenceNum, 
                     	ptr.ReadStatus as readStatus, 
                      	tc.Name_EN as name_EN, tc.Name_FR as name_FR,
                      	ptr.TestExpressionSerNum as testExpressionSerNum,	
                        emc.URL_EN as educationalMaterialURL_EN, emc.URL_EN as educationalMaterialURL_FR,
                     	ptr.AbnormalFlag as abnormalFlag, ptr.NormalRange as normalRange, 
                        ptr.NormalRangeMin as normalRangeMin, 
                        ptr.NormalRangeMax as normalRangeMax,
                     	ptr.TestValue as testValue,
                     	ptr.TestValueNumeric as testValueNumeric,
                        ptr.UnitDescription as unitDescription
                    FROM 
                        PatientTestResult as ptr, TestExpression as te,
                        TestGroupExpression as tge, TestControl as tc, 
                        EducationalMaterialControl as emc
                    WHERE 
                        ptr.CollectedDateTime=?
                        AND ptr.PatientSerNum = ? 
                        AND (ptr.TestGroupExpressionSerNum = tge.TestGroupExpressionSerNum OR
                        		ptr.TestGroupExpressionSerNum IS NULL)
                        AND ptr.TestExpressionSerNum = te.TestExpressionSerNum 
                        AND te.TestControlSerNum = tc.TestControlSerNum  
                        AND tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum 
                    ORDER BY groupName, sequenceNum;`,
			[date, patientSerNum]);
	}

	/**
	 * Query to return the collected dates the patient had tests for the test types
	 * that are aliased.
	 * @param patientSerNum Patient SerNum
	 */
	static getTestDatesQuery(patientSerNum) {
		return mysql.format(`
                        SELECT DISTINCT CollectedDateTime as collectedDateTime
                        FROM 
                        	PatientTestResult as ptr, 
                        	TestExpression as te, 
                        	TestControl as tc
                        WHERE 
                        	ptr.PatientSerNum=? 
                        	AND ptr.TestExpressionSerNum = te.TestExpressionSerNum 
                        	and te.TestControlSerNum = tc.TestControlSerNum  
                        ORDER BY collectedDateTime DESC;`, [patientSerNum]);
	}

	/**
	 * Query to return all test types for the patient
	 * @returns string test types for the patient
	 */
	static getTestTypesQuery(patientSerNum) {
		return mysql.format(`
                        SELECT DISTINCT te.TestExpressionSerNum as testExpressionSerNum, 
                        tc.Name_EN as name_EN, tc.Name_FR as name_FR
                        FROM 
                            PatientTestResult as ptr, TestExpression te,
                            TestControl as tc
                        WHERE 
                            ptr.PatientSerNum = ?
                            AND ptr.TestExpressionSerNum = te.TestExpressionSerNum 
                            AND te.TestControlSerNum = tc.TestControlSerNum;`,
			[patientSerNum])
	}
	/**
	 * Returns results for the given test type given a TestExpressionSerNum
	 * @param patientSerNum PatientSerNum to use to build query
	 * @param {number} testExpressionSerNum TestExpressionSerNum to get results for
	 * @returns string all the test results for the given test type.
	 */
	static getLatestTestResultByTestType(patientSerNum, testExpressionSerNum) {
		return mysql.format(`
							SELECT 
                                ptr.PatientTestResultSerNum as latestPatientTestResultSerNum, 
                                IF(ptr.TestGroupExpressionSerNum IS NULL , "", tge.ExpressionName) as latestGroupName, 
                                ptr.ReadStatus as readStatus,
                                tc.Name_EN as name_EN, tc.Name_FR as name_FR, 
                             	emc.URL_EN as educationalMaterialURL_EN, 
                                emc.URL_EN as educationalMaterialURL_FR,
                                ptr.CollectedDateTime as latestCollectedDateTime, 
                                ptr.AbnormalFlag as latestAbnormalFlag,  
                             	ptr.TestValue as latestTestValue,
                                ptr.NormalRange as normalRange, 
                                ptr.NormalRangeMin as normalRangeMin, ptr.NormalRangeMax as normalRangeMax,
                                ptr.UnitDescription as unitDescription
                            FROM 
                                PatientTestResult as ptr, TestExpression as te, 
                                TestGroupExpression as tge, TestControl as tc, 
                                EducationalMaterialControl as emc
                            WHERE 
                                ptr.PatientSerNum = ? 
                                AND ptr.TestExpressionSerNum = ?
                                AND ptr.TestExpressionSerNum = te.TestExpressionSerNum 
                                AND (ptr.TestGroupExpressionSerNum = tge.TestGroupExpressionSerNum 
                                    OR ptr.TestGroupExpressionSerNum IS NULL)
                                AND te.TestControlSerNum = tc.TestControlSerNum  
                                AND tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum 
                            LIMIT 1;`,
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