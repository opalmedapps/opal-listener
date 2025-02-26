/**
 * @desc Query that returns patient table fields based on a PatientSerNum.
 * @deprecated Along with the Patient requestMapping in sqlInterface.
 * @returns {string} The query.
 */
exports.patientTableFields=function()
{
    /* Note: "" AS PatientId
     *       This was added to make the Account tab display nothing instead of the Patient's MRN
     *       The PatientId attribute can be removed after qplus PR #829 is merged
     * -SB */
    return `SELECT p.PatientSerNum, p.TestUser, p.FirstName, p.LastName, p.TelNum, "" AS PatientId, p.Email, p.Alias,
                   p.Language, p.EnableSMS, p.ProfileImage, p.SSN, p.AccessLevel
            FROM Patient p
            WHERE p.PatientSerNum = ?
            ;`
};

/**
 * @desc Query that returns patient table fields based on a user's Username.
 * @deprecated Uses of this query should be updated with better methods (e.g. using the Patient module).
 * @returns {string} The query.
 */
exports.patientTableFieldsForUser = function() {
    return `SELECT p.PatientSerNum, p.TestUser, p.FirstName, p.LastName, p.TelNum, p.Email, p.Alias,
                   p.Language, p.EnableSMS, p.ProfileImage, p.SSN, p.AccessLevel
            FROM
                Patient p,
                Users u
            WHERE u.Username = ?
                AND u.UserTypeSerNum = p.PatientSerNum
            ;`
};

/**
 * @deprecated;
 * @returns {string}
 */
exports.patientDoctorTableFields=function()
{
	return "SELECT ifnull(D.FirstName, '') FirstName, ifnull(D.LastName, '') LastName, D.DoctorSerNum, PD.PrimaryFlag, PD.OncologistFlag, ifnull(D.Email, '') Email, ifnull(D.Phone, '') Phone, ifnull(D.ProfileImage, '') ProfileImage, ifnull(D.Address, '') Address,	ifnull(D.BIO_EN, '') Bio_EN, ifnull(D.BIO_FR, '') Bio_FR FROM Doctor D, PatientDoctor PD WHERE PD.PatientSerNum = ? AND D.DoctorSerNum = PD.DoctorSerNum AND (D.LastUpdated > ? OR PD.LastUpdated > ?);";
};

/**
 * @desc Query that returns the patient's diagnoses.
 * @param {boolean} [selectOne] If provided, only one diagnosis with a specific SerNum is returned.
 * @returns {string} The query.
 */
function patientDiagnosisTableFields(selectOne) {
    return `SELECT
                D.DiagnosisSerNum,
                D.CreationDate,
                getDiagnosisDescription(D.DiagnosisCode,'EN') Description_EN,
                getDiagnosisDescription(D.DiagnosisCode,'FR') Description_FR
            FROM
                Diagnosis D
            WHERE
                D.PatientSerNum = ?
                ${selectOne ? 'AND D.DiagnosisSerNum = ?' : ''}
                ${!selectOne ? 'AND D.LastUpdated > ?' : ''}
            ;
    `;
}

/**
 * @desc Query that returns the patient's appointments.
 * @param {boolean} [selectOne] If provided, only one appointment with a specific SerNum is returned.
 * @returns {string} The query.
 */
function patientAppointmentTableFields(selectOne) {
    return `SELECT
                Appt.AppointmentSerNum,
                A.AliasSerNum,
                concat(if(Appt.Status = 'Cancelled', '[Cancelled] - ', ''), getTranslation('Alias', 'AliasName_EN', IfNull(A.AliasName_EN, ''), A.AliasSerNum)) AS AppointmentType_EN,
                concat(if(Appt.Status = 'Cancelled', convert('[Annulé] - ' using utf8), ''), IfNull(A.AliasName_FR, '')) AS AppointmentType_FR,
                IfNull(A.AliasDescription_EN, '') AS AppointmentDescription_EN,
                IfNull(A.AliasDescription_FR, '') AS AppointmentDescription_FR,
                IfNull(AE.Description, '') AS ResourceDescription,
                Appt.ScheduledStartTime,
                Appt.ScheduledEndTime,
                Appt.Checkin,
                Appt.SourceDatabaseSerNum,
                Appt.AppointmentAriaSer,
                JSON_CONTAINS(Appt.ReadBy, ?) as ReadStatus,
                Appt.Status,
                IfNull(Appt.RoomLocation_EN, '') AS RoomLocation_EN,
                IfNull(Appt.RoomLocation_FR, '') AS RoomLocation_FR,
                Appt.LastUpdated,
                IfNull(emc.URL_EN, '') AS URL_EN,
                IfNull(emc.URL_FR, '') AS URL_FR,
                IfNull(AC.CheckinPossible, 0) AS CheckinPossible,
                IfNull(AC.CheckinInstruction_EN, '') AS CheckinInstruction_EN,
                IfNull(AC.CheckinInstruction_FR, '') AS CheckinInstruction_FR,
                A.HospitalMapSerNum,
                IfNull(HM.MapUrl, '') AS MapUrl,
                IfNull(HM.MapUrl_EN, '') AS MapUrl_EN,
                IfNull(HM.MapUrl_FR, '') AS MapUrl_FR,
                IfNull(HM.MapName_EN, '') AS MapName_EN,
                IfNull(HM.MapName_FR, '') AS MapName_FR,
                IfNull(HM.MapDescription_EN, '') AS MapDescription_EN,
                IfNull(HM.MapDescription_FR, '') AS MapDescription_FR
            FROM
                Appointment Appt
                INNER JOIN AliasExpression AE ON AE.AliasExpressionSerNum = Appt.AliasExpressionSerNum
                INNER JOIN Alias A ON AE.AliasSerNum = A.AliasSerNum
                LEFT JOIN HospitalMap HM ON HM.HospitalMapSerNum = A.HospitalMapSerNum
                INNER JOIN AppointmentCheckin AC ON AE.AliasSerNum = AC.AliasSerNum
                LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = A.EducationalMaterialControlSerNum
            WHERE
                Appt.PatientSerNum = ?
                AND Appt.State = 'Active'
                AND Appt.Status <> 'Deleted'
                ${selectOne ? 'AND Appt.AppointmentSerNum = ?' : ''}
                ${!selectOne ? 'AND (Appt.LastUpdated > ? OR A.LastUpdated > ? OR AE.LastUpdated > ? OR HM.LastUpdated > ?)' : ''}
            ORDER BY Appt.AppointmentSerNum, ScheduledStartTime;
    `;
}

/**
 * @desc Query that returns the patient's documents.
 * @param {boolean} [selectOne] If provided, only one document with a specific SerNum is returned.
 * @returns {string} The query.
 */
function patientDocumentTableFields(selectOne=false) {
    return `SELECT DISTINCT
                case
                   when instr(Document.FinalFileName, '/') = 0 then Document.FinalFileName
                   when instr(Document.FinalFileName, '/') > 0 then substring(Document.FinalFileName, instr(Document.FinalFileName, '/') + 1, length(Document.FinalFileName))
                end FinalFileName,
                Alias.AliasName_EN,
                Alias.AliasName_FR,
                JSON_CONTAINS(Document.ReadBy, ?) as ReadStatus,
                Alias.AliasDescription_EN,
                Alias.AliasDescription_FR,
                Document.DocumentSerNum,
                Document.ApprovedTimeStamp,
                Document.CreatedTimeStamp,
                Staff.FirstName,
                Staff.LastName,
                Alias.ColorTag,
                emc.URL_EN,
                emc.URL_FR
            FROM
                Document
                INNER JOIN AliasExpression ON AliasExpression.AliasExpressionSerNum = Document.AliasExpressionSerNum
                INNER JOIN Alias ON Alias.AliasSerNum = AliasExpression.AliasSerNum
                INNER JOIN Staff ON Staff.StaffSerNum = Document.ApprovedBySerNum
                LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = Alias.EducationalMaterialControlSerNum
            WHERE
                Document.PatientSerNum = ?
                ${selectOne ? 'AND Document.DocumentSerNum = ?' : ''}
                ${!selectOne ? 'AND (Document.LastUpdated > ? OR Alias.LastUpdated > ?)' : ''}
            ;
    `;
}

exports.getDocumentsContentQuery = function()
{
    return "SELECT Document.DocumentSerNum, " +
        "case " +
        "   when instr(Document.FinalFileName, '/') = 0 then Document.FinalFileName " +
        "   when instr(Document.FinalFileName, '/') > 0 then substring(Document.FinalFileName, instr(Document.FinalFileName, '/') + 1, length(Document.FinalFileName)) " +
        "end FinalFileName " +
        "FROM Document WHERE Document.DocumentSerNum IN ? AND Document.PatientSerNum = ?;";
};

/**
 * @desc Query that returns the patient's treating team messages.
 * @param {boolean} [selectOne] If provided, only one treating team message with a specific SerNum is returned.
 * @returns {string} The query.
 */
function patientTxTeamMessageTableFields(selectOne=false) {
    return `SELECT
                TxRecords.TxTeamMessageSerNum,
                TxRecords.DateAdded,
                JSON_CONTAINS(TxRecords.ReadBy, ?) as ReadStatus,
                Post.PostType,
                Post.Body_EN,
                Post.Body_FR,
                Post.PostName_EN,
                Post.PostName_FR
            FROM
                PostControl as Post,
                TxTeamMessage as TxRecords
            WHERE
                Post.PostControlSerNum = TxRecords.PostControlSerNum
                AND TxRecords.PatientSerNum = ?
                ${selectOne ? 'AND TxRecords.TxTeamMessageSerNum = ?' : ''}
                ${!selectOne ? 'AND (TxRecords.LastUpdated > ? OR Post.LastUpdated > ?)' : ''}
            ;
    `;
}

/**
 * @desc Query that returns the patient's announcements.
 * @param {boolean} [selectOne] If provided, only one announcement with a specific SerNum is returned.
 * @returns {string} The query.
 */
function patientAnnouncementTableFields(selectOne=false) {
    return `SELECT
                Announcement.AnnouncementSerNum,
                Announcement.DateAdded,
                Patient.FirstName as PatientFirstName,
                Patient.LastName as PatientLastName,
                JSON_CONTAINS(Announcement.ReadBy, ?) as ReadStatus,
                PostControl.PostControlSerNum,
                PostControl.PostType,
                PostControl.Body_EN,
                PostControl.Body_FR,
                PostControl.PostName_EN,
                PostControl.PostName_FR
            FROM
                PostControl,
                Announcement,
                Patient
            WHERE
                PostControl.PostControlSerNum = Announcement.PostControlSerNum
                AND Announcement.PatientSerNum = Patient.PatientSerNum
                AND Announcement.PatientSerNum = ?
                ${selectOne ? 'AND Announcement.AnnouncementSerNum = ?' : ''}
                ${!selectOne ? 'AND (Announcement.LastUpdated > ? OR PostControl.LastUpdated > ?)' : ''}
            ;
    `;
}

/**
 * @desc Query that returns the patient's educational material.
 * @param {boolean} [selectOne] If provided, only one educational material with a specific SerNum is returned.
 * @returns {string} The query.
 */
function patientEducationalMaterialTableFields(selectOne=false) {
    return `SELECT A.EducationalMaterialSerNum,
                A.ShareURL_EN, A.ShareURL_FR,
                A.EducationalMaterialControlSerNum,
                A.DateAdded,
                JSON_CONTAINS(A.ReadBy, ?) as ReadStatus,
                A.EducationalMaterialType_EN, A.EducationalMaterialType_FR,
                A.Name_EN, A.Name_FR,
                A.URL_EN, A.URL_FR,
                A.EduCategoryId
            FROM (
                SELECT EduMat.PatientSerNum, EduMat.EducationalMaterialSerNum, EduControl.ShareURL_EN, EduControl.ShareURL_FR,
                    EduControl.EducationalMaterialControlSerNum, EduMat.DateAdded, EduMat.ReadStatus, EduMat.ReadBy,
                    EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN,
                    EduControl.Name_FR,  EduControl.URL_EN, EduControl.URL_FR, EduMat.LastUpdated EM_LastUpdated,
                    EduControl.LastUpdated EC_LastUpdated, '0000-00-00 00:00:00' TOC_LastUpdated, EduControl.EducationalMaterialCategoryId EduCategoryId
                FROM EducationalMaterialControl as EduControl, EducationalMaterial as EduMat
                WHERE EduMat.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum
                UNION
                SELECT EduMat.PatientSerNum, EduMat.EducationalMaterialSerNum, EduControl.ShareURL_EN, EduControl.ShareURL_FR,
                    EduControl.EducationalMaterialControlSerNum, EduMat.DateAdded, EduMat.ReadStatus, EduMat.ReadBy,
                    EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN,
                    EduControl.Name_FR,  EduControl.URL_EN, EduControl.URL_FR, EduMat.LastUpdated EM_LastUpdated,
                    EduControl.LastUpdated EC_LastUpdated, TOC.LastUpdated TOC_LastUpdated, EduControl.EducationalMaterialCategoryId EduCategoryId
                FROM EducationalMaterialControl as EduControl, EducationalMaterial as EduMat,
                    EducationalMaterialTOC as TOC
                WHERE TOC.ParentSerNum = EduMat.EducationalMaterialControlSerNum
                    AND TOC.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum
                ) AS A
            WHERE A.PatientSerNum = ?
                ${selectOne ? 'AND A.EducationalMaterialSerNum = ?' : ''}
                ${!selectOne ? 'AND (A.EM_LastUpdated > ? OR A.EC_LastUpdated > ? OR A.TOC_LastUpdated > ?)' : ''}
            ;
    `;
}

exports.patientEducationalMaterialContents=function()
{
    return "SELECT EducationalMaterialTOC.EducationalMaterialTOCSerNum ,EducationalMaterialTOC.OrderNum, EducationalMaterialTOC.ParentSerNum, EducationalMaterialTOC.EducationalMaterialControlSerNum, EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN, EduControl.Name_FR, EduControl.URL_FR, EduControl.URL_EN FROM EducationalMaterialControl as EduControl, EducationalMaterialTOC WHERE EduControl.EducationalMaterialControlSerNum = EducationalMaterialTOC.EducationalMaterialControlSerNum AND EducationalMaterialTOC.ParentSerNum = ? ORDER BY OrderNum;";
};
/**
 * @deprecated;
 * @returns {string}
 */
exports.patientTasksTableFields=function()
{
    return "SELECT DISTINCT Patient.PatientAriaSer, " +
        "Alias.AliasName_EN AS TaskName_EN, " +
        "Alias.AliasName_FR AS TaskName_FR, " +
        "Alias.AliasDescription_EN AS TaskDescription_EN, " +
        "Alias.AliasDescription_FR AS TaskDescription_FR, " +
        "Task.DueDateTime, " +
        "emc.URL_EN, " +
        "emc.URL_FR " +
        "" +
        "FROM Patient " +
        "" +
        "INNER JOIN Task ON Task.PatientSerNum = Patient.PatientSerNum " +
        "INNER JOIN AliasExpression ON AliasExpression.AliasExpressionSerNum = Task.AliasExpressionSerNum " +
        "INNER JOIN Alias ON Alias.AliasSerNum = AliasExpression.AliasSerNum " +
        "LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = Alias.EducationalMaterialControlSerNum " +
        "" +
        "WHERE " +
        "Task.PatientSerNum = ? " +
        "AND (Task.LastUpdated > ? OR Alias.LastUpdated > ?) " +
        "ORDER BY Task.DueDateTime ASC;";
};

/**
 * patientStudyTableFields
 * @desc Query that returns the studies assigned to a given patient.
 * @returns {string}
 */
exports.patientStudyTableFields=function(){
    return `SELECT S.ID, S.title_EN, S.title_FR, S.description_EN, S.description_FR, S.investigator, S.email, S.phone, S.phoneExt, S.startDate, S.endDate, S.creationDate, PS.ID as patientStudyId, PS.consentStatus, PS.readStatus as ReadStatus, Q.QuestionnaireSerNum, QC.QuestionnaireName_EN, QC.QuestionnaireName_FR
            FROM study S, Patient P, patientStudy PS, Users U, QuestionnaireControl QC
            INNER JOIN Questionnaire Q ON QC.QuestionnaireControlSerNum = Q.QuestionnaireControlSerNum
            WHERE U.UserTypeSerNum=P.PatientSerNum AND P.PatientSerNum = PS.patientId AND Q.PatientSerNum = P.PatientSerNum AND S.ID = PS.studyID AND QC.QuestionnaireDBSerNum = S.consentQuestionnaireId AND U.Username LIKE ?`
}

/**
 * getStudyQuestionnairesQuery
 * @desc Query that returns the questionnaires assigned to a given study.
 * @returns {string}
 */
exports.getStudyQuestionnairesQuery = function(){
    return "SELECT QS.questionnaireID, Q.DateAdded, QC.QuestionnaireName_EN, QC.QuestionnaireName_FR FROM questionnaireStudy QS, Questionnaire Q, QuestionnaireControl QC, study S WHERE S.ID = QS.studyID AND QC.QuestionnaireControlSerNum = Q.QuestionnaireControlSerNum AND Q.QuestionnaireSerNum = QS.questionnaireId AND S.ID = ?";
}

exports.getOpalDBQuestionnaire = function() {
    return `
    SELECT
        q.QuestionnaireSerNum AS QuestionnaireSerNum,
        q.PatientQuestionnaireDBSerNum AS PatientQuestionnaireDBSerNum,
        q.PatientSerNum AS PatientSerNum
    FROM Questionnaire q
    WHERE PatientQuestionnaireDBSerNum = ?;`;
}

/**
 * @desc Query that returns User and Patient information used in security requests.
 * @returns {string} The query.
 */
exports.getUserPatientSecurityInfo = function() {
    return `SELECT DISTINCT
                pat.SSN,
                pdi.SecurityAnswer,
                pdi.Attempt,
                pdi.TimeoutTimestamp
            FROM
                Users u,
                Patient pat,
                PatientDeviceIdentifier pdi
            WHERE
                pdi.Username = ?
                AND pdi.DeviceId = ?
                AND pdi.Username = u.Username
                AND u.UserTypeSerNum = pat.PatientSerNum
            ;`;
};

exports.increaseSecurityAnswerAttempt = function()
{
    return `UPDATE PatientDeviceIdentifier
            SET Attempt = Attempt + 1
            WHERE Username = ?
                AND DeviceId = ?
            ;`;
};

/**
 * @desc Resets the number of security answer attempts made for a user on a device to 0.
 * @returns {string}
 */
exports.resetSecurityAnswerAttempt = function()
{
    return `UPDATE PatientDeviceIdentifier
            SET Attempt = 0,
                TimeoutTimestamp = NULL
            WHERE Username = ?
                AND DeviceId = ?
            ;`;
};

exports.setTimeoutSecurityAnswer = function()
{
    return `UPDATE PatientDeviceIdentifier
            SET TimeoutTimestamp = ?
            WHERE Username = ?
                AND DeviceId = ?
            ;`;
};

exports.setNewPassword=function()
{
    return `UPDATE Users
            SET Password = ?
            WHERE Username = ?
            ;`;
};

exports.accountChange=function()
{
    return `UPDATE Patient SET Language = ? WHERE PatientSerNum=?`;
};
exports.inputFeedback=function(UserSerNum, content)
{
    return "INSERT INTO Feedback (`FeedbackSerNum`,`PatientSerNum`,`FeedbackContent`,`AppRating`,`DateAdded`, `LastUpdated`) VALUES (NULL,?,?,?,NOW(),CURRENT_TIMESTAMP)";
};

exports.getPatientFromEmail=function()
{
    return "SELECT PatientSerNum FROM Patient WHERE Email = ?";
};

exports.logActivity=function()
{
    return `INSERT INTO PatientActivityLog
                (ActivitySerNum, Request, Parameters, TargetPatientId, Username, DeviceId, DateTime, LastUpdated, AppVersion)
            VALUES (NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?);
    `;
};

/**
 * logPatientAction
 * @author Stacey Beard
 * @desc Query that logs a patient action (CLICK, SCROLLTOBOTTOM, etc.) in the database table PatientActionLog.
 *       The database entry for the item that was acted upon (such as a piece of educational material) is specified
 *       by the fields RefTable and RefTableSerNum. ActionTime indicates the time of the action as reported by the app.
 * @returns {string}
 */
exports.logPatientAction = function(){
    return `INSERT INTO PatientActionLog
               (PatientSerNum, Action, RefTable, RefTableSerNum, ActionTime)
               VALUES (?, ?, ?, ?, ?)
            ;`
};

exports.userEncryption=function()
{
    return `SELECT
                pdi.SecurityAnswer
            FROM
                PatientDeviceIdentifier pdi
            WHERE pdi.Username = ?
                AND pdi.DeviceId = ?
            ;`;
};

exports.updateDeviceIdentifiers = function()
{
    return `INSERT INTO PatientDeviceIdentifier(
                PatientDeviceIdentifierSerNum,
                Username,
                DeviceId,
                RegistrationId,
                DeviceType,
                appVersion,
                Trusted,
                LastUpdated
            ) VALUES (NULL,?,?,?,?,?,0,NULL)
            ON DUPLICATE KEY UPDATE RegistrationId = ?;`
};

/**
 * getPackageContents
 * @author Stacey Beard
 * @date 2018-11-19
 * @desc Query that returns the contents of a specified education material package, at a single level of depth.
 * @returns {string}
 */
exports.getPackageContents = function(){
    return `SELECT EducationalMaterialPackageContent.OrderNum, EducationalMaterialControl.EducationalMaterialControlSerNum,
                   EducationalMaterialControl.ShareURL_EN, EducationalMaterialControl.ShareURL_FR,
                   EducationalMaterialControl.EducationalMaterialType_EN, EducationalMaterialControl.EducationalMaterialType_FR,
                   EducationalMaterialControl.Name_EN, EducationalMaterialControl.Name_FR,
                   EducationalMaterialControl.URL_EN, EducationalMaterialControl.URL_FR,
                   EducationalMaterialControl.EducationalMaterialCategoryId

            FROM EducationalMaterialPackageContent, EducationalMaterialControl

            WHERE EducationalMaterialPackageContent.EducationalMaterialControlSerNum = EducationalMaterialControl.EducationalMaterialControlSerNum
              AND EducationalMaterialPackageContent.ParentSerNum = ?

            ORDER BY EducationalMaterialPackageContent.OrderNum
            ;`
};

exports.updateReadStatus=function()
{
    return `
        UPDATE ??
        SET ReadStatus = 1, readStatus = 1, ReadBy = JSON_ARRAY_APPEND(ReadBy,'$', ?)
        WHERE ??.?? = ?
    `;
};

exports.updateConsentStatus = function()
{
    return `
        UPDATE
            patientStudy PS,
            study S,
            Patient P,
            Users U
        SET
            PS.consentStatus = ?
        WHERE
            S.ID = PS.studyId
            AND S.consentQuestionnaireId = ?
            AND P.PatientSerNum = PS.patientId
            AND P.PatientSerNum = U.UserTypeSerNum
            AND U.Username LIKE ?
    `;
};

exports.insertEducationalMaterialRatingQuery=function()
{
    return "INSERT INTO `EducationalMaterialRating`(`EducationalMaterialRatingSerNum`, `EducationalMaterialControlSerNum`, `PatientSerNum`, `Username`, `RatingValue`, `LastUpdated`) VALUES (NULL,?,?,?,?,NULL)";
};

exports.cacheSecurityAnswerFromDjango = () => {
    return `UPDATE
                PatientDeviceIdentifier
            SET
                SecurityAnswer = ?
            WHERE
                DeviceId = ?
                AND Username = ?
            ;`;
}

exports.setTrusted = function () {
    return `UPDATE PatientDeviceIdentifier
            SET Trusted = ?
            WHERE Username = ?
                AND DeviceId = ?
            ;`;
};

/**
 * @deprecated
 * @returns
 */
exports.getPatientForPatientMembers = function() {
    return "SELECT FirstName, LastName, Email, Website, ProfileImage, Bio_EN, Bio_FR  FROM PatientsForPatientsPersonnel;";
};

/**
 * @description Retrieves all of a patient's MRNs from the Patient_Hospital_Identifier table
 * @author Stacey Beard
 * @date 2021-02-26
 * @returns {string}
 */
exports.getMRNs = function() {
    return `
        SELECT PHI.MRN, PHI.Hospital_Identifier_Type_Code FROM Patient_Hospital_Identifier PHI
        WHERE PHI.PatientSerNum = ?
        ;
    `
};

/**
 * CHECKIN QUERIES
 * ============================
 */

/**
 * Queries PushNotifications to get notifications that correspond to a patient on today's date
 * @return {string}
 */
exports.getPatientCheckinPushNotifications = function() {
   return `
        Select PushNotification.PushNotificationSerNum
        From PushNotification
        Where PushNotification.PatientSerNum = ?
            And PushNotification.NotificationControlSerNum in (12, 14)
            And DATE_FORMAT(PushNotification.DateAdded, '%Y-%m-%d') = DATE_FORMAT(NOW(), '%Y-%m-%d');
   `
};

/**
 * Get all of a user's checked in appointments on today's date
 * @return {string}
 */
exports.getTodaysCheckedInAppointments = function() {
   return `
        SELECT Appointment.AppointmentSerNum
        FROM Appointment
        WHERE Appointment.PatientSerNum = ?
            AND Appointment.Checkin = 1
            AND DATE_FORMAT(Appointment.ScheduledStartTime, '%Y-%m-%d') = DATE_FORMAT(NOW(), '%Y-%m-%d');
   `
};

/**
 * @description Set field CheckinUsername based on all the checked-in appointments on today's date
 * @author Shifeng Chen
 * @date 2023-01-04
 */
exports.setCheckInUsername = function () {
    return "UPDATE Appointment SET CheckinUsername = ? WHERE AppointmentSerNum IN ?";
};

/**
 * @desc Query that returns notifications for a user with LastUpdated values after a given timestamp.
 *       Until pagination is added to the app, only unread notifications will be returned (not all historical
 *       notifications), to cut down on the amount of data downloaded to the app.
 * @returns {string} The query.
 */
exports.patientNotificationsTableFields=function()
{
    return `SELECT
                p.PatientSerNum,
                p.FirstName as PatientFirstName,
                p.LastName as PatientLastName,
                n.NotificationSerNum,
                n.DateAdded,
                JSON_CONTAINS(n.ReadBy, ?) as ReadStatus,
                n.RefTableRowSerNum,
                nc.NotificationType,
                nc.Name_EN,
                nc.Name_FR,
                nc.Description_EN,
                nc.Description_FR,
                n.RefTableRowTitle_EN,
                n.RefTableRowTitle_FR
            FROM
                Notification n,
                NotificationControl nc,
                Patient p
            WHERE nc.NotificationControlSerNum = n.NotificationControlSerNum
                AND n.PatientSerNum = p.PatientSerNum
                AND n.PatientSerNum = ?
                -- For now, only return unread notifications
                AND (n.LastUpdated > ? OR nc.LastUpdated > ?)
            HAVING ReadStatus = 0
            ;
    `;
};

/**
 * @deprecated Since QSCCD-125. This query is redundant to patientNotificationsTableFields.
 * @returns {string}
 */
exports.getNewNotifications=function() {
    return `SELECT
                Notification.NotificationSerNum,
                Notification.DateAdded,
                JSON_CONTAINS(Notification.ReadBy, ?) as ReadStatus,
                Notification.RefTableRowSerNum,
                NotificationControl.NotificationType,
                NotificationControl.Name_EN,
                NotificationControl.Name_FR,
                NotificationControl.Description_EN,
                NotificationControl.Description_FR,
                Notification.RefTableRowTitle_EN,
                Notification.RefTableRowTitle_FR
            FROM
                Notification,
                NotificationControl,
                Patient,
                Users
            WHERE
                NotificationControl.NotificationControlSerNum = Notification.NotificationControlSerNum
            AND Notification.PatientSerNum=Patient.PatientSerNum
            AND Patient.PatientSerNum=Users.UserTypeSerNum
            AND Users.Username= ?
            AND Notification.ReadStatus = 0
            AND (Notification.DateAdded > ? OR NotificationControl.DateAdded > ?);
    `;
};

exports.implicitlyReadNotification = function() {
    return `
        UPDATE Notification
        SET ReadBy = JSON_ARRAY_APPEND(ReadBy, '$', ?), ReadStatus = 1
        WHERE JSON_CONTAINS(ReadBy, ?) = 0
        AND RefTableRowSerNum = ?
        AND PatientSerNum = ?
        AND NotificationControlSerNum IN (SELECT
                                            NotificationControlSerNum
                                        FROM NotificationControl
                                        WHERE NotificationType IN (?)
                                    );
    `;
}

/*
 * Named functions used to access different versions of a query.
 * Each patient data query has two versions:
 *   1. All: returns the whole list of items for a patient.
 *   2. One: returns a single item sent to a patient based on its SerNum.
 */

exports.patientAnnouncementsAll = () => patientAnnouncementTableFields(false);
exports.patientAnnouncementsOne = () => patientAnnouncementTableFields(true);

exports.patientAppointmentsAll = () => patientAppointmentTableFields(false);
exports.patientAppointmentsOne = () => patientAppointmentTableFields(true);

exports.patientDiagnosesAll = () => patientDiagnosisTableFields(false);
exports.patientDiagnosesOne = () => patientDiagnosisTableFields(true);

exports.patientDocumentsAll = () => patientDocumentTableFields(false);
exports.patientDocumentsOne = () => patientDocumentTableFields(true);

exports.patientEducationalMaterialAll = () => patientEducationalMaterialTableFields(false);
exports.patientEducationalMaterialOne = () => patientEducationalMaterialTableFields(true);

exports.patientTxTeamMessagesAll = () => patientTxTeamMessageTableFields(false);
exports.patientTxTeamMessagesOne = () => patientTxTeamMessageTableFields(true);
