
/**
*
*
**/
var myApp=angular.module('MUHCApp');
myApp.controller('PatientPortalController',function(UpdateUI, RequestToServer, $filter, $rootScope, UserAuthorizationInfo,$location,$anchorScroll,$timeout,$scope,Messages, Patient,$rootScope,Doctors){
  $rootScope.NumberOfNewMessages='';
  $scope.sendButtonDisabled=true;
  $scope.newMessage='';
 function loadInfo(){
           var dataVal= UpdateUI.UpdateSection('Messages');
           dataVal.then(function(){
                $timeout(function(){
                  $scope.messages=Messages.getUserMessages();
                  $scope.conversation=$scope.messages[$scope.selectedIndex].Messages;
                  $rootScope.NumberOfNewMessages='';
                },10);
}, function(error){console.log(error);});

        };
         $scope.load = function($done) {
          RequestToServer.sendRequest('Refresh','Messages');
          $timeout(function() {
            loadInfo();
                $done();
          }, 3000);
};

 $scope.messages=Messages.getUserMessages();



$scope.personClicked=function(index){
    var conversation=$scope.messages[index].Messages;
    $timeout(function(){
      $rootScope.searchingMask=false;
      $scope.glue=false;
      $scope.person.selected='';
      $scope.selectedIndex=index;
       if($scope.messages[$scope.selectedIndex].ReadStatus==0){
        for (var i = 0; i < conversation.length; i++) {
            console.log($scope.messages[index].Messages[i].MessageSerNum);
            RequestToServer.sendRequest('MessageRead',$scope.messages[index].Messages[i].MessageSerNum);
            $scope.messages[index].Messages[i].ReadStatus=1;
        };
    }
      $scope.messages[$scope.selectedIndex].ReadStatus=1;
      $scope.conversation=conversation;
      Messages.changeConversationReadStatus($scope.selectedIndex);
      $scope.glue=true;
    });
};

$scope.$watch('person.selected', function(){
  $timeout(function(){
    $rootScope.searchingMask=false;
    $scope.glue=false;
    if($scope.person.selected!==undefined){
      var index=$scope.person.selected.index;
      if(index!==undefined)
      {
        $scope.selectedIndex=index;
        var conversation=$scope.messages[$scope.selectedIndex].Messages;
        if($scope.messages[$scope.selectedIndex].ReadStatus==0){
            for (var i = 0; i < $scope.messages[$scope.selectedIndex].Messages.length; i++) {
                console.log($scope.messages[index].Messages[i].MessageSerNum);
                RequestToServer.sendRequest('MessageRead',$scope.messages[index].Messages[i].MessageSerNum);
                $scope.messages[index].Messages[i].ReadStatus=1;
            };
        Messages.changeConversationReadStatus($scope.selectedIndex);
        $scope.messages[$scope.selectedIndex].ReadStatus=1;
        }
        $scope.conversation=conversation;
        $scope.glue=true;
      }else{
        if(!Messages.isEmpty()&&!Doctors.isEmpty())
        {
          if($scope.messages[$scope.selectedIndex].ReadStatus==0){
            for (var i = 0; i < $scope.messages[$scope.selectedIndex].Messages.length; i++) {
              console.log($scope.messages[$scope.selectedIndex].Messages[i].MessageSerNum);
                RequestToServer.sendRequest('MessageRead',$scope.messages[$scope.selectedIndex].Messages[i].MessageSerNum);
                $scope.messages[$scope.selectedIndex].Messages[i].ReadStatus=1;
            };
            Messages.changeConversationReadStatus($scope.selectedIndex);
            $scope.messages[$scope.selectedIndex].ReadStatus=1;
          }
          $scope.conversation=$scope.messages[$scope.selectedIndex].Messages;
          $scope.glue=true;
        }
      }
    }
  });
});

  $scope.person = {};

  $scope.people = [];
  if($scope.messages===undefined){
    $scope.messages=[];
  }
  for(var i=0;i<$scope.messages.length;i++){
    var tmp={};
    tmp.name=$scope.messages[i].MessageRecipient;

    tmp.Role=$scope.messages[i].Role;
    tmp.index=i;
    $scope.people.push(tmp);
  }
  $scope.person.selected='';
  $scope.selectedIndex=0;
  if($scope.messages[0])
  {
      $scope.conversation=$scope.messages[0].Messages;
  }

  $scope.glue=true;
  $scope.messageAttachmentOpener=function(mes){
   var app = document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1;
  if(app){
     var ref = window.open(mes.Attachment, '_blank', 'location=yes');
   }else{
     window.open(mes.Attachment);
   }
};
$scope.$watch('upload.Document',function(){
  if($scope.upload){
    if(!$scope.upload.Document){
   $timeout(function(){
        $scope.showAttachment=false;
      })
    }else{
       $timeout(function(){
        $scope.showAttachment=true;
      })
    }
}else{
  $timeout(function(){
        $scope.showAttachment=false;
  })
}
});

//Messages in Conversation Logic
$scope.$watchGroup(['newMessage','upload'],function(){
  if($scope.newMessage==''&&$scope.upload==null){
    $scope.sendButtonDisabled=true;
  }else{
    $scope.sendButtonDisabled=false;
  }
});


  $scope.submitMessage=function(){
    $scope.glue=false;
    //Create object to send
    var objectToSend={};
    //Get conversation for details
    var conversation=$scope.messages[$scope.selectedIndex];
    //create object
    objectToSend.ReceiverSerNum=conversation.UserSerNum;
    objectToSend.SenderSerNum=Patient.getUserSerNum();
    objectToSend.SenderRole='Patient';
    objectToSend.ReceiverRole=conversation.Role;
    $scope.messages[$scope.selectedIndex].DateOfLastMessage=new Date();
    Messages.setDateOfLastMessage($scope.selectedIndex, $scope.messages[$scope.selectedIndex].DateOfLastMessage);
    objectToSend.MessageDate=$filter('formatDateToFirebaseString')(new Date());
    objectToSend.MessageContent=$scope.newMessage;
    if($scope.upload){
      objectToSend.Attachment=$scope.upload.Document;
      Messages.addNewMessageToConversation($scope.selectedIndex,$scope.newMessage,new Date(),$scope.upload.Document);
      $scope.upload=null;
    }else{
      Messages.addNewMessageToConversation($scope.selectedIndex,$scope.newMessage,new Date());
    }

    //Send message request
    RequestToServer.sendRequest('Message',objectToSend);
    $scope.newMessage='';
    $scope.glue=true;
    $scope.messages=Messages.getUserMessages();
  }

  $scope.getStyle=function(index){

    if($scope.messages[index].ReadStatus===0){
        return '#3399ff';
    }else{
        return '#ccc';
    }
  };
});
myApp.controller('ListOfConversationMobileController',['RequestToServer','UpdateUI', '$rootScope', 'UserAuthorizationInfo','$location','$anchorScroll','$timeout','$scope','Messages',
  function(RequestToServer, UpdateUI, $rootScope, UserAuthorizationInfo,$location,$anchorScroll,$timeout,$scope,Messages){
     $scope.initialized=false;

     $rootScope.openSearchMask=function(){
      console.log('open');
      $rootScope.searchingMask=true;
     }
     $rootScope.closeSearchMask=function(){
      console.log('close');
      $rootScope.searchingMask=false;
     }

     $scope.refreshInfo=function(val){
        if(val.length>0){
          $rootScope.searchingMask=true;
          $scope.person = {};
          $scope.people = [];
          if(!$scope.messages){
            $scope.messages=[];
          }
          for(var i=0;i<$scope.messages.length;i++){
            var tmp={};
            tmp.name=$scope.messages[i].MessageRecipient;
            tmp.Role=$scope.messages[i].Role;
            tmp.index=i;
            $scope.people.push(tmp);
            if(i===$scope.messages.length-1){
              $scope.initialized=true;
            }
          }
        }else{
          $scope.people=[];
          $rootScope.searchingMask=false;
        }


     };

      var messages=Messages.getUserMessages();

     //if request comes from contact page.
    $scope.messages=messages;
    if(param!=null){
      for(var i=0;i<messages.length;i++)
      {
        if(messages[i].UserSerNum==param.DoctorSerNum){
          param=null;
          goToConversation(i);
          break;
        }
      }
    }
     $scope.$watch('person.selected', function(){
        console.log($scope.person.selected);
        if($scope.person.selected!==undefined&&$scope.initialized){
          $timeout(function(){
            $rootScope.searchingMask=false;
            var index=$scope.person.selected.index;
            if($scope.messages[index].ReadStatus==0){
              for (var i = 0; i < $scope.messages[index].Messages.length; i++) {
                  RequestToServer.sendRequest('MessageRead',$scope.messages[index].Messages[i].MessageSerNum);
                  $scope.messages[index].Messages[i].ReadStatus=1;
              };
            }
            $scope.messages[$scope.selectedIndex].ReadStatus=1;
            Messages.changeConversationReadStatus($scope.selectedIndex);
            Messages.changeConversationReadStatus($scope.selectedIndex);
            myNavigator.pushPage("templates/messages/mobile-message-page.html", { param: index }, {animation:'slide'});
            $scope.person.selected=undefined;
          })
        }
    });

     function goToConversation(index){
       $rootScope.searchingMask=false;
        $scope.person.selected=undefined;
        if($scope.messages[index].ReadStatus==0){
          for (var i = 0; i < $scope.messages[index].Messages.length; i++) {
              console.log($scope.messages[index].Messages[i]);
              RequestToServer.sendRequest('MessageRead',$scope.messages[index].Messages[i].MessageSerNum);
              $scope.messages[index].Messages[i].ReadStatus=1;
          };
        }
        $scope.messages[index].ReadStatus=1;
        Messages.changeConversationReadStatus($scope.selectedIndex);
        Messages.changeConversationReadStatus($scope.selectedIndex);
        myNavigator.pushPage("templates/messages/mobile-message-page.html", { param: index }, {animation:'slide'});
     }


        $scope.personClicked=function(index){
            goToConversation(index);
        };




  }]);


myApp.controller('MessagePageController',function(RequestToServer,$filter, Patient,Messages,UpdateUI,$timeout,$scope,Doctors){

 $scope.getStyle=function(index){

    if($scope.messages[index].ReadStatus===0){
        return '#3399ff';
    }else{
        return '#ccc';
    }
  };

//Obtaining Index of current message
 var page = myNavigator.getCurrentPage();
 var parameters=page.options.param;
//Setting the scroll to last message, and initializing the conversation parameters
 $scope.glue=false;
 $scope.selectedIndex=parameters;
 $scope.messages=Messages.getUserMessages();
 $scope.conversation=$scope.messages[$scope.selectedIndex].Messages;
 $scope.conversationName=$scope.messages[$scope.selectedIndex].MessageRecipient;
 $scope.sendButtonDisabled=true;
 $scope.newMessageMobile='';
 $scope.heightContainer=document.documentElement.clientHeight * 0.60;
 $scope.glue=true;
 $scope.$on('elastic:resize', function(event, element, oldHeight, newHeight) {
  if(oldHeight>newHeight){
    $scope.heightContainer=$scope.heightContainer+(oldHeight-newHeight);
  }else if(oldHeight<newHeight){
    $scope.heightContainer=$scope.heightContainer-(newHeight-oldHeight);
  }
});
$scope.messageAttachmentOpener=function(mes){
  var ref = window.open(mes.Attachment, '_blank', 'location=yes');
};

$scope.$watch('upload.Document',function(){

  if($scope.upload){
    if(!$scope.upload.Document){
   $timeout(function(){
        $scope.showAttachment=false;
      })
    }else{
       $timeout(function(){
        $scope.showAttachment=true;
      })
    }
}else{
  $timeout(function(){
        $scope.showAttachment=false;
  })
}
});
$scope.$watchGroup(['newMessageMobile','upload'],function(){
    $scope.messageContentScroll=false;
  if($scope.newMessageMobile==''&&$scope.upload==null){
      $scope.sendButtonDisabled=true;
    }else{
      $scope.sendButtonDisabled=false;
    }
      $scope.messageContentScroll=true;
});
//Individual sent message function, saves message via service to firebase and to user's object
$scope.submitMessage=function(){
  $scope.glue=false;
 //Create object to send
  var objectToSend={};

  //Get conversation for details
  var conversation=$scope.messages[$scope.selectedIndex];
  $scope.messages[$scope.selectedIndex].DateOfLastMessage=new Date();

  //create object
  objectToSend.ReceiverSerNum=conversation.UserSerNum;
  objectToSend.SenderSerNum=Patient.getUserSerNum();
  objectToSend.SenderRole='Patient';
  objectToSend.ReceiverRole=conversation.Role;
  objectToSend.MessageDate=$filter('formatDateToFirebaseString')($scope.messages[$scope.selectedIndex].DateOfLastMessage);
  objectToSend.MessageContent=$scope.newMessageMobile;

  Messages.setDateOfLastMessage($scope.selectedIndex, $scope.messages[$scope.selectedIndex].DateOfLastMessage);
  if($scope.upload){
    objectToSend.Attachment=$scope.upload.Document;
    Messages.addNewMessageToConversation($scope.selectedIndex,$scope.newMessageMobile,new Date(),$scope.upload.Document);
    $scope.upload=null;
  }else{
    Messages.addNewMessageToConversation($scope.selectedIndex,$scope.newMessageMobile,new Date());
    console.log(Messages.getUserMessages());
  }

  //Add message to conversation
  //Send message request
  RequestToServer.sendRequest('Message',objectToSend);
  $scope.newMessageMobile='';
  $scope.glue=true;
  $timeout(function(){
    $scope.messages=Messages.getUserMessages();
    console.log($scope.messages);
  });

};


$scope.goToContact=function(){
  var doctor=Doctors.getDoctorBySerNum($scope.messages[$scope.selectedIndex].UserSerNum);
  console.log(doctor);
  myNavigator.pushPage('./templates/contacts/individual-contact.html',{param:{doctor:doctor,
    flagInConversation:1}});
};
});
