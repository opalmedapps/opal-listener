//Get Patient table information for a particular patient
exports.patientTableFields=function()
{
    /* Note: "" AS PatientId
     *       This was added to make the Account tab display nothing instead of the Patient's MRN
     *       The PatientId attribute can be removed after qplus PR #829 is merged
     * -SB */
    return `SELECT p.PatientSerNum, p.TestUser, p.FirstName, p.LastName, p.TelNum, "" AS PatientId, p.Email, p.Alias,
                   p.Language, p.EnableSMS, p.ProfileImage, p.SSN, p.AccessLevel
            FROM Patient p, Users u
            WHERE u.Username = ?
              AND u.UserTypeSerNum = p.PatientSerNum
              AND p.LastUpdated > ?
            ;`
};
/**
 * @deprecated;
 * @returns {string}
 */
exports.patientDoctorTableFields=function()
{
	return "SELECT ifnull(D.FirstName, '') FirstName, ifnull(D.LastName, '') LastName, D.DoctorSerNum, PD.PrimaryFlag, PD.OncologistFlag, ifnull(D.Email, '') Email, ifnull(D.Phone, '') Phone, ifnull(D.ProfileImage, '') ProfileImage, ifnull(D.Address, '') Address,	ifnull(D.BIO_EN, '') Bio_EN, ifnull(D.BIO_FR, '') Bio_FR FROM Doctor D, PatientDoctor PD, Patient P, Users U WHERE U.Username Like ? AND P.PatientSerNum=U.UserTypeSerNum AND PD.PatientSerNum = P.PatientSerNum AND D.DoctorSerNum = PD.DoctorSerNum AND (D.LastUpdated > ? OR PD.LastUpdated > ?);";
};

/**
 * @description Returns a query to get the patient's diagnoses.
 * @returns {string} The requested query.
 */
exports.patientDiagnosisTableFields=function()
{
    return `SELECT
                D.DiagnosisSerNum,
                D.CreationDate,
                getDiagnosisDescription(D.DiagnosisCode,'EN') Description_EN,
                getDiagnosisDescription(D.DiagnosisCode,'FR') Description_FR
            FROM Diagnosis D, Patient P, Users U
            WHERE U.UserTypeSerNum = P.PatientSerNum
              AND D.PatientSerNum = P.PatientSerNum
              AND U.Username = ?
              AND D.LastUpdated > ?
            ;`
};

exports.patientMessageTableFields=function()
{
    return "SELECT Messages.MessageSerNum, Messages.LastUpdated, Messages.SenderRole, Messages.ReceiverRole, Messages.SenderSerNum, Messages.ReceiverSerNum, Messages.MessageContent, Messages.ReadStatus, Messages.MessageDate FROM Messages, Patient, Users WHERE Patient.PatientSerNum=Users.UserTypeSerNum AND ((Messages.ReceiverRole='Patient' AND Patient.PatientSerNum = Messages.ReceiverSerNum) OR (Messages.SenderRole='Patient' AND Patient.PatientSerNum = Messages.SenderSerNum)) AND Users.Username Like ? AND Messages.LastUpdated > ? ORDER BY Messages.MessageDate ASC;";
};

/**
 * @desc Query that returns the patient's appointments.
 * @param {boolean} [selectOne] If provided, only one appointment with a specific SerNum is returned.
 * @returns {string} The query.
 */
function patientAppointmentsTableFields(selectOne) {
    return `SELECT
                IfNull(HM2.MapUrl, '') AS MapUrl,
                IfNull(HM2.MapUrl_EN, '') AS MapUrl_EN,
                IfNull(HM2.MapUrl_FR, '') AS MapUrl_FR,
                IfNull(HM2.MapName_EN, '') AS MapName_EN,
                IfNull(HM2.MapName_FR, '') AS MapName_FR,
                IfNull(HM2.MapDescription_EN, '') AS MapDescription_EN,
                IfNull(HM2.MapDescription_FR, '') AS MapDescription_FR,
                A2.*
            FROM
                HospitalMap HM2,
                (
                    SELECT
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
                        Appt.ReadStatus,
                        R.ResourceName,
                        R.ResourceType,
                        Appt.Status,
                        IfNull(Appt.RoomLocation_EN, '') AS RoomLocation_EN,
                        IfNull(Appt.RoomLocation_FR, '') AS RoomLocation_FR,
                        Appt.LastUpdated,
                        IfNull(emc.URL_EN, '') AS URL_EN,
                        IfNull(emc.URL_FR, '') AS URL_FR,
                        IfNull(AC.CheckinPossible, 0) AS CheckinPossible,
                        IfNull(AC.CheckinInstruction_EN, '') AS CheckinInstruction_EN,
                        IfNull(AC.CheckinInstruction_FR, '') AS CheckinInstruction_FR,
                        A.HospitalMapSerNum
                    FROM
                        Appointment Appt
                        INNER JOIN ResourceAppointment RA ON RA.AppointmentSerNum = Appt.AppointmentSerNum
                        INNER JOIN Resource R ON RA.ResourceSerNum = R.ResourceSerNum
                        INNER JOIN AliasExpression AE ON AE.AliasExpressionSerNum = Appt.AliasExpressionSerNum
                        INNER JOIN Alias A ON AE.AliasSerNum = A.AliasSerNum
                        LEFT JOIN HospitalMap HM ON HM.HospitalMapSerNum = A.HospitalMapSerNum
                        INNER JOIN AppointmentCheckin AC ON AE.AliasSerNum = AC.AliasSerNum
                        LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = A.EducationalMaterialControlSerNum
                    WHERE
                        Appt.PatientSerNum = (SELECT P.PatientSerNum FROM Patient P, Users U WHERE U.Username = ? AND U.UserTypeSerNum = P.PatientSerNum)
                        AND Appt.State = 'Active'
                        AND Appt.Status <> 'Deleted'
                        ${selectOne ? 'AND Appt.AppointmentSerNum = ?' : ''}
                        ${!selectOne ? 'AND (Appt.LastUpdated > ? OR A.LastUpdated > ? OR AE.LastUpdated > ? OR R.LastUpdated > ? OR HM.LastUpdated > ?)' : ''}
                    ORDER BY Appt.AppointmentSerNum, ScheduledStartTime
                ) as A2
            WHERE
                HM2.HospitalMapSerNum = getLevel(A2.ScheduledStartTime, A2.ResourceDescription, A2.HospitalMapSerNum)
            ;
    `;
}

/**
 * @desc Returns a query that fetches all of a patient's appointments.
 * @returns {string} The query.
 */
exports.patientAppointmentsAll = () => patientAppointmentsTableFields(false);

/**
 * @desc Returns a query that fetches one of a patient's appointments.
 * @returns {string} The query.
 */
exports.patientAppointmentsOne = () => patientAppointmentsTableFields(true);

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
                Document.ReadStatus,
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
                INNER JOIN Patient ON Patient.PatientSerNum = Document.PatientSerNum
                INNER JOIN AliasExpression ON AliasExpression.AliasExpressionSerNum = Document.AliasExpressionSerNum
                INNER JOIN Alias ON Alias.AliasSerNum = AliasExpression.AliasSerNum
                INNER JOIN Users ON Users.UserTypeSerNum = Patient.PatientSerNum
                INNER JOIN Staff ON Staff.StaffSerNum = Document.ApprovedBySerNum
                LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = Alias.EducationalMaterialControlSerNum
            WHERE
                Patient.AccessLevel = 3
                AND Users.Username = ?
                ${selectOne ? 'AND Document.DocumentSerNum = ?' : ''}
                ${!selectOne ? 'AND (Document.LastUpdated > ? OR Alias.LastUpdated > ?)' : ''}
            ;
    `;
}

/**
 * @desc Returns a query that fetches all of a patient's documents.
 * @returns {string} The query.
 */
exports.patientDocumentsAll = () => patientDocumentTableFields(false);

/**
 * @desc Returns a query that fetches one of a patient's documents.
 * @returns {string} The query.
 */
exports.patientDocumentsOne = () => patientDocumentTableFields(true);

exports.getDocumentsContentQuery = function()
{
    return "SELECT Document.DocumentSerNum, " +
        "case " +
        "   when instr(Document.FinalFileName, '/') = 0 then Document.FinalFileName " +
        "   when instr(Document.FinalFileName, '/') > 0 then substring(Document.FinalFileName, instr(Document.FinalFileName, '/') + 1, length(Document.FinalFileName)) " +
        "end FinalFileName " +
        "FROM Document, Patient, Users WHERE Document.DocumentSerNum IN ? AND Document.PatientSerNum = Patient.PatientSerNum AND Patient.PatientSerNum = Users.UserTypeSerNum AND Users.Username = ?";
};

exports.patientTeamMessagesTableFields=function()
{
    return "SELECT TxRecords.TxTeamMessageSerNum, TxRecords.DateAdded, TxRecords.ReadStatus, Post.PostType, Post.Body_EN, Post.Body_FR, Post.PostName_EN, Post.PostName_FR FROM PostControl as Post, TxTeamMessage as TxRecords, Patient, Users WHERE Post.PostControlSerNum=TxRecords.PostControlSerNum AND TxRecords.PatientSerNum=Patient.PatientSerNum AND Patient.PatientSerNum=Users.UserTypeSerNum AND Users.Username= ? AND (TxRecords.LastUpdated > ? OR Post.LastUpdated > ?);";
};

exports.patientAnnouncementsTableFields=function()
{
    return "SELECT Announcement.AnnouncementSerNum, Announcement.DateAdded, Announcement.ReadStatus, PostControl.PostType, PostControl.Body_EN, PostControl.Body_FR, PostControl.PostName_EN, PostControl.PostName_FR FROM PostControl, Announcement, Users, Patient WHERE PostControl.PostControlSerNum = Announcement.PostControlSerNum AND Announcement.PatientSerNum=Patient.PatientSerNum AND Patient.PatientSerNum=Users.UserTypeSerNum AND Users.Username= ? AND (Announcement.LastUpdated > ? OR PostControl.LastUpdated > ?);";
};

exports.patientEducationalMaterialTableFields=function()
{
    return `SELECT A.EducationalMaterialSerNum, A.ShareURL_EN, A.ShareURL_FR, A.EducationalMaterialControlSerNum, A.DateAdded,
                A.ReadStatus, A.EducationalMaterialType_EN, A.EducationalMaterialType_FR, A.Name_EN, A.Name_FR, A.URL_EN, A.URL_FR
            FROM Patient P, Users U, (
                SELECT EduMat.PatientSerNum, EduMat.EducationalMaterialSerNum, EduControl.ShareURL_EN, EduControl.ShareURL_FR,
                    EduControl.EducationalMaterialControlSerNum, EduMat.DateAdded, EduMat.ReadStatus,
                    EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN,
                    EduControl.Name_FR,  EduControl.URL_EN, EduControl.URL_FR, EduMat.LastUpdated EM_LastUpdated,
                    EduControl.LastUpdated EC_LastUpdated, '0000-00-00 00:00:00' TOC_LastUpdated
                FROM EducationalMaterialControl as EduControl, EducationalMaterial as EduMat
                WHERE EduMat.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum
                UNION
                SELECT EduMat.PatientSerNum, EduMat.EducationalMaterialSerNum, EduControl.ShareURL_EN, EduControl.ShareURL_FR,
                    EduControl.EducationalMaterialControlSerNum, EduMat.DateAdded, EduMat.ReadStatus,
                    EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN,
                    EduControl.Name_FR,  EduControl.URL_EN, EduControl.URL_FR, EduMat.LastUpdated EM_LastUpdated,
                    EduControl.LastUpdated EC_LastUpdated, TOC.LastUpdated TOC_LastUpdated
                FROM EducationalMaterialControl as EduControl, EducationalMaterial as EduMat,
                    EducationalMaterialTOC as TOC
                WHERE TOC.ParentSerNum = EduMat.EducationalMaterialControlSerNum
                    AND TOC.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum
                ) AS A
            WHERE P.PatientSerNum = A.PatientSerNum
                AND P.PatientSerNum = U.UserTypeSerNum
                AND U.Username = ?
                AND (A.EM_LastUpdated > ?
                    OR A.EC_LastUpdated > ?
                    OR A.TOC_LastUpdated > ?)
            ;`;
};

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
        "INNER JOIN Users ON Users.UserTypeSerNum = Patient.PatientSerNum " +
        "INNER JOIN Task ON Task.PatientSerNum = Patient.PatientSerNum " +
        "INNER JOIN AliasExpression ON AliasExpression.AliasExpressionSerNum = Task.AliasExpressionSerNum " +
        "INNER JOIN Alias ON Alias.AliasSerNum = AliasExpression.AliasSerNum " +
        "LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = Alias.EducationalMaterialControlSerNum " +
        "" +
        "WHERE " +
        "Users.Username LIKE ? " +
        "AND (Task.LastUpdated > ? OR Alias.LastUpdated > ?) " +
        "ORDER BY Task.DueDateTime ASC;";
};

exports.getPatientPasswordForVerification = function()
{
    return `SELECT DISTINCT u.Password
            FROM Users u, Patient pat
            WHERE pat.Email= ? AND pat.PatientSerNum = u.UserTypeSerNum`;
};


 exports.getPatientFieldsForPasswordReset = function()
 {
    return `SELECT DISTINCT pat.SSN, pat.Email, u.Password, u.UserTypeSerNum, sa.AnswerText, pdi.Attempt, pdi.TimeoutTimestamp
            FROM Users u, Patient pat, SecurityAnswer sa, PatientDeviceIdentifier pdi
            WHERE pat.Email= ? AND pat.PatientSerNum = u.UserTypeSerNum AND pdi.DeviceId = ?
            AND sa.SecurityAnswerSerNum = pdi.SecurityAnswerSerNum AND sa.PatientSerNum = pat.PatientSerNum`;
 };
exports.increaseSecurityAnswerAttempt = function()
{
    return `UPDATE PatientDeviceIdentifier SET Attempt = Attempt + 1 WHERE DeviceId = ?`;
};
exports.resetSecurityAnswerAttempt = function()
{
    return `UPDATE PatientDeviceIdentifier SET Attempt = 0, TimeoutTimestamp = NULL WHERE DeviceId = ?`;
};
exports.setTimeoutSecurityAnswer = function()
{
    return `UPDATE PatientDeviceIdentifier SET TimeoutTimestamp = ? WHERE DeviceId = ?`;
};
exports.setNewPassword=function()
{
    return "UPDATE Users SET Password = ? WHERE UserTypeSerNum = ?";
};

exports.checkin=function()
{
    return "UPDATE Appointment, Patient, Users SET Appointment.Checkin=1, Appointment.SessionId=? WHERE Appointment.AppointmentSerNum=? AND Appointment.PatientSerNum = Patient.PatientSerNum AND Patient.PatientSerNum = Users.UserTypeSerNum AND Users.Username = ? ";
};

exports.logCheckin = function()
{
    return "INSERT INTO `CheckinLog`(`CheckinLogSerNum`, `AppointmentSerNum`, `DeviceId`, `Latitude`, `Longitude`, `Accuracy`, `DateAdded`, `LastUpdated`) VALUES (NULL,?,?,?,?,?,?,NULL)";
};

exports.accountChange=function()
{
    return `UPDATE Patient SET ??=?, SessionId=? WHERE PatientSerNum=?`;
};
exports.inputFeedback=function(UserSerNum, content)
{
    return "INSERT INTO Feedback (`FeedbackSerNum`,`PatientSerNum`,`FeedbackContent`,`AppRating`,`DateAdded`, `SessionId`, `LastUpdated`) VALUES (NULL,?,?,?,NOW(),?, CURRENT_TIMESTAMP )";
};
//As the name implies, sends the message, this message function needs to be improved to account for injection attacks
exports.sendMessage=function(objectRequest)
{
    var token=objectRequest.Token;
    objectRequest=objectRequest.Parameters;
    var senderRole=objectRequest.SenderRole;
    var receiverRole=objectRequest.ReceiverRole;
    var senderSerNum=objectRequest.SenderSerNum;
    var receiverSerNum=objectRequest.ReceiverSerNum;
    var messageContent=objectRequest.MessageContent;
    var messageDate=objectRequest.MessageDate;
    return "INSERT INTO Messages (`MessageSerNum`, `SenderRole`,`ReceiverRole`, `SenderSerNum`, `ReceiverSerNum`,`MessageContent`,`ReadStatus`,`MessageDate`,`SessionId`,`LastUpdated`) VALUES (NULL,'"+senderRole+"','"+ receiverRole + "', '"+senderSerNum+"','"+ receiverSerNum +"','" +messageContent+"',0,'"+messageDate+"','"+token+"' ,CURRENT_TIMESTAMP )";
};
exports.getPatientFromEmail=function()
{
    return "SELECT PatientSerNum FROM Patient WHERE Email = ?";
};

exports.logActivity=function()
{
	return `INSERT INTO PatientActivityLog
                (\`ActivitySerNum\`,\`Request\`,\`Username\`,\`DeviceId\`,\`SessionId\`,\`DateTime\`,\`LastUpdated\`,\`AppVersion\`)
	        VALUES (NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)`;
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

exports.securityQuestionEncryption=function(){
    return "SELECT Password FROM Users WHERE Username = ?";
};

exports.userEncryption=function()
{
    return "SELECT sa.AnswerText FROM Users u, SecurityAnswer sa, PatientDeviceIdentifier pdi WHERE u.Username = ? AND pdi.PatientSerNum = u.UserTypeSerNum AND sa.SecurityAnswerSerNum = pdi.SecurityAnswerSerNum AND pdi.DeviceId = ?";
};
    /**
     * @deprecated;
     * @param serNum
     * @returns {string}
     */
    exports.getSecurityQuestions=function(serNum)
{
    return "SELECT SecurityQuestion.QuestionText_EN, SecurityQuestion.QuestionText_FR, SecurityAnswer.AnswerText FROM SecurityQuestion, SecurityAnswer WHERE SecurityAnswer.PatientSerNum="+serNum +" AND SecurityQuestion.SecurityQuestionSerNum = SecurityAnswer.SecurityQuestionSerNum";
};

exports.getSecQuestion=function()
{
    return "SELECT sq.QuestionText_EN, sq.QuestionText_FR, sa.SecurityAnswerSerNum, sa.PatientSerNum FROM SecurityQuestion sq, SecurityAnswer sa, Patient pat WHERE pat.Email = ? AND sa.PatientSerNum= pat.PatientSerNum AND sq.SecurityQuestionSerNum = sa.SecurityQuestionSerNum ORDER BY RAND() LIMIT 1";
};

exports.updateLogout=function()
{
    return "INSERT INTO PatientActivityLog (`ActivitySerNum`,`Request`,`Username`, `DeviceId`,`SessionId`,`DateTime`,`LastUpdated`) VALUES (NULL,?,?,?,?,?,CURRENT_TIMESTAMP )";
};
exports.updateDeviceIdentifiers = function()
{
    return "INSERT INTO `PatientDeviceIdentifier`(`PatientDeviceIdentifierSerNum`, `PatientSerNum`, `DeviceId`, `RegistrationId`, `DeviceType`, `appVersion`,`SessionId`, `Trusted`,`LastUpdated`) VALUES (NULL, ?,?,?,?,?,?, 0, NULL) ON DUPLICATE KEY UPDATE RegistrationId = ?, SessionId = ?;"
};
exports.getMapLocation=function()
{
    return "SELECT * FROM HospitalMap WHERE QRMapAlias = ?;";
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
                   EducationalMaterialControl.URL_EN, EducationalMaterialControl.URL_FR

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
        SET ReadStatus = 1
        WHERE ??.?? = ?
    `;
};

exports.getPatientDeviceLastActivity=function()
{
    return "SELECT * FROM PatientActivityLog WHERE Username=? AND DeviceId=? ORDER BY ActivitySerNum DESC LIMIT 1;";
};
exports.insertEducationalMaterialRatingQuery=function()
{
    return "INSERT INTO `EducationalMaterialRating`(`EducationalMaterialRatingSerNum`, `EducationalMaterialControlSerNum`, `PatientSerNum`, `RatingValue`, `SessionId`, `LastUpdated`) VALUES (NULL,?,?,?,?,NULL)";
};

exports.getTrustedDevice = function () {
    return "SELECT pdi.Trusted FROM PatientDeviceIdentifier pdi, Users u WHERE pdi.PatientSerNum = u.UserTypeSerNum AND u.Username = ? AND DeviceId = ?"
};

exports.setDeviceSecurityAnswer = function () {
    return "UPDATE PatientDeviceIdentifier SET SecurityAnswerSerNum = ? WHERE DeviceId = ? AND PatientSerNum = ?";
};

exports.setTrusted = function () {
    return "UPDATE PatientDeviceIdentifier SET Trusted = 1 WHERE DeviceId = ?";
};

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
 * @desc Query that returns all notifications for a user with LastUpdated values after a given timestamp.
 * @returns {string} The query.
 */
exports.patientNotificationsTableFields=function()
{
    return `SELECT
                n.NotificationSerNum,
                n.DateAdded,
                n.ReadStatus,
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
                Patient p,
                Users u
            WHERE nc.NotificationControlSerNum = n.NotificationControlSerNum
                AND n.PatientSerNum = p.PatientSerNum
                AND p.PatientSerNum = u.UserTypeSerNum
                AND u.Username = ?
                AND (n.LastUpdated > ? OR nc.LastUpdated > ?)
            ;
    `;
};

/**
 * @deprecated Since QSCCD-125. This query is redundant to patientNotificationsTableFields.
 * @returns {string}
 */
exports.getNewNotifications=function() {
    return "SELECT Notification.NotificationSerNum, " +
        "Notification.DateAdded," +
        " Notification.ReadStatus, " +
        "Notification.RefTableRowSerNum, " +
        "NotificationControl.NotificationType, " +
        "NotificationControl.Name_EN, " +
        "NotificationControl.Name_FR, " +
        "NotificationControl.Description_EN, " +
        "NotificationControl.Description_FR, " +
        "Notification.RefTableRowTitle_EN, " +
        "Notification.RefTableRowTitle_FR " +
        "" +
        "FROM Notification, " +
        "NotificationControl, " +
        "Patient, " +
        "Users " +
        "" +
        "WHERE " +
        "NotificationControl.NotificationControlSerNum = Notification.NotificationControlSerNum " +
        "AND Notification.PatientSerNum=Patient.PatientSerNum " +
        "AND Patient.PatientSerNum=Users.UserTypeSerNum " +
        "AND Users.Username= ? " +
        "AND Notification.ReadStatus = 0 " +
        "AND (Notification.DateAdded > ? OR NotificationControl.DateAdded > ?);";
};
