angular.module('MUHCApp').controller('MainController', ["$state",'$rootScope',function ($state,$rootScope) {
    $state.transitionTo('logIn');
    //Firebase.getDefaultConfig().setPersistenceEnabled(true);
    $rootScope.showAlert=true;
    $rootScope.alerts=[];
    $rootScope.Notifications=0;
    $rootScope.NumberOfNewMessages=0;
    $rootScope.TotalNumberOfNews=0;
     $rootScope.showAlert=true;
      $rootScope.showAlertDoc=true;
    $rootScope.closeAlert = function () {
   
        $rootScope.showAlert=false;
    };
  $rootScope.closeAlertDocs = function () {
   
        $rootScope.showAlertDoc=false;
    };
   
  /*  document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady(){
    document.addEventListener("backbutton", function(e){
       if(){
           e.preventDefault();
           navigator.app.exitApp();
       }
       else {
           navigator.app.backHistory()
       }
    }, false);
}*/


    
     
}]);