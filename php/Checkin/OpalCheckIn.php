<?php

//=============================================================================================================
// OpalCheckIn.php -- PHP class that contains functions needed to properly check in a patient in Opal DB
//=============================================================================================================

//
// INCLUDES
//=============================================

// Get the database configurations
require_once "database.inc";

// Used to send push notification to all of the user devices
require_once('PatientCheckInPushNotification.php');

//
// PROCESS INCOMING REQUEST
//============================================
$PatientId = $_GET["PatientId"];

$response = OpalCheckin::ValidateCheckin($PatientId);


if($response['failure']) print("Error: " . $response['error']);
else if (count($response['data']) > 0) {
	$result = OpalCheckin::UpdateCheckinOnOpal($response['data'], $PatientId);
	print(implode($result['data']));
}
else print('Error: No appointments were successfully checked into or no appointments exist today');

//
// OPALCHECKIN CLASS
//=============================================
class OpalCheckin{

    /**
     * Updates OpalDB with the checkin states of the inputted appointments and then sends notifications to the patient
     * @param $success
     * @param $patientId
     * @return array
     */
	public static function UpdateCheckinOnOpal($success, $patientId){

        //
		// DATABASE CONFIGURATION
		//===============================================

        // Create DB connection 
        $conn = new mysqli(OPAL_DB_HOST, OPAL_DB_USERNAME, OPAL_DB_PASSWORD, OPAL_DB_NAME);

        //
        // DETERMINE IF OPAL PATIENT EXISTS BEFORE PROCEEDING
        //======================================================

        // Get the Opal Patient ID using the Aria Serial Number
        $sql = "Select Patient.PatientSerNum
				From Patient
				Where PatientId = " . $patientId;

        try {
            $patientSerNum = $conn->query($sql);

            // if Opal Patient exists
            if ($patientSerNum->num_rows > 0) {
                foreach ($success as $app) {
                    // Checkin the patient in our Database
                    $sql = "UPDATE Appointment 
                            SET Appointment.Checkin = 1
                            WHERE Appointment.AppointmentSerNum = " . $app;
                    $conn->query($sql);
                }

                //
                // SEND NOTIFICATION TO PATIENT ABOUT CHECKIN STATUS
                //========================================================
                $patientSerNum = $patientSerNum->fetch_row();
				
                $patientSerNum = $patientSerNum[0];
				
                PatientCheckInPushNotification::sendPatientCheckInNotification($patientSerNum, $success);

                // Return responses
                return self::SuccessResponse($success);
            } else return self::ErrorResponse('Inputted patient is not an Opal Patient');
        } catch(mysqli_sql_exception $e) {
            return self::ErrorResponse($e);
        }
    }

    /**
     * Validates whether or not a patient's appointments were successfully checked in on Aria and/or Medivist and then
     * returns an array of appointments that were successfully checked in
     * @param $patientId
     * @return array
     */
    public static function ValidateCheckin($patientId){
	    // Array that will hold appointmentsernum of appointments that were successfully checked in
	    $success = array();

	    // Get all of the patients appointments that are today
        $apts = self::getTodaysAppointments($patientId);
        if($apts['failure']) return self::ErrorResponse($apts['error']);
		else $apts = $apts['data'];

        //If aria appointments exist...
        if(count($apts[0]) > 0){

            //Get appointmentsernums of successfully checked in aria appointments
            $validAriaAppointments = self::validateCheckinsWithExternalDB($apts[0], $patientId, 'Aria');
            if($validAriaAppointments['failure']) return self::ErrorResponse($validAriaAppointments['error']);
            else $validAriaAppointments = $validAriaAppointments['data'];

            // Push appointmentSerNums to success array
            $success = array_merge($success, $validAriaAppointments);
			
        }

        //If medivisit appointments exist...
        if(count($apts[1]) > 0){

            //Get appointmentsernums of successfully checked in medivist appointments
            $validMediAppointments = self::validateCheckinsWithExternalDB($apts[1], $patientId, 'Medi');
            if($validMediAppointments['failure']) return self::ErrorResponse($validMediAppointments['error']);
            else $validMediAppointments = $validMediAppointments['data'];

            // Push appointmentSerNums to success array
            $success = array_merge($success, $validMediAppointments);
        }
		

        return self::SuccessResponse($success);
    }

    //
    // PRIVATE METHODS
    //===========================================

    /**
     * Gets a list of all appointments of patient on a given day from Aria and Medivisit
     * @param $patientId
     * @return array of appointments
     */
    private static function getTodaysAppointments($patientId){

        // Create DB connection  **** CURRENTLY OPAL_DB POINTS TO PRE_PROD ****
        $conn = new mysqli(OPAL_DB_HOST, OPAL_DB_USERNAME, OPAL_DB_PASSWORD, OPAL_DB_NAME);

        // Get current patients appointments from OpalDB that exist in aria
        $sqlAria = "
                Select Appointment.AppointmentSerNum, Appointment.AppointmentAriaSer
                From Patient, Appointment
                Where Patient.patientId = " . $patientId . "
                    And Patient.PatientSerNum = Appointment.PatientSerNum
                    And Appointment.SourceDatabaseSerNum = 1
                    And DATE_FORMAT(Appointment.ScheduledStartTime, '%Y-%m-%d') = DATE_FORMAT(NOW() - INTERVAL 0 DAY, '%Y-%m-%d');";

        // Get current patients appointments from OpalDB that exist in medivisit
        $sqlMediVisit = "
                Select Appointment.AppointmentSerNum, Appointment.AppointmentAriaSer
                From Patient, Appointment
                Where Patient.patientId = " . $patientId . "
                    And Patient.PatientSerNum = Appointment.PatientSerNum
                    And Appointment.SourceDatabaseSerNum = 2
                    And DATE_FORMAT(Appointment.ScheduledStartTime, '%Y-%m-%d') = DATE_FORMAT(NOW() - INTERVAL 0 DAY, '%Y-%m-%d');";
         try{
             $apts = array();
             $aria = array();
             $medi = array();

             $resultAria = $conn->query($sqlAria);

             while ($row = $resultAria->fetch_assoc()) {
                 $aria[] = $row;
             }

             $resultMedi = $conn->query($sqlMediVisit);

             while ($row = $resultMedi->fetch_assoc()) {
                 $medi[] = $row;
             }

             $apts[] = $aria;
             $apts[] = $medi;

             return self::SuccessResponse($apts);
         }catch(mysqli_sql_exception $e) {
             return self::ErrorResponse($e);
         }
    }

    /**
     * Checks whether opalDB appointments exist in either aria or medivisit and returns array of verified appointments
     * @param $appts
     * @param $patientId
     * @param $location
     * @return array
     */
    private static function validateCheckinsWithExternalDB($appts, $patientId, $location){
        $success = array();

        //Get Aria ser num of each checked in appointment in Aria
        try{
            $ext_appts = ($location == 'Aria') ?  self::getCheckedInAriaAppointments($patientId) : self::getCheckedInMediAppointments($patientId);
            $ext_appts = $ext_appts['data'];
						
        } catch (Exception $e) {
            return self::ErrorResponse($e);
        }

        // Cross verify opalDB appointments with external DB appointments
        foreach ($appts as $apt){
            if(in_array($apt['AppointmentAriaSer'], $ext_appts)){
                $success[] = $apt['AppointmentSerNum'];
            }
        }
		
		
        return self::SuccessResponse($success);
    }

    /**
     * Gets a list of checked in appointments in Aria
     * @param $patientId
     * @return array
     * @throws Exception
     */
    private static function getCheckedInAriaAppointments($patientId){

        // Create DB connection  **** CURRENTLY OPAL_DB POINTS TO ARIA ****
        $conn = mssql_connect(ARIA_DB_HOST, ARIA_DB_USERNAME, ARIA_DB_PASSWORD);

        // Check connections
        if (!$conn) {
            throw new Exception('Something went wrong while connecting to MSSQL');
        }

        // The first subquery gets the list of todays Schedule Activity of a patient
        // The top query gets the list of Schedule Activity Serial Number that exist in the patient location table (indicate that the patient have successfully checked in)
        $sql = "Select ScheduledActivitySer as AppointmentSerNum
                From variansystem.dbo.PatientLocation
                Where ScheduledActivitySer IN
                  (Select ScheduledActivity.ScheduledActivitySer
                  From variansystem.dbo.Patient, variansystem.dbo.ScheduledActivity
                  Where Patient.PatientSer = ScheduledActivity.PatientSer
                    AND Patient.PatientId = '" . $patientId . "'
                    AND left(convert(varchar, ScheduledActivity.ScheduledStartTime, 120), 10) = left(convert(varchar, getdate() - 0, 120), 10) 
                  )
                AND CheckedInFlag = 1";

        $resultAria = mssql_query($sql);

        $apts = array();

        while($row = mssql_fetch_array($resultAria )){
            $apts[] = $row['AppointmentSerNum'];
        }

        return self::SuccessResponse($apts);
    }

    /**
     * Gets a list of all checked in appointments on MediVisit
     * @param $patientId
     * @return array
     */
    private static function getCheckedInMediAppointments($patientId){

        // Create DB connection to WaitingRoomManagement
        $conn = new mysqli(WRM_DB_HOST, WRM_DB_USERNAME, WRM_DB_PASSWORD, WRM_DB_NAME);

        // Gets the list of Schedule Aria Appointments that have successfully checked in
        $sql = "Select PMH.AppointmentSerNum
                From PatientLocationMH PMH, Patient P, MediVisitAppointmentList MVA
                Where P.PatientSerNum = MVA.PatientSerNum
                    And P.PatientId = " . $patientId . "
                    And MVA.AppointmentSerNum = PMH.AppointmentSerNum
                    And CheckinVenueName like '%Waiting Room%'
                    And DATE_FORMAT(ArrivalDateTime, '%Y-%m-%d') = DATE_FORMAT(NOW() - INTERVAL 0 DAY, '%Y-%m-%d');";

        try{
            $resultMedi = $conn->query($sql);

            $medi = array();

            while ($row = $resultMedi->fetch_assoc()) {
                $medi[] = $row['AppointmentSerNum'];
            }
        } catch (mysqli_sql_exception $e) {
            return self::ErrorResponse($e);
        }


        return self::SuccessResponse($medi);
    }

    public static function SuccessResponse($data){
        return array("success"=>true, "failure"=>false, "data"=>$data);
    }

    public static function ErrorResponse($err){
        return array("success"=>false, "failure"=>true, "error"=>$err);
    }

}
?>


