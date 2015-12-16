var myApp=angular.module('MUHCApp');
myApp.service('EncryptionService',function(UserAuthorizationInfo){
	function decryptObject(object)
	    {

		       	for (var key in object)
		       	{
			        if (typeof object[key]=='object')
			        {
			        	decryptObject(object[key]);
			        }else
			        {
								if(object[key]!='')
								{
									try {
										var decipherbytes = CryptoJS.AES.decrypt(object[key], '12345');
										object[key]=decipherbytes.toString(CryptoJS.enc.Utf8)
										}
										catch(err) {
										    console.log(err);
										}

								}
			        }
		       	}

		 	 return object;
	    };
    function encryptObject(object)
	{

	 	if (typeof object=='string'){
	 		var ciphertext = CryptoJS.AES.encrypt(object, '12345');
	 		var encryptedString=ciphertext.toString();

	 		return encryptedString;
	 	}else if(typeof object!=='string'&& typeof object!=='object'){
	 		object=String(object);
	 		var ciphertext = CryptoJS.AES.encrypt(object, '12345');
	 		var encryptedString=ciphertext.toString();
	 		console.log(encryptedString);
	 		return encryptedString;
	 	}else{
			for (var key in object)
			{
				if (typeof object[key]=='object')
			    {
			      encryptObject(object[key]);
			    }else
			    {
			      if (typeof object[key] !=='string') object[key]=String(object[key]);
			      var ciphertext = CryptoJS.AES.encrypt(object[key], '12345');
			      object[key]=ciphertext.toString();
			    }
			}

			return object;
		}
	};
	return{
		decryptData:function(object)
	    {
	    	return decryptObject(object);
	    },
	    encryptData:function(object)
	     {
	     	return encryptObject(object);
	     }



	}


});
