// Copyright 2016, FitManBot Inc.
// Samsruti Dash: sam.sipun@gmail.com
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Copyright 2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const {
	ApiAiApp
} = require('actions-on-google');
const functions = require('firebase-functions');
const {
	sprintf
} = require('sprintf-js');

const firebase = require('firebase-admin');
firebase.initializeApp(functions.config().firebase);

const allUsers = firebase.database().ref('/users');

const strings = require('./strings');

process.env.DEBUG = 'actions-on-google:*';

function encodeAsFirebaseKey (string) {
  return string.replace(/%/g, '%25')
  .replace(/\./g, '%2E')
  .replace(/#/g, '%23')
  .replace(/\$/g, '%24')
  .replace(/\//g, '%2F')
  .replace(/\[/g, '%5B')
  .replace(/\]/g, '%5D');
}

/** API.AI Actions {@link https://api.ai/docs/actions-and-parameters#actions} */
const ActionsNewUser = {
  ACTION_WELCOME: 'input.welcome',
  UNRECOGNIZED_DEEP_LINK: 'deeplink.unknown',
  PERMISSION_GRANTED: 'permission.granted',
  REQUEST_NAME_PERMISSION: 'request.permission',
  ASK_PREFERENCE_TIME_TRUE: 'ask-time-preferences.confirmed'
};

const ActionsNormalUser = {
  START_APP_YES: 'start_app.yes',
  START_APP_YES_FEATURE_SELECT: 'feature.option.select',
  START_APP_NO: 'start_app.no',
  START_APP_LATER: 'start_app.later'

};
/** API.AI Parameters {@link https://api.ai/docs/actions-and-parameters#parameters} */
const Parameters = {
 // CATEGORY: 'category'
};

const WriteDiary = {
  WRITE_DIARY: 'WRITE_DIARY',
  SYNONYMS: ['write', 'write down', 'write now', 'create', 'create new memories','Create New Memories'],
  TITLE: 'Create New Memories',
  DESCRIPTION: 'You can write your daily entries.',
  IMAGE_URL: 'http://example.com/image.jpg'
};

const ReadDiary = {
  READ_DIARY: 'READ_DIARY',
  SYNONYMS: ['read', 'read diary', 'read now', 'recall', 'recall your memories'],
  TITLE: 'Recall Your Memories',
  DESCRIPTION: 'You can read previous entries.',
  IMAGE_URL: 'http://example.com/image.jpg'
};

const SetReminder = {
  SET_REMINDER: 'SET_REMINDER',
  SYNONYMS: ['set', 'set reminder', 'set reminder now'],
  TITLE: 'Set Reminder',
  DESCRIPTION: 'You can allow me to make reminders from the content you just wrote.',
  IMAGE_URL: 'http://example.com/image.jpg'
};
/** API.AI Contexts {@link https://api.ai/docs/contexts} */
const Contexts = {};
/** API.AI Context Lifespans {@link https://api.ai/docs/contexts#lifespan} */
const Lifespans = {
  DEFAULT: 5,
  END: 0
};

/**
 * Greet the user and direct them to next turn
 * @param {ApiAiApp} app ApiAiApp instance
 * @return {void}
 */
 const unhandledDeepLinks = app => {
 	/** @type {string} */
 	const rawInput = app.getRawInput();
 	const response = sprintf(strings.general.unhandled, rawInput);
 	/** @type {boolean} */
 	const screenOutput = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT);
 	if (!screenOutput) {
 		return app.ask(response, strings.general.noInputs);
 	}
 	const suggestions = Object.values(strings.categories).map(category => category.suggestion);
 	const richResponse = app.buildRichResponse()
 	.addSimpleResponse(response)
 	.addSuggestions(suggestions);

 	app.ask(richResponse, strings.general.noInputs);
 };

 function writeNewUser (userId, fullName, email, gender, age) {
 	firebase.database().ref('users/' + userId).set({
 		userid: userId,
 		name: fullName,
 		email: email,
 		gender: gender,
 		age: age
 	});
 }

 function userDetails () {
  var userId = firebase.auth().currentUser.uid;
  return firebase.database().ref('/users/' + userId).once('value').then(function (snapshot) {
    var username = snapshot.val().username;
  });
}

// Greet the user and direct them to next turn
const welcomeFirstTimeUser = app => {
  app.setContext('');
  if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
    const requestPermissionContext = 'request-permission';
    app.setContext(requestPermissionContext);
    app.ask(app.buildRichResponse()
     .addSimpleResponse('Hello, I am Max Your personal daily diary. This is the first time. ')
     );
  } else {
    app.ask('Hello, I am Max Your personal daily diary. This is the first time.');
  }
};

function getUserName () {

}

/*
 * Returns true if given user has invoked this action before.
 *
 * @return {boolean} True if the user is a previous user. False if first time user.
 */
 function isPreviousUser (userId) {
  return new Promise((resolve, reject) => {
    firebase.database().ref('users/' + encodeAsFirebaseKey(userId))
    .once('value', (data) => {
      if (data && data.val()) {
        resolve(true);
      } else {
        firebase.database().ref('users/' + encodeAsFirebaseKey(userId)).set(true);
        resolve(false);
      }
    }, (error) => {
      reject(error);
    });
  });
}

// Calling code (intent handler)

function welcomeNormalUser (app) {
  app.setContext('start_app-followup');
  app.ask('Hello again, I am Max Your personal daily diary. Welcome back again! Are you ready to start?');
  // firebase.database().ref('users/test').set({
  //   name: 'sam',
  //   location: {
  //     latitude: '14.214',
  //     longitude: '43.214',
  //     city: 'app.getDeviceLocation().city',
  //     address: 'app.getDeviceLocation().address',
  //     zipCode: 'app.getDeviceLocation().zipCode'
  //   }
  // });
}

function askPermission (app) {
  let namePermission = app.SupportedPermissions.NAME;
  let precisePermission = app.SupportedPermissions.DEVICE_PRECISE_LOCATION;
  let coarsePermission = app.SupportedPermissions.DEVICE_COARSE_LOCATION;
  app.askForPermissions('To address you by name and know your location',
    [namePermission, precisePermission, coarsePermission]);
}

function permissionGranted (app) {
  if (app.isPermissionGranted()) {
    let displayName = app.getUserName().displayName;
    let userId = '1';
    let latitude = app.getDeviceLocation().coordinates.latitude;
    let longitude = app.getDeviceLocation().coordinates.longitude;
    firebase.database().ref('users/' + userId).set({
      name: displayName,
      location: {
        latitude: latitude,
        longitude: longitude

      }
    });
        //     city: app.getDeviceLocation().city,
        // address:app.getDeviceLocation().address,
        // zipCode:app.getDeviceLocation().zipCode

        app.ask(app.buildRichResponse()
         .addSimpleResponse({speech: 'At which time should you use to write your personal diary?',
           displayText: 'At which time should you use to write your personal diary?'})
         .addSuggestions(['8.00pm', '9.00pm', '10.00pm', '11.00pm', '12 midnight'])
         );
      } else {
        app.tell('Ok Bye');
      }
    }

    function timePreferenceSet (app) {
      var writingTime = app.getContextArgument('ask-time-preferences', 'writingTime');
  // const number = app.getContextArgument(OUT_CONTEXT, NUMBER_ARG);
  app.setContext('start_app-followup');
  console.log('CONSOLE:\r' + writingTime.value);
  app.ask(app.buildRichResponse()
    .addSimpleResponse({speech: 'Now you can be relax. \
      I am there for you to remind your memories and the best moments.',
      displayText: 'I remembered your preference. I can help you to write your personal diary,\
      help you to remind your memories and many more. \n Are you to ready to start?'})
    .addSuggestions(
      ['Yes', 'No', 'Later', 'Bye'])
    );
// .addSuggestionLink('Suggestion Link', 'https://assistant.google.com/')
}

function startApp (app) {
 app.askWithCarousel(app.buildRichResponse()
  .addSimpleResponse('Alright! Here are a few things that I can do for you. What you want me to do?')
  .addSuggestions(
    ['Recall Memories', 'Create Memories', 'Set Reminder']),
    // Build a carousel
    app.buildCarousel()
    // Add the first item to the carousel
    .addItems(app.buildOptionItem(ReadDiary.READ_DIARY,
      ReadDiary.SYNONYMS)
    .setTitle(ReadDiary.TITLE)
    .setDescription(ReadDiary.DESCRIPTION)
    .setImage(ReadDiary.IMAGE_URL,ReadDiary.TITLE))
    // Add the second item to the carousel
    .addItems(app.buildOptionItem(WriteDiary.WRITE_DIARY,
      WriteDiary.SYNONYMS)
    .setTitle(WriteDiary.TITLE)
    .setDescription(WriteDiary.DESCRIPTION)
    .setImage(WriteDiary.IMAGE_URL,WriteDiary.TITLE))
    // Add third item to the carousel
    .addItems(app.buildOptionItem(SetReminder.SET_REMINDER,
      SetReminder.SYNONYMS)
    .setTitle(SetReminder.TITLE)
    .setDescription(SetReminder.DESCRIPTION)
    .setImage(SetReminder.IMAGE_URL,SetReminder.TITLE))
    );  
}

function itemSelectedStartApp (app) {
  const param = app.getSelectedOption();
  console.log('USER SELECTED: ' + param);
  if (!param) {
    app.ask('You did not select any item from the list or carousel');
  } else if (param === ReadDiary.READ_DIARY) {
    app.ask('Read Diary Selected');
  } else if (param === WriteDiary.WRITE_DIARY) {
    app.ask('Write Diary Selected');
  } else if (param === SetReminder.SET_REMINDER) {
    app.ask('Set Reminder selected');
  } else {
    app.ask('You selected an unknown item from the list or carousel');
  }
}

/** @type {Map<string, function(ApiAiApp): void>} */
const actionMap = new Map();
actionMap.set(ActionsNewUser.UNRECOGNIZED_DEEP_LINK, unhandledDeepLinks);
let newUser = false;

if (newUser) {
  actionMap.set(ActionsNewUser.ACTION_WELCOME, welcomeFirstTimeUser);
  actionMap.set(ActionsNewUser.REQUEST_NAME_PERMISSION, askPermission);
  actionMap.set(ActionsNewUser.PERMISSION_GRANTED, permissionGranted);
  actionMap.set(ActionsNewUser.ASK_PREFERENCE_TIME_TRUE, timePreferenceSet);
  actionMap.set(ActionsNormalUser.START_APP_YES, startApp);

  	// actionMap.set(ActionsNewUser.ASK_TO_START_DIARY_NOW, askToStartDiaryNow); // are you gonna write today? or we can start from tomorrow
  	// startDiary(app);
  } else {
    actionMap.set(ActionsNewUser.ACTION_WELCOME, welcomeNormalUser);
	// startDiary(app);
  actionMap.set(ActionsNormalUser.START_APP_YES, startApp);
  actionMap.set(ActionsNormalUser.START_APP_YES_FEATURE_SELECT, itemSelectedStartApp);
}

/**
 * The entry point to handle a http request
 * @param {Request} request An Express like Request object of the HTTP request
 * @param {Response} response An Express like Response object to send back data
 */
 const helloDiary = functions.https.onRequest((request, response) => {
 	const app = new ApiAiApp({
 		request,
 		response
 	});
 	console.log(`Request headers: ${JSON.stringify(request.headers)}`);
 	console.log(`Request body: ${JSON.stringify(request.body)}`);
 	app.handleRequest(actionMap);
 });

 module.exports = {
 	helloDiary
 };
