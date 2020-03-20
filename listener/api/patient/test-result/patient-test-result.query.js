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
            `   SELECT  
                        ptr.PatientTestResultSerNum, ptr.AbnormalFlag, ptr.SequenceNum, DATE(ptr.CollectedDateTime) 
                        as CollectedDate, ptr.CollectedDateTime,
                        ptr.NormalRangeMin, ptr.NormalRangeMax, ptr.NormalRange, ptr.TestValueNumeric, ptr.TestValue,
                        ptr.UnitDescription, ptr.ReadStatus, tge.ExpressionName as GroupName, tc.Name_EN, tc.Name_FR,
                        emc.URL_EN as EducationalMaterialURL_EN, emc.URL_EN as EducationalMaterialURL_FR
                    FROM 
                        PatientTestResult as ptr, TestExpression as te, TestGroupExpression as tge, TestControl as tc, 
                        EducationalMaterialControl as emc
                    WHERE 
                        DATE(ptr.CollectedDateTime)=?
                        AND ptr.PatientSerNum = ? 
                        AND (ptr.TestGroupExpressionSerNum = tge.TestGroupExpressionSerNum 
                            OR ptr.TestGroupExpressionSerNum IS NULL)
                        AND ptr.TestExpressionSerNum = te.TestExpressionSerNum 
                        AND te.TestControlSerNum = tc.TestControlSerNum  
                        AND tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum 
                    ORDER BY CollectedDate, GroupName, SequenceNum;`,
            [date, patientSerNum]);
    }
    /**
     * Query to return the dates the patient had tests
     * @param patientSerNum Patient SerNum
     */
    static getTestDatesQuery(patientSerNum) {
        return mysql.format(`
                        SELECT DISTINCT DATE(CollectedDateTime) as CollectedDate
                        FROM PatientTestResult
                        WHERE PatientSerNum=? ORDER BY CollectedDate DESC;`, [patientSerNum]);
    }
    /**
     * Query to return all test types for the patient
     * @returns string test types for the patient
     */
    static getTestTypesQuery(patientSerNum) {
        return mysql.format(`
                        SELECT DISTINCT te.TestExpressionSerNum, tc.Name_EN, tc.Name_FR
                        FROM 
                            PatientTestResult as ptr, TestExpression te,
                            TestControl as tc
                        WHERE 
                            ptr.PatientSerNum = ?
                            AND ptr.TestExpressionSerNum = te.TestExpressionSerNum 
                            AND te.TestControlSerNum = tc.TestControlSerNum ORDER BY Name_EN;`, 
                            [this.patientSerNum])
    }
    /**
     * Returns results for the given test type given a TestExpressionSerNum
     * @param patientSerNum PatientSerNum to use to build query
     * @param {number} testExpressionSerNum TestExpressionSerNum to get results for
     * @returns string all the test results for the given test type.
     */
    static getTestResultByTestType(patientSerNum, testExpressionSerNum) {
        return mysql.format(`SELECT  
                                ptr.PatientTestResultSerNum, tge.ExpressionName as GroupName, ptr.SequenceNum,
                                tc.Name_EN, tc.Name_FR, DATE(ptr.CollectedDateTime) as CollectedDate, 
                                ptr.CollectedDateTime, ptr.AbnormalFlag,  ptr.NormalRange, 
                                ptr.NormalRangeMin, ptr.NormalRangeMax, ptr.TestValue,
                                ptr.TestValueNumeric, ptr.UnitDescription, 
                                ptr.ReadStatus, emc.URL_EN as EducationalMaterialURL_EN, 
                                emc.URL_EN as EducationalMaterialURL_FR
                            FROM 
                                PatientTestResult as ptr, TestExpression as te, TestGroupExpression as tge, TestControl as tc, 
                                EducationalMaterialControl as emc
                            WHERE 
                                ptr.PatientSerNum = ? 
                                AND ptr.TestExpressionSerNum = ?
                                AND ptr.TestExpressionSerNum = te.TestExpressionSerNum 
                                AND (ptr.TestGroupExpressionSerNum = tge.TestGroupExpressionSerNum 
                                    OR ptr.TestGroupExpressionSerNum IS NULL)
                                AND te.TestControlSerNum = tc.TestControlSerNum  
                                AND tc.EducationalMaterialControlSerNum = emc.EducationalMaterialControlSerNum 
                            ORDER BY CollectedDate, GroupName, SequenceNum;`, 
                            [patientSerNum, testExpressionSerNum]);
    }
}
module.export = {PatientTestResultQuery: PatientTestResultQuery};