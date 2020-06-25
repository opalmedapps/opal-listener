var exports=module.exports={};
//Get Patient table information for a particular patient
exports.patientTableFields=function()
{
    return `SELECT Patient.PatientSerNum, Patient.TestUser, Patient.FirstName, Patient.LastName, Patient.TelNum, Patient.PatientId, Users.Email, Patient.Alias, Patient.Language, Patient.EnableSMS, Users.ProfileImage, Patient.SSN, Patient.AccessLevel 
            FROM Patient, Users, UserPatient
            WHERE Users.Username LIKE ?
                AND UserPatient.PatientSerNum = Patient.PatientSerNum
                AND UserPatient.UserSerNum = Users.UserSerNum
                AND Patient.LastUpdated > ?;`;
};

exports.patientDoctorTableFields=function()
{
	return `SELECT ifnull(D.FirstName, '') FirstName, ifnull(D.LastName, '') LastName, D.DoctorSerNum, PD.PrimaryFlag, PD.OncologistFlag, ifnull(D.Email, '') Email, ifnull(D.Phone, '') Phone, ifnull(D.ProfileImage, '') ProfileImage, ifnull(D.Address, '') Address,\tifnull(D.BIO_EN, '') Bio_EN, ifnull(D.BIO_FR, '') Bio_FR 
            FROM Doctor D, PatientDoctor PD, Patient P, Users U, UserPatient UP 
            WHERE U.Username LIKE ?
                AND P.PatientSerNum = UP.PatientSerNum 
                AND U.UserSerNum = UP.UserSerNum
                AND PD.PatientSerNum = P.PatientSerNum 
                AND D.DoctorSerNum = PD.DoctorSerNum 
                AND (D.LastUpdated > ? OR PD.LastUpdated > ?);`;
};

exports.patientDiagnosisTableFields=function()
{
    return `SELECT D.CreationDate, getDiagnosisDescription(D.DiagnosisCode,'EN') Description_EN, getDiagnosisDescription(D.DiagnosisCode,'FR') Description_FR 
            FROM Diagnosis D, Patient P, Users U, UserPatient UP
            WHERE UP.PatientSerNum = P.PatientSerNum 
                AND UP.UserSerNum = U.UserSerNum
                AND D.PatientSerNum = P.PatientSerNum 
                AND U.Username Like ?
                AND D.LastUpdated > ?;`;
};

exports.patientMessageTableFields=function()
{
    return `SELECT Messages.MessageSerNum, Messages.LastUpdated, Messages.SenderRole, Messages.ReceiverRole, Messages.SenderSerNum, Messages.ReceiverSerNum, Messages.MessageContent, Messages.ReadStatus, Messages.MessageDate 
            FROM Messages, Patient, Users, UserPatient
            WHERE Patient.PatientSerNum = UserPatient.PatientSerNum 
                AND Users.UserSerNum = UserPatient.UserSerNum
                AND ((Messages.ReceiverRole='Patient' AND Patient.PatientSerNum = Messages.ReceiverSerNum) OR (Messages.SenderRole='Patient' AND Patient.PatientSerNum = Messages.SenderSerNum)) 
                AND Users.Username Like ?
                AND Messages.LastUpdated > ?
            ORDER BY Messages.MessageDate ASC;`;
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
                  "concat(if(Appt.Status = 'Cancelled', '[Cancelled] - ', ''), getTranslation('Alias', 'AliasName_EN', IfNull(A.AliasName_EN, ''), A.AliasSerNum)) AS AppointmentType_EN, " +
                  "concat(if(Appt.Status = 'Cancelled', convert('[Annulé] - ' using utf8), ''), IfNull(A.AliasName_FR, '')) AS AppointmentType_FR, " +
                  "IfNull(A.AliasDescription_EN, '') AS AppointmentDescription_EN, " +
                  "IfNull(A.AliasDescription_FR, '') AS AppointmentDescription_FR, " +
                  "IfNull(AE.Description, '') AS ResourceDescription, " +
                  "Appt.ScheduledStartTime, " +
                  "Appt.ScheduledEndTime, " +
                  "Appt.Checkin, " +
                  "Appt.SourceDatabaseSerNum, " +
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
              "WHERE Appt.PatientSerNum = (select P.PatientSerNum from Patient P,  Users U, UserPatient UP where U.Username = ? and UP.PatientSerNum = P.PatientSerNum AND U.UserSerNum = UP.UserSerNum) " +
                "AND Appt.State = 'Active' " +
                "AND Appt.Status <> 'Deleted' " +
                "AND (Appt.LastUpdated > ? OR A.LastUpdated > ? OR AE.LastUpdated > ? OR R.LastUpdated > ? OR HM.LastUpdated > ?) " +
              "ORDER BY Appt.AppointmentSerNum, ScheduledStartTime ) as A2 " +
          "where HM2.HospitalMapSerNum = getLevel(A2.ScheduledStartTime, A2.ResourceDescription, A2.HospitalMapSerNum);";
};

exports.patientDocumentTableFields=function()
{
    return `SELECT DISTINCT  
                CASE
                    WHEN instr(Document.FinalFileName, '/') = 0 THEN Document.FinalFileName
                    WHEN instr(Document.FinalFileName, '/') > 0 THEN substring(Document.FinalFileName, instr(Document.FinalFileName, '/') + 1, length(Document.FinalFileName))
                END FinalFileName,
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
                 INNER JOIN UserPatient ON UserPatient.PatientSerNum = Patient.PatientSerNum  
                 INNER JOIN Users ON Users.UserSerNum = UserPatient.UserSerNum
                 INNER JOIN Staff ON Staff.StaffSerNum = Document.ApprovedBySerNum  
                 LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = Alias.EducationalMaterialControlSerNum           
            WHERE  
                 Patient.AccessLevel = 3  
                 AND Users.Username LIKE ?
                 AND (Document.LastUpdated > ? OR Alias.LastUpdated > ?);`;
};
exports.getDocumentsContentQuery = function()
{
    return `SELECT Document.DocumentSerNum, 
                CASE 
                    WHEN instr(Document.FinalFileName, '/') = 0 THEN Document.FinalFileName
                    WHEN instr(Document.FinalFileName, '/') > 0 THEN substring(Document.FinalFileName, instr(Document.FinalFileName, '/') + 1, length(Document.FinalFileName))
                END FinalFileName
            FROM Document, Patient, Users, UserPatient
            WHERE Document.DocumentSerNum IN ?
                AND Document.PatientSerNum = Patient.PatientSerNum 
                AND Patient.PatientSerNum = UserPatient.PatientSerNum 
                AND UserPatient.UserSerNum = Users.UserSerNum
                AND Users.Username = ?;`;
};

exports.patientTeamMessagesTableFields=function()
{
    return `SELECT TxRecords.TxTeamMessageSerNum, TxRecords.DateAdded, TxRecords.ReadStatus, Post.PostType, Post.Body_EN, Post.Body_FR, Post.PostName_EN, Post.PostName_FR 
            FROM PostControl as Post, TxTeamMessage as TxRecords, Patient, Users, UserPatient
            WHERE Post.PostControlSerNum = TxRecords.PostControlSerNum 
                AND TxRecords.PatientSerNum = Patient.PatientSerNum 
                AND Patient.PatientSerNum = UserPatient.PatientSerNum 
                AND UserPatient.UserSerNum = Users.UserSerNum
                AND Users.Username = ?
                AND (TxRecords.LastUpdated > ? OR Post.LastUpdated > ?);`;
};
exports.patientAnnouncementsTableFields=function()
{
    return `SELECT Announcement.AnnouncementSerNum, Announcement.DateAdded, Announcement.ReadStatus, PostControl.PostType, PostControl.Body_EN, PostControl.Body_FR, PostControl.PostName_EN, PostControl.PostName_FR 
            FROM PostControl, Announcement, Users, Patient, UserPatient
            WHERE PostControl.PostControlSerNum = Announcement.PostControlSerNum 
                AND Announcement.PatientSerNum = Patient.PatientSerNum 
                AND Patient.PatientSerNum = UserPatient.PatientSerNum
                AND UserPatient.UserSerNum = Users.UserSerNum
                AND Users.Username= ?
                AND (Announcement.LastUpdated > ? OR PostControl.LastUpdated > ?);`;
};
exports.patientEducationalMaterialTableFields=function()
{
    return `SELECT DISTINCT 
                EduMat.EducationalMaterialSerNum, 
                EduControl.ShareURL_EN, 
                EduControl.ShareURL_FR, 
                EduControl.EducationalMaterialControlSerNum,  
                EduMat.DateAdded, 
                EduMat.ReadStatus, 
                EduControl.EducationalMaterialType_EN, 
                EduControl.EducationalMaterialType_FR, 
                EduControl.Name_EN, 
                EduControl.Name_FR,  
                EduControl.URL_EN,
                EduControl.URL_FR, 
                Phase.Name_EN as PhaseName_EN, 
                Phase.Name_FR as PhaseName_FR  
            FROM 
                Users, 
                Patient, 
                UserPatient,
                EducationalMaterialControl as EduControl, 
                EducationalMaterial as EduMat, 
                PhaseInTreatment as Phase, 
                EducationalMaterialTOC as TOC  
            WHERE 
                (EduMat.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum OR  (TOC.ParentSerNum = EduMat.EducationalMaterialControlSerNum AND TOC.EducationalMaterialControlSerNum = EduControl.EducationalMaterialControlSerNum))  
                AND Phase.PhaseInTreatmentSerNum = EduControl.PhaseInTreatmentSerNum 
                AND EduMat.PatientSerNum = Patient.PatientSerNum 
                AND Patient.PatientSerNum = UserPatient.PatientSerNum
                AND UserPatient.UserSerNum = Users.UserSerNum
                AND Users.Username = ?
                AND (EduMat.LastUpdated > ? OR EduControl.LastUpdated > ? OR Phase.LastUpdated > ? OR TOC.LastUpdated > ?)
            order by FIELD(PhaseName_EN,'Prior To Treatment','During Treatment','After Treatment');`;
};

exports.patientEducationalMaterialContents=function()
{
    return "SELECT EducationalMaterialTOC.EducationalMaterialTOCSerNum ,EducationalMaterialTOC.OrderNum, EducationalMaterialTOC.ParentSerNum, EducationalMaterialTOC.EducationalMaterialControlSerNum, EduControl.EducationalMaterialType_EN, EduControl.EducationalMaterialType_FR, EduControl.Name_EN, EduControl.Name_FR, EduControl.URL_FR, EduControl.URL_EN FROM EducationalMaterialControl as EduControl, EducationalMaterialTOC WHERE EduControl.EducationalMaterialControlSerNum = EducationalMaterialTOC.EducationalMaterialControlSerNum AND EducationalMaterialTOC.ParentSerNum = ? ORDER BY OrderNum;";
};

exports.patientTasksTableFields=function()
{
    return `SELECT DISTINCT Patient.PatientAriaSer,  
                    Alias.AliasName_EN AS TaskName_EN,  
                    Alias.AliasName_FR AS TaskName_FR,  
                    Alias.AliasDescription_EN AS TaskDescription_EN,  
                    Alias.AliasDescription_FR AS TaskDescription_FR,  
                    Task.DueDateTime,  
                    emc.URL_EN,  
                    emc.URL_FR  
            FROM Patient  
                    INNER JOIN UserPatient ON Patient.PatientSerNum = UserPatient.PatientSerNum
                    INNER JOIN Users ON UserPatient.UserSerNum = Users.UserSerNum
                    INNER JOIN Task ON Task.PatientSerNum = Patient.PatientSerNum  
                    INNER JOIN AliasExpression ON AliasExpression.AliasExpressionSerNum = Task.AliasExpressionSerNum  
                    INNER JOIN Alias ON Alias.AliasSerNum = AliasExpression.AliasSerNum  
                    LEFT JOIN EducationalMaterialControl emc ON emc.EducationalMaterialControlSerNum = Alias.EducationalMaterialControlSerNum  
            WHERE  
                    Users.Username LIKE ?
                    AND (Task.LastUpdated > ? OR Alias.LastUpdated > ?)  
                    ORDER BY Task.DueDateTime ASC;`
};

exports.getPatientPasswordForVerification = function()
{
    return "SELECT DISTINCT u.Password FROM Users u WHERE u.Email = ?;";
};

 exports.getPatientFieldsForPasswordReset = function()
 {
    return `SELECT DISTINCT pat.SSN, u.Email, u.Password, pat.PatientSerNum, sa.AnswerText, pdi.Attempt, pdi.TimeoutTimestamp, u.UserSerNum
            FROM Users u, Patient pat, SecurityAnswer sa, PatientDeviceIdentifier pdi, UserPatient up
            WHERE u.Email = ? 
                AND pdi.DeviceId = ?
                AND sa.SecurityAnswerSerNum = pdi.SecurityAnswerSerNum 
                AND sa.PatientSerNum = pat.PatientSerNum
                AND pat.PatientSerNum = up.PatientSerNum 
                AND up.UserSerNum = u.UserSerNum;`;
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
    return "UPDATE Users SET Password = ? WHERE UserSerNum = ?;";
};

exports.setNewPasswordFromEmail = function()
{
    return "UPDATE Users SET Password = ?, SessionId = ? WHERE Email = ?;";
};

//For checkin
exports.getAppointmentAriaSer=function()
{
    return `SELECT Appointment.AppointmentAriaSer 
            FROM Patient, Users, Appointment, UserPatient
            WHERE Users.Username = ?
                AND Appointment.AppointmentSerNum = ? 
                AND Patient.PatientSerNum = UserPatient.PatientSerNum
                AND UserPatient.UserSerNum = Users.UserSerNum;`;
};

exports.checkin=function()
{
    return "UPDATE Appointment, Patient, Users, UserPatient SET Appointment.Checkin = 1, Appointment.SessionId = ? WHERE Appointment.AppointmentSerNum = ? AND Appointment.PatientSerNum = Patient.PatientSerNum AND Patient.PatientSerNum = UserPatient.PatientSerNum AND UserPatient.UserSerNum = Users.UserSerNum AND Users.Username = ?;";
};

exports.logCheckin = function()
{
    return "INSERT INTO `CheckinLog`(`CheckinLogSerNum`, `AppointmentSerNum`, `DeviceId`, `Latitude`, `Longitude`, `Accuracy`, `DateAdded`, `LastUpdated`) VALUES (NULL,?,?,?,?,?,?,NULL)";
};

exports.patientAccountChange=function()
{
    return "UPDATE Patient SET ??=?, SessionId=? WHERE PatientSerNum=?";
};

exports.userAccountChange = function()
{
    return "UPDATE Users SET ??=?, SessionId=? WHERE Email=?;";
};

exports.inputFeedback=function()
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
    return `SELECT up.PatientSerNum
            FROM UserPatient up, Users u
            WHERE u.Email = ?
                AND u.UserSerNum = up.UserSerNum;`;
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
    return `SELECT u.Password, sa.AnswerText 
            FROM Users u, SecurityAnswer sa, PatientDeviceIdentifier pdi, UserPatient up
            WHERE u.Username = ?
                AND pdi.PatientSerNum = up.PatientSerNum
                AND up.UserSerNum = u.UserSerNum
                AND sa.SecurityAnswerSerNum = pdi.SecurityAnswerSerNum 
                AND pdi.DeviceId = ?;`;
};

exports.getSecQuestion=function()
{
    return `SELECT sq.QuestionText_EN, sq.QuestionText_FR, sa.SecurityAnswerSerNum, sa.PatientSerNum 
            FROM SecurityQuestion sq, SecurityAnswer sa, Users u, UserPatient up
            WHERE u.Email = ?
                AND sa.PatientSerNum = up.PatientSerNum 
                AND up.UserSerNum = u.UserSerNum
                AND sq.SecurityQuestionSerNum = sa.SecurityQuestionSerNum 
            ORDER BY RAND() LIMIT 1;`;
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

exports.getPatientAriaSerQuery = function()
{
    return "SELECT Patient.PatientAriaSer, Patient.PatientId FROM Patient, Users, UserPatient WHERE Patient.PatientSerNum = UserPatient.PatientSerNum AND UserPatient.UserSerNum = Users.UserSerNum AND Users.Username = ?;";
};

exports.getPatientId= function()
{
    return "SELECT Patient.PatientId FROM Patient, Users, UserPatient WHERE Patient.PatientSerNum = UserPatient.PatientSerNum AND UserPatient.UserSerNum = Users.UserSerNum AND Users.Username = ?;";
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
    return "SELECT pdi.Trusted FROM PatientDeviceIdentifier pdi, Users u, UserPatient up WHERE pdi.PatientSerNum = up.PatientSerNum AND up.UserSerNum = u.UserSerNum AND u.Username = ? AND DeviceId = ?;";
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
    return `SELECT Notification.NotificationSerNum,  
                    Notification.DateAdded,  
                    Notification.ReadStatus,  
                    Notification.RefTableRowSerNum,  
                    NotificationControl.NotificationType,  
                    NotificationControl.Name_EN,  
                    NotificationControl.Name_FR,  
                    NotificationControl.Description_EN,  
                    NotificationControl.Description_FR,  
                    Notification.RefTableRowTitle_EN,  
                    Notification.RefTableRowTitle_FR  
            FROM Notification,  
                    NotificationControl,  
                    Patient,  
                    Users,
                    UserPatient  
            WHERE  
                    NotificationControl.NotificationControlSerNum = Notification.NotificationControlSerNum  
                    AND Notification.PatientSerNum=Patient.PatientSerNum  
                    AND Patient.PatientSerNum = UserPatient.PatientSerNum
                    AND UserPatient.UserSerNum = Users.UserSerNum
                    AND Users.Username= ?;`;
};

exports.getNewNotifications=function() {
    return `SELECT Notification.NotificationSerNum,  
                Notification.DateAdded, 
                Notification.ReadStatus,  
                Notification.RefTableRowSerNum,  
                NotificationControl.NotificationType,  
                NotificationControl.Name_EN,  
                NotificationControl.Name_FR,  
                NotificationControl.Description_EN,  
                NotificationControl.Description_FR,  
                Notification.RefTableRowTitle_EN,  
                Notification.RefTableRowTitle_FR  
            FROM Notification,  
                NotificationControl,  
                Patient,  
                Users,
                UserPatient  
            WHERE  
                NotificationControl.NotificationControlSerNum = Notification.NotificationControlSerNum  
                AND Notification.PatientSerNum=Patient.PatientSerNum  
                AND Patient.PatientSerNum = UserPatient.PatientSerNum
                AND UserPatient.UserSerNum = Users.UserSerNum 
                AND Users.Username= ?
                AND Notification.ReadStatus = 0  
                AND (Notification.DateAdded > ? OR NotificationControl.DateAdded > ?);`;
};