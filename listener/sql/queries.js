var exports=module.exports={};
//Get Patient table information for a particular patient
exports.patientTableFields=function()
{
    return "SELECT Patient.PatientSerNum,Patient.FirstName, Patient.LastName, Patient.TelNum, Patient.PatientId, Patient.Email, Patient.Alias, Patient.Language, Patient.EnableSMS,Patient.ProfileImage, Patient.SSN, Patient.AccessLevel FROM Patient, Users WHERE Users.Username LIKE ? AND Users.UserTypeSerNum=Patient.PatientSerNum AND Patient.LastUpdated > ?;";
};

exports.patientDoctorTableFields=function()
{
    return "SELECT Doctor.FirstName, Doctor.LastName, Doctor.DoctorSerNum, PatientDoctor.PrimaryFlag, PatientDoctor.OncologistFlag, Doctor.Email,Doctor.Phone, Doctor.ProfileImage, Doctor.Address FROM Doctor, PatientDoctor, Patient, Users WHERE Users.Username Like ? AND Patient.PatientSerNum=Users.UserTypeSerNum AND PatientDoctor.PatientSerNum = Patient.PatientSerNum AND Doctor.DoctorSerNum = PatientDoctor.DoctorSerNum AND (Doctor.LastUpdated > ? OR PatientDoctor.LastUpdated > ?);";
};

exports.patientDiagnosisTableFields=function()
{
   return "SELECT D.CreationDate, getDiagnosisDescription(D.DiagnosisCode,'EN') Description_EN, getDiagnosisDescription(D.DiagnosisCode,'FR') Description_FR FROM Diagnosis D, Patient P, Users U WHERE U.UserTypeSerNum=P.PatientSerNum AND D.PatientSerNum = P.PatientSerNum AND U.Username Like ? AND D.LastUpdated > ?;";
    // return "SELECT Diagnosis.CreationDate, Diagnosis.Description_EN, Diagnosis.Description_FR FROM Diagnosis, Patient, Users WHERE Users.UserTypeSerNum=Patient.PatientSerNum AND Diagnosis.PatientSerNum = Patient.PatientSerNum AND Users.Username Like ? AND Diagnosis.LastUpdated > ?;";
};

exports.patientMessageTableFields=function()
{
    return "SELECT Messages.MessageSerNum, Messages.LastUpdated, Messages.SenderRole, Messages.ReceiverRole, Messages.SenderSerNum, Messages.ReceiverSerNum, Messages.MessageContent, Messages.ReadStatus, Messages.MessageDate FROM Messages, Patient, Users WHERE Patient.PatientSerNum=Users.UserTypeSerNum AND ((Messages.ReceiverRole='Patient' AND Patient.PatientSerNum = Messages.ReceiverSerNum) OR (Messages.SenderRole='Patient' AND Patient.PatientSerNum = Messages.SenderSerNum)) AND Users.Username Like ? AND Messages.LastUpdated > ? ORDER BY Messages.MessageDate ASC;";
};

exports.patientAppointmentsTableFields=function()
{

  return  "select 	IfNull(HM2.MapUrl, '') AS MapUrl, " +
          	"IfNull(HM2.MapUrl_EN, '') AS MapUrl_EN, " +
      			"IfNull(HM2.MapUrl_FR, '') AS MapUrl_FR, " +
      			"IfNull(HM2.MapName_EN, '') AS MapName_EN, " +
      			"IfNull(HM2.MapName_FR, '') AS MapName_FR, " +
      			"IfNull(HM2.MapDescription_EN, '') AS MapDescription_EN, " +
      			"IfNull(HM2.MapDescription_FR, '') AS MapDescription_FR, " +
      			"A2.* " +
          "from HospitalMap HM2, " +
  	         "( SELECT Appt.AppointmentSerNum, " +
                  "A.AliasSerNum, " +
                  "getTranslation('Alias', 'AliasName_EN', IfNull(A.AliasName_EN, ''), A.AliasSerNum) AS AppointmentType_EN, " +
                  "IfNull(A.AliasName_FR, '') AS AppointmentType_FR, " +
                  "IfNull(A.AliasDescription_EN, '') AS AppointmentDescription_EN, " +
                  "IfNull(A.AliasDescription_FR, '') AS AppointmentDescription_FR, " +
                  "IfNull(AE.Description, '') AS ResourceDescription, " +
                  "Appt.ScheduledStartTime, " +
                  "Appt.ScheduledEndTime, " +
                  "Appt.Checkin, " +
                  "Appt.AppointmentAriaSer, " +
                  "Appt.ReadStatus, " +
                  "R.ResourceName, " +
                  "R.ResourceType, " +
                  "Appt.Status, " +
                  "IfNull(Appt.RoomLocation_EN, '') AS RoomLocation_EN, " +
                  "IfNull(Appt.RoomLocation_FR, '') AS RoomLocation_FR, " +
                  "Appt.LastUpdated, " +
                  "IfNull(emc.URL_EN, '') AS URL_EN, " +
                  "IfNull(emc.URL_FR, '') AS URL_FR, " +
                  "IfNull(AC.CheckinPossible, 0) AS CheckinPossible, " +
                  "IfNull(AC.CheckinInstruction_EN, '') AS CheckinInstruction_EN, " +
                  "IfNull(AC.CheckinInstruction_FR, '') AS CheckinInstruction_FR, " +
                  "A.HospitalMapSerNum " +
              "FROM Appointment Appt  " +
                "INNER JOIN ResourceAppointment RA ON RA.AppointmentSerNum = Appt.AppointmentSerNum " +
                "INNER JOIN Resource R ON RA.ResourceSerNum = R.ResourceSerNum " +
                "INNER JOIN AliasExpression AE ON AE.AliasExpressionSerNum=Appt.AliasExpressionSerNum " +
                "INNER JOIN Alias A ON AE.AliasSerNum=A.AliasSerNum " +
                "LEFT JOIN HospitalMap HM ON HM.HospitalMapSerNum=A.HospitalMapSerNum " +
                "INNER JOIN AppointmentCheckin AC ON AE.AliasSerNum=AC.AliasSerNum " +
                "LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = A.EducationalMaterialControlSerNum " +
              "WHERE Appt.PatientSerNum = (select P.PatientSerNum from Patient P,  Users U where U.Username = ? and U.UserTypeSerNum = P.PatientSerNum) " +
                "AND Appt.State = 'Active' " +
                "AND Appt.Status <> 'Deleted' " +
                "AND (Appt.LastUpdated > ? OR A.LastUpdated > ? OR AE.LastUpdated > ? OR R.LastUpdated > ? OR HM.LastUpdated > ?) " +
              "ORDER BY Appt.AppointmentSerNum, ScheduledStartTime ) as A2 " +
          "where HM2.HospitalMapSerNum = getLevel(A2.ScheduledStartTime, A2.ResourceDescription, A2.HospitalMapSerNum);";
};

exports.patientDocumentTableFields=function()
{
    return "SELECT DISTINCT " +
        "Document.FinalFileName, " +
        "Alias.AliasName_EN, " +
        "Alias.AliasName_FR, " +
        "Document.ReadStatus, " +
        "Alias.AliasDescription_EN, " +
        "Alias.AliasDescription_FR, " +
        "Document.DocumentSerNum, " +
        "Document.ApprovedTimeStamp, " +
        "Document.CreatedTimeStamp, " +
        "Staff.FirstName, " +
        "Staff.LastName, " +
        "Alias.ColorTag, " +
        "emc.URL_EN, " +
        "emc.URL_FR " +
        "" +
        "FROM " +
        "Document " +
        "INNER JOIN Patient ON Patient.PatientSerNum = Document.PatientSerNum " +
        "INNER JOIN AliasExpression ON AliasExpression.AliasExpressionSerNum = Document.AliasExpressionSerNum " +
        "INNER JOIN Alias ON Alias.AliasSerNum = AliasExpression.AliasSerNum " +
        "INNER JOIN Users ON Users.UserTypeSerNum = Patient.PatientSerNum " +
        "INNER JOIN Staff ON Staff.StaffSerNum = Document.ApprovedBySerNum " +
        "LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = Alias.EducationalMaterialControlSerNum " +
        "" +
        "WHERE " +
        "Patient.AccessLevel = 3 " +
        "AND Users.Username LIKE ? " +
        "AND (Document.LastUpdated > ? OR Alias.LastUpdated > ?);";
};
exports.getDocumentsContentQuery = function()
{
    return "SELECT Document.DocumentSerNum, Document.FinalFileName FROM Document, Patient, Users WHERE Document.DocumentSerNum IN ? AND Document.PatientSerNum = Patient.PatientSerNum AND Patient.PatientSerNum = Users.UserTypeSerNum AND Users.Username = ?";
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
    return "SELECT DISTINCT EduMat.EducationalMaterialSerNum, EduControl.ShareURL_EN, EduControl.ShareURL_FR, EduControl.EducationalMaterialControlSerNum, " +
    " EduMat.DateAdded, EduMat.ReadStatus, EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN, EduControl.Name_FR, " +
    " EduControl.URL_EN, EduControl.URL_FR, Phase.Name_EN as PhaseName_EN, Phase.Name_FR as PhaseName_FR " +
    " FROM Users, Patient, EducationalMaterialControl as EduControl, EducationalMaterial as EduMat, PhaseInTreatment as Phase, EducationalMaterialTOC as TOC " +
    " WHERE (EduMat.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum OR " +
    " (TOC.ParentSerNum = EduMat.EducationalMaterialControlSerNum AND TOC.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum)) " +
    " AND Phase.PhaseInTreatmentSerNum = EduControl.PhaseInTreatmentSerNum AND  EduMat.PatientSerNum = Patient.PatientSerNum AND Patient.PatientSerNum = Users.UserTypeSerNum " +
    " AND Users.Username = ? AND (EduMat.LastUpdated > ? OR EduControl.LastUpdated > ? OR Phase.LastUpdated > ? OR TOC.LastUpdated > ?) " +
    " order by FIELD(PhaseName_EN,'Prior To Treatment','During Treatment','After Treatment') ;";
};

exports.patientEducationalMaterialContents=function()
{
    return "SELECT EducationalMaterialTOC.EducationalMaterialTOCSerNum ,EducationalMaterialTOC.OrderNum, EducationalMaterialTOC.ParentSerNum, EducationalMaterialTOC.EducationalMaterialControlSerNum, EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN, EduControl.Name_FR, EduControl.URL_FR, EduControl.URL_EN FROM EducationalMaterialControl as EduControl, EducationalMaterialTOC WHERE EduControl.EducationalMaterialControlSerNum = EducationalMaterialTOC.EducationalMaterialControlSerNum AND EducationalMaterialTOC.ParentSerNum = ? ORDER BY OrderNum;";
};

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
exports.patientTestResultsTableFields=function()
{

	return 'SELECT ComponentName, FacComponentName, AbnormalFlag, MaxNorm, MinNorm, TestValue, TestValueString, UnitDescription, CAST(TestDate AS char(30)) as `TestDate`, ' +
				'IfNull((Select EMC.URL_EN From EducationalMaterialControl EMC, TestResultExpression TRE, TestResultControl TRC ' +
					'Where EMC.EducationalMaterialControlSerNum = TRC.EducationalMaterialControlSerNum ' +
						'and TRE.TestResultControlSerNum = TRC.TestResultControlSerNum ' +
						'and TRE.TestResultExpressionSerNum = TR.TestResultExpressionSerNum), "") as URL_EN, ' +
				'IfNull((Select EMC.URL_FR From EducationalMaterialControl EMC, TestResultExpression TRE, TestResultControl TRC ' +
					'Where EMC.EducationalMaterialControlSerNum = TRC.EducationalMaterialControlSerNum ' +
						'and TRE.TestResultControlSerNum = TRC.TestResultControlSerNum ' +
						'and TRE.TestResultExpressionSerNum = TR.TestResultExpressionSerNum), "") as URL_FR ' +
				'FROM TestResult TR, Users U, Patient P ' +
				'WHERE P.AccessLevel = 3 AND U.UserTypeSerNum=P.PatientSerNum AND TR.PatientSerNum = P.PatientSerNum AND TR.TestDate >= "1970-01-01" AND U.Username LIKE ? AND TR.LastUpdated > ? AND TR.ValidEntry = "Y";';
};
exports.patientQuestionnaireTableFields = function()
{
    return "SELECT Q.CompletedFlag, CAST(DATE_FORMAT(Q.DateAdded, '%Y-%m-%d') AS char(30)) as DateAdded, Q.PatientQuestionnaireDBSerNum, " +
    "CAST(DATE_FORMAT(Q.CompletionDate, '%Y-%m-%d') AS char(30)) as CompletionDate, " +
		"Q.QuestionnaireSerNum, QC.QuestionnaireDBSerNum " +
		"FROM QuestionnaireControl QC, Questionnaire Q, Patient P, Users U " +
		"WHERE QC.QuestionnaireControlSerNum = Q.QuestionnaireControlSerNum " +
		"AND Q.PatientSerNum = P.PatientSerNum AND U.UserTypeSerNum = P.PatientSerNum and " +
		"U.Username = ? order by CAST(DATE_FORMAT(Q.DateAdded, '%Y-%m-%d') AS char(30)) desc";
};

/*exports.getPatientFieldsForPasswordReset=function(userID)
 {
 return 'SELECT Patient.SSN, Patient.PatientSerNum FROM Patient, Users WHERE Users.Username LIKE '+"\'"+ userID+"\'"+'AND Users.UserTypeSerNum = Patient.PatientSerNum';
 };*/

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

//For checkin
exports.getAppointmentAriaSer=function()
{
    return "SELECT Appointment.AppointmentAriaSer FROM Patient, Users, Appointment WHERE Users.Username = ? AND Appointment.AppointmentSerNum = ? AND Patient.PatientSerNum = Users.UserTypeSerNum ";
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
exports.logActivity=function(requestObject)
{
	return `INSERT INTO PatientActivityLog
                (\`ActivitySerNum\`,\`Request\`,\`Username\`, \`DeviceId\`,\`SessionId\`,
                \`DateTime\`, \`LastUpdated\`)
	        VALUES (NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP ,CURRENT_TIMESTAMP )`;

    return "INSERT INTO PatientActivityLog (`ActivitySerNum`,`Request`,`Username`, `DeviceId`,`SessionId`,`DateTime`,`LastUpdated`) VALUES (NULL,'"+requestObject.Request+ "', '"+requestObject.UserID+ "', '"+requestObject.DeviceId+"','"+requestObject.Token+"', CURRENT_TIMESTAMP ,CURRENT_TIMESTAMP )";
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
    return "SELECT u.Password, sa.AnswerText FROM Users u, SecurityAnswer sa, PatientDeviceIdentifier pdi WHERE u.Username = ? AND pdi.PatientSerNum = u.UserTypeSerNum AND sa.SecurityAnswerSerNum = pdi.SecurityAnswerSerNum AND pdi.DeviceId = ?";
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
    return "INSERT INTO `PatientDeviceIdentifier`(`PatientDeviceIdentifierSerNum`, `PatientSerNum`, `DeviceId`, `RegistrationId`, `DeviceType`,`SessionId`, `Trusted`,`LastUpdated`) VALUES (NULL, ?,?,?,?,?, 0, NULL) ON DUPLICATE KEY UPDATE RegistrationId = ?, SessionId = ?;"
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
exports.setQuestionnaireCompletedQuery = function()
{
    return "UPDATE `Questionnaire` SET PatientQuestionnaireDBSerNum = ?, CompletedFlag = 1, CompletionDate = ?, SessionId = ? WHERE Questionnaire.QuestionnaireSerNum = ?;";
};

exports.getPatientAriaSerQuery = function()
{
    return "SELECT Patient.PatientAriaSer, Patient.PatientId FROM Patient, Users WHERE Patient.PatientSerNum = Users.UserTypeSerNum && Users.Username = ?"
};

exports.getPatientId= function()
{
    return "SELECT Patient.PatientId FROM Patient, Users WHERE Patient.PatientSerNum = Users.UserTypeSerNum && Users.Username = ?"
};

exports.getPatientId= function()
{
    return "SELECT Patient.PatientId FROM Patient, Users WHERE Patient.PatientSerNum = Users.UserTypeSerNum && Users.Username = ?"
};

/**
 * Returns the query needed to get a patient's serNum
 * @return {string}
 */
exports.getPatientSerNum = function()
{
    return `Select Patient.PatientSerNum
            From Patient
            Where Patient.PatientId = ?`
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
 * NOTIFICATION QUERIES
 * ================================
 */

exports.patientNotificationsTableFields=function()
{
    return "SELECT Notification.NotificationSerNum, " +
        "Notification.DateAdded, " +
        "Notification.ReadStatus, " +
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
        "AND Users.Username= ? ";
};


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
