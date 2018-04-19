<?php
//
// INCLUDES
//===================================
include_once "database.inc";
require_once('PushNotifications.php');

class PatientCheckInPushNotification{


    /**
     * API METHODS
     * ===============================================

    /**
     * @name sendPatientCheckInNotification
     * @desc Using the PatientID, it will send a notification to the patient cell phone stating that they are now checked in.
     * @param $patientSerNum
     * @param $success
     * @return  array containing keys of success, failure,
     *          responseDevices, which is an array containing, (success, failure,
     *          registrationId, deviceId) for each device, and Message array containing
     *          (title,description),  NotificationSerNum, and error if any.
     */

    public static function sendPatientCheckInNotification($patientSerNum, $success){
        // Determines whether or not all appointments were checked in successfully
        $allSuccessful = true;

        //
        // GET THE PATIENTS SELECTED LANGUAGE
        //====================================================
        $language = self::getPatientLanguage($patientSerNum);

        //
        // POPULATE NOTIFICATIONS TABLE
        //=========================================================
        // Insert checkin notifications into opaldb
        foreach($success as $apt) {
            self::insertCheckInNotification(array($apt), $patientSerNum);
        }

        // If there are any appointments that were not successfully checked into... insert error notification
        $failedCheckins = self::getFailedCheckins($patientSerNum);

        if(count($failedCheckins) > 0) {
            $allSuccessful = false;
            self::insertCheckInNotification($failedCheckins, $patientSerNum, 'CheckInError');
        }

        //
        // SEND MESSAGE TO PATIENT DEVICES AND RECORD IN DATABASE
        //================================================================

        // Obtain patient device identifiers
        $patientDevices = self::getPatientDevices($patientSerNum);

        // If no device identifiers return there are no device identifiers
        if(count($patientDevices)==0) {
            return array("success"=>1, "failure"=>0,"responseDevices"=>"No patient devices available for that patient");
        }

        // Prepare the success message title and body
        $message = (!$allSuccessful)? self::buildMessageForPushNotification('CheckInError', $language) : self::buildMessageForPushNotification('CheckInNotification', $language);

        return self::sendPushNotifications($patientDevices, $patientSerNum, $message);
    }


    /**
     * ==============================================================================
     *                    HELPER FUNCTIONS
     * ==============================================================================
     **/

    /**
     * @name getPatientLanguage
     * @desc queries OpalDB for patient's language and their sernum
     * @param $patientSerNum
     * @return array containing language and patientsernum
     */
    private static function getPatientLanguage($patientSerNum){
        global $pdo;

        $sql = "SELECT Patient.Language
                FROM Patient
                WHERE Patient.PatientSerNum = :patientSerNum;";

        // Replace the parameter :patientId with a value and run query
        try{
            $s = $pdo->prepare($sql);
            $s->bindValue(':patientSerNum', $patientSerNum);
            $s->execute();
            $result = $s->fetch();
            return $result['Language'];
        }catch(PDOException $e) {
            return array("success"=>0,"failure"=>1,"error"=>$e);
        }
    }

    /**
     * @name insertCheckInNotification
     * @desc Inserts CheckIn notification into notifications table in OpalDB, also responsible for inserting checkin error notification
     * @param $apts
     * @param $patientSerNum
     * @param $type
     * @return array|bool
     */
    private static function insertCheckInNotification($apts, $patientSerNum, $type = 'CheckInNotification'){
        global $pdo;

        //Insert checkin notification into notifications table
        foreach ($apts as $apt){
            try{
                $sql = 'INSERT INTO `Notification` (`PatientSerNum`, `NotificationControlSerNum`, `RefTableRowSerNum`, `DateAdded`, `ReadStatus`)
                        SELECT  ' . $patientSerNum . ',ntc.NotificationControlSerNum, '. $apt . ', NOW(),0
                        FROM NotificationControl ntc 
                        WHERE ntc.NotificationType = \''. $type . '\'';

                $s = $pdo->prepare($sql);
                $s->execute();

            }catch(PDOException $e) {
                return array("success"=>0,"failure"=>1,"error"=>$e);
            }
        }

        return true;
    }

    /**
     * @name getFailedCheckins
     * @desc gets list of appointments that were not checked into successfully. This is determined by an appointment existing in our DB and not in the list of appointments in $success
     * @param $patientSerNum
     * @return array|bool
     */
    private static function getFailedCheckins($patientSerNum){
        global $pdo;

        // Retrieve the number of success and/or failed check in of the appointments
        $sql = "Select Appointment.AppointmentSerNum
                From Patient, Appointment
                Where Patient.PatientSerNum = :patientSerNum
                and Patient.PatientSerNum = Appointment.PatientSerNum
                and Appointment.Checkin = 0
                and DATE_FORMAT(Appointment.ScheduledStartTime, '%Y-%m-%d') = DATE_FORMAT(NOW(), '%Y-%m-%d');";

        // Fetch the results
        try{
            $r = $pdo->prepare($sql);
            $r->bindValue(':patientSerNum', $patientSerNum);
            $r->execute();
            $results = $r->fetchAll();

            $appts = array();
            foreach ($results as $apt) {
                $appts[] = $apt['AppointmentSerNum'];
            }

            return $appts;

        }catch(PDOException $e) {
            return array("success"=>0,"failure"=>1,"error"=>$e);
        }
    }

    /**
     *    (getDevicesForPatient($patientId)
     *    Consumes a PatientId, $patientId
     *    Returns: Returns array with devices that match that particular PatiendId.
     **/
    private static function getPatientDevices($patientSerNum){
        global $pdo;
        //Retrieving device registration id for notification and device
        try{
            $sql = "SELECT PD.PatientDeviceIdentifierSerNum, PD.RegistrationId, PD.DeviceType
                    FROM PatientDeviceIdentifier as PD, Patient as P
                    WHERE P.PatientSerNum = " . $patientSerNum . "
                    AND P.PatientSerNum = PD.PatientSerNum
                    AND length(trim(PD.RegistrationId)) > 0
                    AND PD.DeviceType in (0,1)
                    ORDER BY PD.PatientDeviceIdentifierSerNum;";
            $result = $pdo->query($sql);
        }catch(PDOException $e) {
            return array("success"=>0,"failure"=>1,"error"=>$e);
        }
        return $result ->fetchAll();
    }

    /**
     *    (buildMessageForCheckInNotification($datetimestamp, $title, $description)
     *    Build the messages with title and a description
     *    Description: Builds push notification message for checking in and repalce the string
     *      $getDateTime with the date time stamp
     *    Returns: Returns array with the push notification message to be sent
     **/
    private static function buildMessageForPushNotification($type, $language){
        //
        // GET THE TITLE AND THE BODY OF THE  PUSH NOTIFICATION
        //======================================================
        $messageLabels = self::getNotificationMessage($type, $language);

        // Get the date and time stamp of when the person checked in
        $datetimestamp = date("Y-m-d h:i:s");

        return array(
            "mtitle"=> $messageLabels["Name_".$language ],
            "mdesc"=>str_replace('$getDateTime', $datetimestamp,  $messageLabels["Description_".$language])
        );
    }

    /**
     * @name getCheckinNotificationMeta
     * @desc gets the name and description of the checkin notification based on the user language
     * @param $language
     * @return array
     */
    private static function getNotificationMessage($type, $language){
        global $pdo;

        try{
            $sql = 'SELECT Name_'.$language.', Description_'.$language.' FROM NotificationControl WHERE NotificationType = \'' .$type . '\'';
            $result = $pdo->query($sql);
            return $result->fetch();
        }catch(PDOException $e) {
            return array("success"=>0,"failure"=>1,"error"=>$e);
        }
    }

    /**
     * @name sendPushNotifications
     * @desc consumes a list of patientDevices and for each device sends a push notification letting the user know their check in status and any checkin errors that may have occurred.
     * @param $patientDevices
     * @param $patientSerNum
     * @param $message
     * @param null $error_message
     * @return array
     */
    private static function sendPushNotifications($patientDevices, $patientSerNum, $message){

        $resultsArray = array();

        foreach($patientDevices as $device) {

            $response = null;
            $responseError = null;

            // Determine device type (0 = iOS & 1 = Android)
            if($device["DeviceType"]==0) {
                $response = PushNotifications::iOS($message, $device["RegistrationId"]);
            } else if($device["DeviceType"]==1) {
                $response = PushNotifications::android($message, $device["RegistrationId"]);
            }
            // Log result of push notification on database.
            // NOTE: Inserting -1 for appointmentSerNum
            self::pushNotificationDatabaseUpdate($device["PatientDeviceIdentifierSerNum"], $patientSerNum, -1, $response);

            // Build response
            $response["DeviceType"] = $device["DeviceType"];
            $response["RegistrationId"] = $device["RegistrationId"];
            $resultsArray[] = $response;
        }
        return array("success"=>1,"failure"=>0,"responseDevices"=>$resultsArray,"message"=>$message);
    }

    /**
     *    (pushNotificationDatabaseUpdate($deviceSerNum, $patientSerNum, $appointmentSerNum, $sendStatus)
     *    Consumes a PatientDeviceIdentifierSerNum, $deviceSerNum,
     *    and response, $response, where send status is a 1 or 0 for whether is was successfully sent or not.
     *    Inserts a into the PushNotification table or updates SendLog flag.
     *    RegistrationId.
     *    Returns: Returns the send status
     **/
    private static function pushNotificationDatabaseUpdate($deviceSerNum, $patientSerNum, $appointmentSerNum, $response)
    {
        global $pdo;
        $sendStatus  = $response['success'];
        $sendLog     = $response['failure'];
        if ($sendStatus == 0) $sendStatus = 'F';
        else {
            $sendStatus = 'T';
            $sendLog = "Successfully sent push notification!";
        }
        $sql = " INSERT INTO `PushNotification`(`PatientDeviceIdentifierSerNum`, `PatientSerNum`, `NotificationControlSerNum`, `RefTableRowSerNum`, `DateAdded`, `SendStatus`, `SendLog`)
                        SELECT ".$deviceSerNum.", $patientSerNum, ntc.NotificationControlSerNum, $appointmentSerNum, NOW(),'".$sendStatus."','".$sendLog."' 
                        FROM NotificationControl ntc 
                        WHERE ntc.NotificationType in ('CheckInNotification', 'CheckInError')";
        $pdo->query($sql);
        return $sendStatus;
    }
}

?>
