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
    return "SELECT Diagnosis.CreationDate, Diagnosis.Description_EN, Diagnosis.Description_FR FROM Diagnosis, Patient, Users WHERE Users.UserTypeSerNum=Patient.PatientSerNum AND Diagnosis.PatientSerNum = Patient.PatientSerNum AND Users.Username Like ? AND Diagnosis.LastUpdated > ?;";
};

exports.patientMessageTableFields=function()
{
    return "SELECT Messages.MessageSerNum, Messages.LastUpdated, Messages.SenderRole, Messages.ReceiverRole, Messages.SenderSerNum, Messages.ReceiverSerNum, Messages.MessageContent, Messages.ReadStatus, Messages.MessageDate FROM Messages, Patient, Users WHERE Patient.PatientSerNum=Users.UserTypeSerNum AND ((Messages.ReceiverRole='Patient' AND Patient.PatientSerNum = Messages.ReceiverSerNum) OR (Messages.SenderRole='Patient' AND Patient.PatientSerNum = Messages.SenderSerNum)) AND Users.Username Like ? AND Messages.LastUpdated > ? ORDER BY Messages.MessageDate ASC;";
};

exports.patientAppointmentsTableFields=function()
{
    return "SELECT DISTINCT Appointment.AppointmentSerNum, " +
        "Alias.AliasSerNum, " +
        "Alias.AliasName_EN AS AppointmentType_EN, " +
        "Alias.AliasName_FR AS AppointmentType_FR, " +
        "Alias.AliasDescription_EN AS AppointmentDescription_EN, " +
        "Alias.AliasDescription_FR AS AppointmentDescription_FR, " +
        "AliasExpression.Description AS ResourceDescription, " +
        "Appointment.ScheduledStartTime, " +
        "Appointment.ScheduledEndTime, " +
        "Appointment.Checkin, " +
        "Appointment.AppointmentAriaSer, " +
        "Appointment.ReadStatus, " +
        "Resource.ResourceName, " +
        "Resource.ResourceType, " +
        "HospitalMap.MapUrl, " +
        "HospitalMap.MapName_EN, " +
        "HospitalMap.MapName_FR, " +
        "HospitalMap.MapDescription_EN, " +
        "HospitalMap.MapDescription_FR, " +
        "Appointment.Status, " +
        "Appointment.RoomLocation_EN, " +
        "Appointment.RoomLocation_FR, " +
        "Appointment.LastUpdated, " +
        "emc.URL_EN, " +
        "emc.URL_FR " +
        "" +
        "FROM Patient " +
        "" +
        "INNER JOIN Users ON Users.UserTypeSerNum = Patient.PatientSerNum " +
        "INNER JOIN Appointment ON Appointment.PatientSerNum = Patient.PatientSerNum " +
        "INNER JOIN HospitalMap ON HospitalMap.HospitalMapSerNum = Appointment.Location " +
        "INNER JOIN ResourceAppointment ON ResourceAppointment.AppointmentSerNum = Appointment.AppointmentSerNum " +
        "INNER JOIN Resource ON ResourceAppointment.ResourceSerNum = Resource.ResourceSerNum " +
        "INNER JOIN AliasExpression ON AliasExpression.AliasExpressionSerNum=Appointment.AliasExpressionSerNum " +
        "INNER JOIN Alias ON AliasExpression.AliasSerNum=Alias.AliasSerNum " +
        "LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = Alias.EducationalMaterialControlSerNum " +
        "" +
        "WHERE " +
        "Users.Username = ? " +
        "AND Appointment.State = 'Active' " +
        "AND (Appointment.LastUpdated > ? OR Alias.LastUpdated > ? OR AliasExpression.LastUpdated > ? OR Resource.LastUpdated > ? OR HospitalMap.LastUpdated > ?) " +
        "" +
        "ORDER BY Appointment.AppointmentSerNum, ScheduledStartTime;";
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
    return "SELECT DISTINCT EduMat.EducationalMaterialSerNum, EduControl.ShareURL_EN, EduControl.ShareURL_FR, EduControl.EducationalMaterialControlSerNum, EduMat.DateAdded, EduMat.Clicked, EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN, EduControl.Name_FR, EduControl.URL_EN, EduControl.URL_FR, Phase.Name_EN as PhaseName_EN, Phase.Name_FR as PhaseName_FR,EduMat.ScrolledToBottom as ScrolledToBottom, EduMat.ClickedBack as ClickedBack FROM Users, Patient, EducationalMaterialControl as EduControl, EducationalMaterial as EduMat, PhaseInTreatment as Phase, EducationalMaterialTOC as TOC WHERE (EduMat.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum OR (TOC.ParentSerNum = EduMat.EducationalMaterialControlSerNum AND TOC.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum)) AND Phase.PhaseInTreatmentSerNum = EduControl.PhaseInTreatmentSerNum AND  EduMat.PatientSerNum = Patient.PatientSerNum AND Patient.PatientSerNum = Users.UserTypeSerNum AND Users.Username = ? AND (EduMat.LastUpdated > ? OR EduControl.LastUpdated > ? OR Phase.LastUpdated > ? OR TOC.LastUpdated > ?) order by FIELD(PhaseName_EN,'Prior To Treatment','During Treatment','After Treatment') ;";
};
exports.patientEducationalMaterialContents=function()
{
    return "SELECT EducationalMaterialTOC.OrderNum, EducationalMaterialTOC.ParentSerNum, EducationalMaterialTOC.EducationalMaterialControlSerNum, EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN, EduControl.Name_FR, EduControl.URL_FR, EduControl.URL_EN, EducationalMaterialTOC.SubScrolledToBottom, EducationalMaterialTOC.SubClicked, EducationalMaterialTOC.SubClickedBack FROM EducationalMaterialControl as EduControl, EducationalMaterialTOC WHERE EduControl.EducationalMaterialControlSerNum = EducationalMaterialTOC.EducationalMaterialControlSerNum AND EducationalMaterialTOC.ParentSerNum = ? ORDER BY OrderNum;";
};

exports.patientEducationalMaterialPackageContents=function()
{
    return "Select EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN, EduControl.Name_FR, EduControl.URL_FR, EduControl.URL_EN,\n" +
        "EduControl.ShareURL_EN, EduControl.ShareURL_FR, EduControl.EducationalMaterialControlSerNum, PMC.PackageSerNum PackageSerNum\n" +
        "from EducationalMaterialControl as EduControl, PackageMaterialsControl as PMC\n" +
        "where EduControl.EducationalMaterialControlSerNum = PMC.MaterialsSerNum\n" +
        "and PMC.PackageSerNum = ?\n" +
        "order by PMC.MaterialOrder;"
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

/*
	return 'SELECT ComponentName, FacComponentName, AbnormalFlag, MaxNorm, MinNorm, TestValue, TestValueString, UnitDescription, CAST(TestDate AS char(30)) as `TestDate`, ' +
					'IfNull((Select EMC.URL_EN From EducationalMaterialControl EMC, TestResultControl TRC ' +
									'Where EMC.EducationalMaterialControlSerNum = TRC.EducationalMaterialControlSerNum ' +
											'and TRC.TestResultControlSerNum = TR.TestResultControlSerNum), "") as URL_EN, ' +
					'IfNull((Select EMC.URL_FR From EducationalMaterialControl EMC, TestResultControl TRC ' +
									'Where EMC.EducationalMaterialControlSerNum = TRC.EducationalMaterialControlSerNum ' +
											'and TRC.TestResultControlSerNum = TR.TestResultControlSerNum), "") as URL_FR ' +
				'FROM TestResult TR, Users U, Patient P ' +
				'WHERE P.AccessLevel = 3 AND U.UserTypeSerNum=P.PatientSerNum AND TR.PatientSerNum = P.PatientSerNum AND TR.TestDate >= "1970-01-01" AND U.Username LIKE ? AND TR.LastUpdated > ? AND TR.ValidEntry = "Y";';
*/

};
exports.patientQuestionnaireTableFields = function()
{
    return "SELECT Q.CompletedFlag, CAST(DATE_FORMAT(Q.DateAdded, '%Y-%m-%d') AS char(30)) as DateAdded, Q.PatientQuestionnaireDBSerNum, " +
//		"Q.CompletionDate, " +
//		"CAST(DATE_FORMAT(Q.CompletionDate, '%Y-%m-%d %H:%i') AS char(30)) as CompletionDate, " +
    "CAST(DATE_FORMAT(Q.CompletionDate, '%Y-%m-%d') AS char(30)) as CompletionDate, " +
		"Q.QuestionnaireSerNum, QC.QuestionnaireDBSerNum " +
		"FROM QuestionnaireControl QC, Questionnaire Q, Patient P, Users U " +
		"WHERE QC.QuestionnaireControlSerNum = Q.QuestionnaireControlSerNum " +
		"AND Q.PatientSerNum = P.PatientSerNum AND U.UserTypeSerNum = P.PatientSerNum and " +
		"U.Username = ? order by CAST(DATE_FORMAT(Q.DateAdded, '%Y-%m-%d') AS char(30)) desc";
//    return "SELECT Questionnaire.CompletedFlag, Questionnaire.DateAdded, Questionnaire.PatientQuestionnaireDBSerNum, Questionnaire.CompletionDate, Questionnaire.QuestionnaireSerNum, QuestionnaireControl.QuestionnaireDBSerNum FROM QuestionnaireControl, Questionnaire, Patient, Users WHERE QuestionnaireControl.QuestionnaireControlSerNum = Questionnaire.QuestionnaireControlSerNum AND Questionnaire.PatientSerNum = Patient.PatientSerNum AND Users.UserTypeSerNum = Patient.PatientSerNum AND Users.Username = ?";
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

exports.updateClicked=function()
{
    return `
        UPDATE ??
        SET Clicked = 1
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
        "NotificationControl.Description_FR " +
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
        "NotificationControl.Description_FR " +
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

//newly added get educational material log

exports.getEducationalLog = function(){
    console.log("in the queries");
    return "select SerNumReceived, COALESCE(viewed,0) viewed, COALESCE(received,0) received\n" +
        "from \n" +
        "(SELECT m.EducationalMaterialSerNum SerNumViewed, count(*) viewed \n" +
        "from EducationalMaterialMH m\n" +
        "where m.Clicked = 1\n" +
        "group by m.EducationalMaterialSerNum) v\n" +
        "right outer join \n" +
        "(SELECT m.EducationalMaterialSerNum SerNumReceived, count(*) received \n" +
        "from EducationalMaterialMH m\n" +
        "where m.Clicked = 0\n" +
        "group by m.EducationalMaterialSerNum) r\n" +
        "on v.SerNumViewed = r.SerNumReceived;";
};

exports.updateScrollToBottom=function()
{
    return `
        UPDATE ??
        SET ScrolledToBottom = 1
        WHERE ??.?? = ?
    `;
};

exports.updateSubScrollToBottom = function(){
    return `UPDATE ?? 
            SET SubScrolledToBottom = 1
            WHERE ??.?? = ? AND ??.?? = ?`;
};

exports.updateSubClicked = function () {
    return `UPDATE ?? 
            SET SubClicked = 1
            WHERE ??.?? = ? AND ??.?? = ?`;
};

exports.updateClickedBack=function()
{
    return `
        UPDATE ??
        SET ClickedBack = 1
        WHERE ??.?? = ?
    `;
};

exports.updateSubClickedBack = function()
{
    return `UPDATE ?? 
            SET SubClickedBack = 1
            WHERE ??.?? = ? AND ??.?? = ?`;
}