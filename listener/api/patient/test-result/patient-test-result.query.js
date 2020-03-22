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
                        ptr.PatientTestResultSerNum, 
                        IF(ptr.TestGroupExpressionSerNum IS NULL , "", tge.ExpressionName) as GroupName,
                     	ptr.SequenceNum, ptr.ReadStatus, 
                      	tc.Name_EN, tc.Name_FR,
                        emc.URL_EN as EducationalMaterialURL_EN, emc.URL_EN as EducationalMaterialURL_FR
                     	ptr.AbnormalFlag, ptr.NormalRange, 
                        ptr.NormalRangeMin, ptr.NormalRangeMax, ptr.TestValue, ptr.TestValueNumeric,
                        ptr.UnitDescription
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
                    ORDER BY GroupName, SequenceNum;`,
			[date, patientSerNum]);
	}

	/**
	 * Query to return the collected dates the patient had tests for the test types
	 * that are aliased.
	 * @param patientSerNum Patient SerNum
	 */
	static getTestDatesQuery(patientSerNum) {
		return mysql.format(`
                        SELECT DISTINCT CollectedDateTime 
                        FROM 
                        	PatientTestResult as ptr, 
                        	TestExpression as te, 
                        	TestControl as tc
                        WHERE 
                        	ptr.PatientSerNum=? 
                        	AND ptr.TestExpressionSerNum = te.TestExpressionSerNum 
                        	and te.TestControlSerNum = tc.TestControlSerNum  
                        ORDER BY CollectedDateTime DESC;`, [patientSerNum]);
	}

	/**
	 * Query to return all test types for the patient
	 * @returns string test types for the patient
	 */
	static getTestTypesQuery(patientSerNum) {
		return mysql.format(`
                        SELECT DISTINCT te.TestExpressionSerNum, te.ExpressionName, tc.Name_EN, tc.Name_FR
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
	static getTestResultByTestType(patientSerNum, testExpressionSerNum) {
		return mysql.format(`
							SELECT DISTINCT
                                ptr.PatientTestResultSerNum, 
                                IF(ptr.TestGroupExpressionSerNum IS NULL , "", tge.ExpressionName) as GroupName, 
                                ptr.SequenceNum, ptr.ReadStatus,
                                tc.Name_EN, tc.Name_FR, 
                             	emc.URL_EN as EducationalMaterialURL_EN, 
                                emc.URL_EN as EducationalMaterialURL_FR,
                                ptr.CollectedDateTime, ptr.AbnormalFlag,  
                                ptr.NormalRange, ptr.NormalRangeMin, ptr.NormalRangeMax, ptr.TestValue,
                                ptr.TestValueNumeric, ptr.UnitDescription 
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
                            ORDER BY CollectedDateTime, GroupName, SequenceNum;`,
			[patientSerNum, testExpressionSerNum]);
	}
}

module.exports = {PatientTestResultQuery};