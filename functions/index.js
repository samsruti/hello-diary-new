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

const { ApiAiApp } = require('actions-on-google');
const functions = require('firebase-functions');
const { sprintf } = require('sprintf-js');

const strings = require('./strings');
var request = require('request');
var unirest = require('unirest');

process.env.DEBUG = 'actions-on-google:*';

/** API.AI Actions {@link https://api.ai/docs/actions-and-parameters#actions} */
const Actions = {
  UNRECOGNIZED_DEEP_LINK: 'deeplink.unknown',
  ACTION_WELCOME: 'input.welcome',
  DISPLAY_FEATURES_CAROUSEL: 'display.features.carousel',
  FEATURES_ITEM_SELECTED: 'features.item.selected',
  APP_START_YES: 'start.app.yes',
  APP_START_NO: 'start.app.no',
  APP_START_LATER: 'start.app.later',
  AMAZING_THINGS_HAPPENED_TODAY: 'amazing.things.happened',
  WORST_THINGS_HAPPENED_TODAY: 'worst.things.happened',
  IMPROVE_TODAY: 'improve.today',
  TITLE_OF_THE_DAY: 'day.title',
  USER_GRATEFUL: 'user.grateful'

};
/** API.AI Parameters {@link https://api.ai/docs/actions-and-parameters#parameters} */
const Parameters = {
  CATEGORY: 'category'
};
/** API.AI Contexts {@link https://api.ai/docs/contexts} */
const Contexts = {

};
/** API.AI Context Lifespans {@link https://api.ai/docs/contexts#lifespan} */
const Lifespans = {
  DEFAULT: 5,
  END: 0
};

const WriteDiary = {
  SELECTION_KEY: 'WRITE_DIARY',
  SYNONYMS: ['write', 'write down', 'write now', 'create', 'create new memories', 'Create New Memories'],
  TITLE: 'Create New Memories',
  DESCRIPTION: 'You can write your daily entries.',
  IMAGE_URL: 'https://developers.google.com/actions/images/badges' +
  '/XPM_BADGING_GoogleAssistant_VER.png'
};

const ReadDiary = {
  SELECTION_KEY: 'READ_DIARY',
  SYNONYMS: ['read', 'read diary', 'read now', 'recall', 'recall your memories', 'recall memoriess'],
  TITLE: 'Recall Your Memories',
  DESCRIPTION: 'You can read previous entries.',
  IMAGE_URL: 'https://lh3.googleusercontent.com' +
  '/Nu3a6F80WfixUqf_ec_vgXy_c0-0r4VLJRXjVFF_X_CIilEu8B9fT35qyTEj_PEsKw'
};

const SetReminder = {
  SELECTION_KEY: 'SET_REMINDER',
  SYNONYMS: ['set', 'set reminder', 'set reminder now', 'Set Reminder'],
  TITLE: 'Set Reminder',
  DESCRIPTION: 'You can allow me to make reminders from the content you just wrote.',
  IMAGE_URL: 'https://allo.google.com/images/allo-logo.png'
};

/**
 * @template T
 * @param {Array<T>} array The array to get a random value from
 */
const getRandomValue = array => array[Math.floor(Math.random() * array.length)];

/** @param {Array<string>} facts The array of facts to choose a fact from */
const getRandomFact = facts => {
  if (!facts.length) {
    return null;
  }
  const fact = getRandomValue(facts);
  // Delete the fact from the local data since we now already used it
  facts.splice(facts.indexOf(fact), 1);
  return fact;
};

/** @param {Array<string>} messages The messages to concat */
const concat = messages => messages.map(message => message.trim()).join(' ');

// Polyfill Object.values to get the values of the keys of an object
if (!Object.values) {
  Object.values = o => Object.keys(o).map(k => o[k]);
}

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

function sentimentMaxMin (pos, neg, neutral) {
  var max = 0,
    min = 0;
  if (pos > neutral) {
    max = pos;
    min = neutral;
  } else {
    max = neutral;
    min = pos;
  }

  if (neg > max) {
    max = neg;
  } else if (neg < min) {
    min = neg;
  }
  return max;
}

function textSentimentAnalysis (sentimentjson) {
  var neg = sentimentjson.neg;
  var pos = sentimentjson.pos;
  var neutral = sentimentjson.mid;
  var overallSentiment = 0;

  let maxSentiment = sentimentMaxMin(pos, neg, neutral);
  if (maxSentiment === pos) {
    overallSentiment = 1;
  } else if (maxSentiment === neg) {
    overallSentiment = -1;
  } else if (maxSentiment === neutral) {
    overallSentiment = 0;
  }

  return overallSentiment;
}

const welcomeFirstTimeUser = app => {
  if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
    app.ask(app.buildRichResponse()
    .addSimpleResponse('Hello, I am Max Your personal daily diary. This is the first time.')
    );
  } else {
    app.ask('Hello, I am Max Your personal daily diary. This is the first time.');
  }
};

function welcomeNormalUser (app) {
  app.setContext('start_app-followup');
  app.ask(app.buildRichResponse()
    .addSimpleResponse('Hello again, I am Max Your personal daily diary. Welcome back again! Are you ready to start?')
    .addSuggestions(['Yes', 'No', 'Later'])
  );
  // app.askForSignIn();

  // firebase.database().ref('users/test').set({
  //   name: 'samsruti',
  //   location: {
  //     latitude: '14.214',
  //     longitude: '43.214',
  //     city: 'app.getDeviceLocation().city',
  //     address: 'app.getDeviceLocation().address',
  //     zipCode: 'app.getDeviceLocation().zipCode'
  //   }
  // });
}

const startAppYes = app => {
  app.setContext('display-features');

  app.askWithCarousel(app.buildRichResponse()
      .addSimpleResponse('Alright! Here are a few things that I can do for you. What you want me to do?')
      .addSuggestions(
        ['Create', 'Read', 'Reminder']),
      app.buildCarousel()
        // Add the first item to the carousel
        .addItems(app.buildOptionItem(ReadDiary.SELECTION_KEY,
          ReadDiary.SYNONYMS)
          .setTitle(ReadDiary.TITLE)
          .setDescription(ReadDiary.DESCRIPTION)
          .setImage(ReadDiary.IMAGE_URL, 'Read Diary'))
        // Add the second item to the carousel
        .addItems(app.buildOptionItem(WriteDiary.SELECTION_KEY,
          WriteDiary.SYNONYMS)
          .setTitle(WriteDiary.TITLE)
          .setDescription(WriteDiary.DESCRIPTION)
          .setImage(WriteDiary.IMAGE_URL, 'Write Diary')
        )
        // Add third item to the carousel
        .addItems(app.buildOptionItem(SetReminder.SELECTION_KEY,
          SetReminder.SYNONYMS)
          .setTitle(SetReminder.TITLE)
          .setDescription(SetReminder.DESCRIPTION)
          .setImage(SetReminder.IMAGE_URL, 'Set Reminder')
        )
    );
};

const startAppNo = app => {
  app.ask('App will not start');
};

const startAppLater = app => {
  app.ask('App will start later');
};

const itemFeaturesSelected = app => {
  const param = app.getSelectedOption();
  console.log('USER SELECTED: ' + param);
  if (!param) {
    app.ask('You did not select any item from the list or carousel');
  } else if (param === ReadDiary.SELECTION_KEY) {
    app.ask('Read Diary selected');
  } else if (param === WriteDiary.SELECTION_KEY) {
    app.setContext('amazing-things-happened');
    app.ask('So, tell me about the AMAZING_THINGS_HAPPENED_TODAY');
  } else if (param === SetReminder.SELECTION_KEY) {
    app.ask('You selected the set reminder');
  } else {
    app.ask('You selected an unknown item from the list or carousel');
  }
};

const amazingThingsHappenedToday = app => {
  let input = app.getRawInput();
  app.setContext('worst-things-happened');
  app.ask(input + ': Tell me about your worst things.');
};

const worstThingsHappenedToday = app => {
  let input = app.getRawInput();
  app.setContext('improve-today');
  app.ask(input + ': Tell me how you could have improved today?');
};

const howTodayCouldBeImproved = app => {
  let input = app.getRawInput();
  app.setContext('give-title');
  app.ask(input + ': What title you want to give today?');
};

const journalTitle = app => {
  app.setContext('grateful-user');
  let input = app.getRawInput();
  unirest.post('https://text-sentiment.p.mashape.com/analyze')
  .header('X-Mashape-Key', 'uHMpPM4GdimshW0JO07N2Y6IUb4Wp1mYQFujsnceW7QwhcMbpp')
  .header('Content-Type', 'application/x-www-form-urlencoded')
  .header('Accept', 'application/json')
  .send('text=' + input)
  .end(function (result) {
    let listVal = JSON.parse(result.body);
    var overallSentiment = textSentimentAnalysis(listVal);
    let response = 'Title:' + input;
    if (overallSentiment === 0) {
      response = response + 'Neutral statements';
    } else if (overallSentiment === 1) {
      response = response + 'Positive statements';
    } else if (overallSentiment === -1) {
      response = response + 'Negative statements';
    }

    app.ask('Title Sentiment: ' + response + '. What are you grateful for?');
  });
};

const gratefulFor = app => {
  let input = app.getRawInput();
  app.ask(input + ': Tell me how you could have improved today?');
};

/** @type {Map<string, function(ApiAiApp): void>} */
const actionMap = new Map();
actionMap.set(Actions.UNRECOGNIZED_DEEP_LINK, unhandledDeepLinks);

let newUser = false;

if (newUser) {
  actionMap.set(Actions.ACTION_WELCOME, welcomeFirstTimeUser);
  // actionMap.set(ActionsNewUser.REQUEST_NAME_PERMISSION, askPermission);
  // actionMap.set(ActionsNewUser.PERMISSION_GRANTED, permissionGranted);
  // actionMap.set(ActionsNewUser.ASK_PREFERENCE_TIME_TRUE, timePreferenceSet);
  // actionMap.set(ActionsNormalUser.START_APP_YES, startAppYes);
  // actionMap.set(ActionsNormalUser.START_APP_NO, startAppNo);
  // actionMap.set(ActionsNormalUser.START_APP_LATER, startAppLater);
} else {
  actionMap.set(Actions.ACTION_WELCOME, welcomeNormalUser);
  actionMap.set(Actions.FEATURES_ITEM_SELECTED, itemFeaturesSelected);
  actionMap.set(Actions.APP_START_YES, startAppYes);
  actionMap.set(Actions.APP_START_NO, startAppNo);
  actionMap.set(Actions.APP_START_LATER, startAppLater);
  actionMap.set(Actions.AMAZING_THINGS_HAPPENED_TODAY, amazingThingsHappenedToday);
  actionMap.set(Actions.WORST_THINGS_HAPPENED_TODAY, worstThingsHappenedToday);
  actionMap.set(Actions.IMPROVE_TODAY, howTodayCouldBeImproved);
  actionMap.set(Actions.TITLE_OF_THE_DAY, journalTitle);
  actionMap.set(Actions.USER_GRATEFUL, gratefulFor);
}

/**
 * The entry point to handle a http request
 * @param {Request} request An Express like Request object of the HTTP request
 * @param {Response} response An Express like Response object to send back data
 */
const helloDiary = functions.https.onRequest((request, response) => {
  const app = new ApiAiApp({ request, response });
  console.log(`Request headers: ${JSON.stringify(request.headers)}`);
  console.log(`Request body: ${JSON.stringify(request.body)}`);
  app.handleRequest(actionMap);
});

module.exports = {
  helloDiary
};
