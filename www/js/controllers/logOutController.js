
//
//  Created by David Herrera on 2015-05-04.
//  Copyright (c) 2015 David Herrera. All rights reserved.
//
angular.module('MUHCApp').controller('logOutController',['Auth','$rootScope','UserAuthorizationInfo', '$state','$q','RequestToServer', function(Auth, $rootScope, UserAuthorizationInfo,$state,$q,RequestToServer){
		console.log(Auth);
		if($rootScope.refresh!==true){
			var redirect=redirectPage();
			redirect.then(setTimeout(function(){location.reload()},100));
		}
	//this.firebaseLink.set({logged: 'false'});
		var firebaseLink=new Firebase('https://luminous-heat-8715.firebaseio.com/');

		//firebaseLink.child('Users/'+UserAuthorizationInfo.UserName).set({Logged: 'false'});
		var authData = firebaseLink.getAuth();
		firebaseLink.unauth();
		delete UserDataMutable;
		delete UserAuthorizationInfo;
		window.localStorage.removeItem('UserAuthorizationInfo');
		window.localStorage.removeItem('pass');
		window.localStorage.removeItem(UserAuthorizationInfo.UserName);
		function redirectPage(){
			Auth.$unauth();
			var r=$q.defer();
			$state.go('logIn')
			r.resolve;
			return r.promise;
		}
		RequestToServer.sendRequest('Logout');
		if(authData){
			var redirect=redirectPage();
			$rootScope.refresh=null;
			redirect.then(setTimeout(function(){location.reload()},100));
		}

		/*if(!authData){
			setTimeout(function(){
				location.reload();
			},500);
			$state.go('logIn.enter');
		}*/


}]);
