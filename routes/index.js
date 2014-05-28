var bcrypt = require('bcrypt');
var flash = {};

/*
 * GET pages
 */

 exports.index = function(req, res){
 	res.render('login');
 };
 exports.login = function  (req,res) {
 	res.render('login');
 };
 exports.register = function  (req, res) {
 	res.render('register');
 };
 exports.code = function (req,res) {
 	res.render('code');
 }
 exports.key = function  (req,res) {
 	res.render('key');
 };
 exports.logout = function (req,res) {
 	//renewCodeKey(req,res);
 	req.session.authenticated = false;
 	req.session.user = null;
 	req.session.retry = 0;
 	showAlert(res,'login','alert-success','logout! good bye!');
 }

/**
POST pages
*/
exports.registerUser = function (req,res) {
//pull variables off the req body

req.check('username', "Username is required").notEmpty();
req.check('password', "password is required").notEmpty();
req.check('display', "Display is required").notEmpty();
req.check('email',"Email is required and must be valid").isEmail().notEmpty();
req.check('key', "Key must be letters (3 letters)").isAlpha();
req.check('key', "Key must be Uppercase (3 letters)").isUppercase();
req.check('key', "Key must be 3 letters").isLength(3,3)
//check validation object for errors
var errors = req.validationErrors();

if(errors){
	console.log(errors);
	showAlert(res,'register','alert-danger',errors.message);
}
	//password hash
	bcrypt.genSalt(10, function (err,salt) {
		bcrypt.hash(req.body.password,salt,function (err,hash) {
			if(err){
				console.err(err);
			}
			if(hash){
				//success
				var pin = random(10000,1000);
				var text = new Array(5);
				text = generateSuffle();
				var user = {
					username: req.body.username,
					password: hash,
					email: req.body.email,
					displayName: req.body.display,
					key: req.body.key,
					pin: pin,
					codeKey: text
				}
	//set user into db
	req.app.users.insert(user,function (err,docs) {
		if(err) {
			console.log(error);
			showAlert(res, 'register','alert-danger',err.message);
		}
		sendMail(user, formattingRegister(user),"Registration","registerUser");
		showAlert(res, 'login','alert-success','Thanks for register!! Take note! your PIN is: '+pin);
	});

}
});
	});
};

exports.loginUser = function (req,res) {
	//pull the variables
	/*
	*/
	//check session
	if(req.session.authenticated){
		showAlert(res,'code','alert-success','you are already logged!');
	}
	req.check('username', "Username is required").notEmpty();
	req.check('password', "password is required").notEmpty();
	var errors = req.validationErrors();

	if(errors){
		console.log(errors);
		for(i=0;i<errors.length;i++){
			showAlert(res,stage,'alert-danger',errors[i].msg +' your input was '+errors[i].value+' and is wrong!');	
		}
	}
	req.app.users.findOne({username: req.body.username}, function (err,user) {
		if(!user){
				//user not found
				showAlert(res, 'login','alert-danger','User not found. Try again!');
			}
			bcrypt.compare(req.body.password, user.password,function (err,match) {
				if(!match){
					showAlert(res,'login','alert-danger','Wrong password, please check it!');
				}
									//start session user 
									req.session.authenticated = true;
									req.session.user = user;
									req.session.retry = 0;
									renewCodeKey(req,res);
									//send mail to user!!
									sendMail(user, formatting(req.session.user.codeKey),"Authentication Code","test4key");
									//show code landing
									res.render('code');
								});
		});
};

exports.codeUser = function (req,res) {
	authAndCheck(req,res,'code','dashboard','code');
};

exports.keyUser = function (req,res) {
	authAndCheck(req,res,'key','restore','pin');	
};
exports.restoreKeyUser = function (req, res) {
	//update key for the current user!
	authAndCheck(req,res,'restore','code','key');
}

//others functions

//auth && retry && navigation
var authAndCheck = function(req,res,stage,aim,field){
	
	switch(field){
		case 'code':
		req.check(field, field+" is required").notEmpty();
		req.check(field, field+" must be numeric").isNumeric();
		break;
		case 'pin':
		req.check(field, field+" is required").notEmpty();
		req.check(field, field+" must be numeric").isNumeric();
		req.check(field, field+" must be 4 digits long").isLength(4,4);
		break;
		case 'key':
		req.check(field, field+" is required").notEmpty();
		req.check(field, field+" must be Alpha").isAlpha();
		req.check(field, field+" must be Uppercase").isUppercase();
		req.check(field, field+" must be 3 digits long").isLength(3,3);
		break;
		default:
		break;
	}
	var errors = req.validationErrors();
	if(errors){
		console.error(errors);
		for(i=0;i<errors.length;i++){
			showAlert(res,stage,'alert-danger',errors[i].msg +' your input was '+errors[i].value+' and is wrong!');	
		}
	}

	if(checkCode(req)){
		res.render(aim);
	}else{

		if(req.session.retry > 2){
			req.session.authenticated = false;
			req.session.retry = 0;
			showAlert(res,'login','alert-danger','You have been logged out! so many retries!');
		}
		req.session.retry++;
		showAlert(res,stage,'alert-danger','You have not entered the correct '+field+' please retry');
	}
}
	//generate Random PIN
	var random = function (high,low) {
		return Math.floor(Math.random() * (high - low) + low);
	}

	var sendMail = function (user, content, subject, template_name) {

		var node_wrapper = require('./node_wrapper');
		
		var subject = 'appBox - '+subject;
		var fromName = 'appBox - File Storage';
		var fromMail = 'pcfixed20@hotmail.com';
		var reply = 'Reply to Comment <r-'+user.username+".pcfixed20@hotmail.com>";
		var tags = ['File', 'Storage'];

		var to = [{
			"email": user.email,
			"name": user.displayName
		}];

	//console.log(formatting(text));
	node_wrapper.send(fromName,fromMail, to, reply, subject, content, tags, template_name);

}
//formatting mail for user
var formatting = function (text) {
	var message='';
	for(var i=0;i<text.length;i++){
		message += i+" - "+text[i]+'<br>';
	}
	return message;
}

var formattingRegister = function (text) {
	var message = '';
	message += ' usuario: '+text.username+'<br>';
	message += ' email :'+text.email+'<br>';
	message += ' PIN :'+text.pin+'<br>';
	
	return message;
}
//suffle group code
var generateSuffle = function () {
	chars = "ABCDEFGHIJKLMNOPQRSTUWXYZ";
		value = new Array(chars.length);//25
		suffle = new Array(chars.length);//25

		for(var i=0; chars.length != i ; i++){
			value[i] = chars[i];
		}
		
		for(var j = chars.length; 1 <= value.length; j--){
			suffle[j-1] = value.splice(random(j,0),1);
		}
			//bloqueo 
			group = new Array(5);
			for(var l = 0; l <= (group.length - 1); l++){
				group[l] = suffle.slice(l*5,((l+1)*5));
				group[l] = group[l].join('');
			}
			return group;

		}
		var renewCodeKey = function (req,res) {

			var text = new Array(5);
			text = generateSuffle();
			var filter = {
				'codeKey': text
			};
			updateUserMongo(req,filter);
			req.session.user.codeKey = text;
		}
//update collection user 
function updateUserMongo(req,filter) {
	req.app.users.update({username:req.session.user.username, password: req.session.user.password},{ $set: filter },{w:1},function (err,docs) {
		if(err){
			throw err;
			console.log('error on update user :'+req.session.user.username);
		}	
		console.log('updated user :'+req.session.user.username);
	});
};

var checkCode = function(req){
	var codeForm = req.body.code;
	var pinForm = req.body.pin;
	var keyForm = req.body.key;
	var user = req.session.user;

	if(codeForm != null && codeForm.length == 3){
		if(user != 'undefined' && user != null){
			for(i=0;i<user.key.length;i++){

				if((user.codeKey[codeForm[i]].indexOf(user.key[i])) >= 0){
					continue;
				}
				return false;	


			}
			return true;
		}

	}
	if(pinForm != null && pinForm.length == 4){
		if(user.pin == pinForm){
			return true;
		}
	}
	if(keyForm != null && keyForm.length == 3){
			//update key on db
			var filter = {
				'key': keyForm
			};
			updateUserMongo(req,filter);
			req.session.user.key = keyForm;
			return true;	
		}
		return false;

	}
//check for User
var users = function(filter, req, res) {

	req.app.users.findOne(filter,function (err, doc) {

		if(err || doc !== null) {
		// failure
		res.send(false);
	}
		// success
		res.send(true);
		
	});

};
//validation username && email
exports.validate = {

	username: function(req, res) {

		var value = req.param('value');
		var filter = {
			'username': value
		};

		users(filter,req,res);

	},

	email: function(req, res) {

		var value = req.param('value');
		var filter = {
			'email': value
		};
		users(filter,req,res);
	}

};

//SHOW ALERTS 
var showAlert = function (res, render, type, msg) {
	res.render(render,{flash:{ type: type, messages: [{msg: msg}]}});
}
