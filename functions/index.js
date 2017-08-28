  // Copyright 2016, Hello Diary, Inc.
  // By: Samsruti Dash (sam.sipun@gmail.com)
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
  const emoji = require('./emoji');
  const request = require('request');
  const unirest = require('unirest');

  const firebase = require('firebase-admin');

  firebase.initializeApp(functions.config().firebase);

  const Picasa = require('picasa');
  const picasa = new Picasa();

  process.env.DEBUG = 'actions-on-google:*';
  const firebaseKeys = {
    authKey: 'auth=zkkcbw9Ak3owBXExELNu1poKtuyFEA9OGi95HGCW',
    extensionREST: '.json?'
  };

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
    USER_GRATEFUL: 'user.grateful',
    CREATE_PASSWORD: 'set.password',
    CHECK_PASSWORD: 'check.password',
    TODAY_IMAGES_ITEM_SELECTED: 'images.today',
    USER_WISHES: 'user.wishes',
    ADD_MORE_CONTENT: 'more.content.journal',
    ADD_MORE_CONTENT_YES: 'more.content.journal.yes',
    ADD_MORE_CONTENT_NO: 'more.content.journal.no',
    WEEKLY_CHALLENGE: 'weekly.challenge',
    CONFESSION_CONFIRMATION_YES: 'user.confession.yes',
    CONFESSION_CONFIRMATION_NO: 'user.confession.no',
    READ_ENTRIES: 'read.entries',
    HELP: 'user.help',
    QUIT_ACTION: 'quit.app'
  };
  /** API.AI Parameters {@link https://api.ai/docs/actions-and-parameters#parameters} */
  const Parameters = {
    CATEGORY: 'category',
    AMAZING_MOMENTS: '',
    SAD_MOMENTS: '',
    GRATEFULFOR: '',
    TITLE: '',
    DAILY_IMPROVEMENT: ''
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
    SYNONYMS: ['write', 'write down', 'write now', 'create', 'create memories', 'create new memories', 'Create New Memories'],
    TITLE: 'Create New Memories',
    DESCRIPTION: 'You can write your daily entries.',
    IMAGE_URL: 'https://firebasestorage.googleapis.com/v0/b/hello-diary-app.appspot.com/o/create.png?alt=media&token=ef24e7c1-adf3-4d2e-8cc5-5c7784474f00'
  };

  const ReadDiary = {
    SELECTION_KEY: 'READ_DIARY',
    SYNONYMS: ['read', 'read memories', 'read diary', 'read now', 'recall', 'recall your memories', 'recall memoriess'],
    TITLE: 'Recall Your Memories',
    DESCRIPTION: 'You can read previous entries.',
    IMAGE_URL: 'https://firebasestorage.googleapis.com/v0/b/hello-diary-app.appspot.com/o/reading.png?alt=media&token=678fcd53-0c13-4e78-bf83-30462f5d1200'
  };

  // TODO: Reminder
  // const SetReminder = {
  //   SELECTION_KEY: 'SET_REMINDER',
  //   SYNONYMS: ['set', 'set reminder', 'set reminder now', 'Set Reminder'],
  //   TITLE: 'Set Reminder',
  //   DESCRIPTION: 'You can allow me to make reminders from the content you just wrote.',
  //   IMAGE_URL: 'https://allo.google.com/images/allo-logo.png'
  // };

  const QuotesOfTheDay = {
    SELECTION_KEY: 'QUOTES',
    SYNONYMS: ['quotes', 'famous quotes', 'inpirational quotes', 'quotes of the day'],
    TITLE: 'Inpirational Quotes',
    DESCRIPTION: 'You can get the inpirational and famous quotes along with the author name.',
    IMAGE_URL: 'https://firebasestorage.googleapis.com/v0/b/hello-diary-app.appspot.com/o/creativity.png?alt=media&token=e6793a64-297c-4bb9-b5f4-47c2aa08792c'
  };

  function getTodayDate () {
    var date = new Date();
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);
    var year = date.getUTCFullYear();
    var newdate = year + '-' + month + '-' + day;
    return newdate;
  }

  /**
   * @template T
   * @param {Array<T>} array The array to get a random value from
   */
   const getRandomValue = array => array[Math.floor(Math.random() * array.length)];

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

  function storeInforFirebase (app, referenceNode, input) {
    let accessToken = app.getUser().accessToken;
    console.log('accessToken in ' + referenceNode + ' :' + accessToken);
    var url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken;
    getJSON(url, function (userData) {
      var userid = userData.id;
      var date = getTodayDate();
      var dbRef = firebase.database().ref();
      dbRef.child(referenceNode).child(userid).child(date).set(input);
    });
  }

  // function getImagesDetails (userid, albumId, accessToken) {
  //   console.log(albumId);
  //   var optionsFinal = {
  //     maxResults: 10,
  //     albumId: albumId
  //   };

  //   console.log('Inside the getImage::' + albumId);

  //   picasa.getPhotos(accessToken, optionsFinal, (error, photos) => {
  //         // // console.log(photos);
  //     var imageList = [];
  //     console.log(photos);
  //     let date = new Date();
  //     var dateDetails = new TodayDateDetails(date);
  //     var length = photos.length;
  //     console.log(length);
  //     for (var j = 0; j < length; j++) {
  //       var imageDict = {};
  //       var dateImage = timeconvert(photos[j].timestamp);

  //       if (dateImage === dateDetails.localDate) {
  //         imageDict.id = photos[j].id;
  //         console.log('PHOTOID:' + photos[j].id);
  //         imageDict.url = photos[j].content.src;
  //         imageDict.title = photos[j].title;
  //         console.log(imageDict);
  //         imageList.push(imageDict);
  //       }
  //     }
  //     console.log(imageList);
  //     var todayDate = getTodayDate();
  //     var ref = firebase.database().ref(userid + '/images/' + todayDate + '/');
  //     ref.set(imageList);
  //       // firebase.database().ref('users/' + userid + '/day' + dayCount + '/').set({
  //       //   images: imageList
  //       // });
  //               // process.exit();
  //     console.log('Error picasa getPhotos: ' + error);
  //   });
  // }

  function TodayDateDetails (date) {
    this.localDate = date.toLocaleDateString();
    this.day = date.getUTCDay();
    this.localTime = date.toLocaleTimeString();
    this.ISOString = date.toISOString();
  }

  function timeconvert (timestamp) {
    timestamp = parseInt(timestamp);
    var date = new Date(timestamp);
    return date.toLocaleDateString();
  }

  function getJSON (url, callback) {
    request({
      url: url,
      json: true
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        callback(body);
      }
    });
  }

  // function sentimentMaxMin (pos, neg, neutral) {
  //   var max = 0;
  //   var min = 0;
  //   if (pos > neutral) {
  //     max = pos;
  //     min = neutral;
  //   } else {
  //     max = neutral;
  //     min = pos;
  //   }

  //   if (neg > max) {
  //     max = neg;
  //   } else if (neg < min) {
  //     min = neg;
  //   }
  //   return max;
  // }

  // function textSentimentAnalysis (sentimentjson) {
  //   var neg = sentimentjson.neg;
  //   var pos = sentimentjson.pos;
  //   var neutral = sentimentjson.mid;
  //   var overallSentiment = 0;

  //   let maxSentiment = sentimentMaxMin(pos, neg, neutral);
  //   if (maxSentiment === pos) {
  //     overallSentiment = 1;
  //   } else if (maxSentiment === neg) {
  //     overallSentiment = -1;
  //   } else if (maxSentiment === neutral) {
  //     overallSentiment = 0;
  //   }

  //   return overallSentiment;
  // }
  function writeUserBirthday (accessToken) {
    var birthdayURL = 'https://people.googleapis.com/v1/people/me?personFields=birthdays&access_token=' + accessToken;
    getJSON(birthdayURL, function (value) {
      var birthday = value.birthdays[0].date;
      var id = value.birthdays[0].metadata.source.id;
      console.log('bday:' + birthday + '     and id: ' + id);
      firebase.database().ref('users/' + id + '/profile/birthday').set(birthday);
    });
  }

  function writeTimestamp (accessToken) {
    var url = 'https://www.googleapis.com/plus/v1/people/me?access_token=' + accessToken;
    getJSON(url, function (user) {
      var id = user.id;
      var today = new Date();
      var TodayDetails = TodayDateDetails(today);
      var todayDate = getTodayDate();
      var relationshipStatus = user.relationshipStatus;
      firebase.database().ref('users/' + id + '/profile/' + todayDate + '/dayDetails/').set({
        timestamp: TodayDetails.ISOString
      });
    });
  }

  function writeUserBasicInfo (accessToken) {
    var url = 'https://www.googleapis.com/plus/v1/people/me?access_token=' + accessToken;
    getJSON(url, function (user) {
      var id = user.id;
      var gender = user.gender;
      var name = user.displayName;
      var today = getTodayDate();
      var relationshipStatus = user.relationshipStatus;
      console.log(id + gender + name + relationshipStatus);
      firebase.database().ref('users/' + id + '/profile/').set({
        userid: id,
        name: name,
        gender: gender,
        relationshipStatus: relationshipStatus,
        birthday: '',
        lastSeen: today
      });
    });
  }

  function updateUserPassword (accessToken, password) {
    var url = 'https://www.googleapis.com/plus/v1/people/me?access_token=' + accessToken;
    getJSON(url, function (user) {
      var id = user.id;
      firebase.database().ref('users/' + id + '/profile/password/').set(password);
    });
  }

  function welcomeNormalUser (app) {
    var ref = firebase.database().ref().child('users');
    var refURL = ref + firebaseKeys.extensionREST + firebaseKeys.authKey;
    getJSON(refURL, function (val) {
      if (val != null) {
        app.setContext('start_app-followup');
        let accessToken = app.getUser().accessToken;

        var url = 'https://www.googleapis.com/plus/v1/people/me?access_token=' + accessToken;
        getJSON(url, function (user) {
          var name = user.name.givenName;
          if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
            app.ask(app.buildRichResponse()
              .addSimpleResponse({speech: 'Hi ' + name + '. I am your personal journal assistant. Are you ready to start?',
                displayText: 'Hi ' + name + ' ' + emoji.emoji[5].char + '. I am your personal journal assistant. Are you ready to start? '
              })
              .addSuggestions(['Yes', 'No', 'Later'])
              );
          } else {
            app.ask('Hi ' + name + '. I am your personal journal assistant. Are you ready to start?');
          }
        });
      } else {
        let accessToken = app.getUser().accessToken;
        writeUserBasicInfo(accessToken);
        writeUserBirthday(accessToken);
        url = 'https://www.googleapis.com/plus/v1/people/me?access_token=' + accessToken;
        getJSON(url, function (user) {
          var name = user.name.givenName;
          app.setContext('create-password');

          if (app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)) {
            app.ask(app.buildRichResponse()
              .addSimpleResponse('Hi ' + name + '. I am your personal journal assistant. Before we start, set a pin for this app.')
              .addSuggestions(['my pin would be 1010', 'keep my pin as 1234'])
              );
          } else {
            app.ask('Hi ' + name + '. I am your personal journal assistant. Before we start, say a pin for this app. Try saying, "keep my pin as 1234" or "my pin would be 4545"');
          }
        });
      }
    });
  }

  const createPassword = app => {
    let context = app.getContexts('create-password');
    var response;
    console.log('COnTExt:');
    console.log(context);
    if (context[0].name === 'create_password_dialog_params_password') {
      response = 'For security purpose, please set a pin. Like 1234 or 54223 or anything';
      app.ask(app.buildRichResponse()
        .addSimpleResponse(response)
        );
    } else {
      var password = context[0].parameters.password;
      app.setContext('start_app-followup');
      response = 'Your pin is now ' + password;
      let accessToken = app.getUser().accessToken;
      updateUserPassword(accessToken, password);
      app.ask(app.buildRichResponse()
        .addSimpleResponse(response)
        .addSimpleResponse('Are you ready to open your journal to read or write?')
        .addSuggestions(['Yes', 'No', 'Later'])
        );
    }
  };

  const startAppYes = app => {
    // let accessToken = app.getUser().accessToken;
    // writeUserBasicInfo(accessToken);
    // writeUserBirthday(accessToken);

    app.askWithCarousel(app.buildRichResponse()
      .addSimpleResponse('Alright! Here are a few things that I can do for you.')
      .addSimpleResponse('What you want me to do?')
      .addSuggestions(
        ['Create Memories', 'Read Memories', 'Quotes Of TheDay']),
      app.buildCarousel()
          // Add the first item to the carousel
          .addItems(app.buildOptionItem(WriteDiary.SELECTION_KEY,
            WriteDiary.SYNONYMS)
          .setTitle(WriteDiary.TITLE)
          .setDescription(WriteDiary.DESCRIPTION)
          .setImage(WriteDiary.IMAGE_URL, 'Write Diary')
          )
          // Add the second item to the carousel
          .addItems(app.buildOptionItem(ReadDiary.SELECTION_KEY,
            ReadDiary.SYNONYMS)
          .setTitle(ReadDiary.TITLE)
          .setDescription(ReadDiary.DESCRIPTION)
          .setImage(ReadDiary.IMAGE_URL, 'Read Diary'))
          // // Add third item to the carousel
          // .addItems(app.buildOptionItem(SetReminder.SELECTION_KEY,
          //   SetReminder.SYNONYMS)
          // .setTitle(SetReminder.TITLE)
          // .setDescription(SetReminder.DESCRIPTION)
          // .setImage(SetReminder.IMAGE_URL, 'Set Reminder')
          // )
          .addItems(app.buildOptionItem(QuotesOfTheDay.SELECTION_KEY,
            QuotesOfTheDay.SYNONYMS)
          .setTitle(QuotesOfTheDay.TITLE)
          .setDescription(QuotesOfTheDay.DESCRIPTION)
          .setImage(QuotesOfTheDay.IMAGE_URL, 'Quotes Of The Day'))
          );
  };

  const startAppNo = app => {
    // app.setContext('add-more-content');
    app.ask(app.buildRichResponse()
      .addSimpleResponse('That is totally fine ' + emoji.emoji[5].char + ' Feel free to share whenver you feel like. I will there for you always.')
      .addSimpleResponse('So do yo want to exit this app?')
      .addSuggestions(['Yes', 'No'])
      );
  };

  // const todayImagesSelected = app => {
  //   const param = app.getSelectedOption();
  //   console.log('USER SELECTED: ' + param);
  //   if (!param) {
  //     app.ask('You did not select any item from the list or carousel');
  //   } else if (param === 'FIRST') {
  //     app.ask('First selected.');
  //   } else if (param === 'SECOND') {
  //     app.ask('SECOND selected.');
  //   } else if (param === 'THIRD') {
  //     app.ask('Third selected.');
  //   } else {
  //     app.ask('You selected an unknown item from the list or carousel');
  //   }
  // };

  const startAppLater = app => {
    app.tell(app.buildRichResponse()
      .addSimpleResponse('So you want to start this later? Sure, You can invoke me anytime anywhere')
      .addSimpleResponse('I will there for you always. See you nex time. Bye ' + emoji.emoji[5].char)
      );
  };

  const checkPassword = app => {
    var response;
    const pin = app.getContextArgument('check-password', 'password');
    let accessToken = app.getUser().accessToken;
    var url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken;
    getJSON(url, function (userData) {
      var userid = userData.id;
      var passDBUrl = 'https://hello-diary-app.firebaseio.com/users/' + userid + '/profile/password' + firebaseKeys.extensionREST + firebaseKeys.authKey;
      getJSON(passDBUrl, function (password) {
        console.log('password given: ' + pin.value);
        console.log('password db: ' + parseInt(password));

        if (parseInt(password) == pin.value) {
          app.setContext('read-entries');
          response = 'You can try like "tell me my best memories from last week or tell my best memories worst moments from yesterday';
          app.ask(app.buildRichResponse()
            .addSimpleResponse({speech: 'Your password is correct',
              displayText: 'Your password is correct ' + emoji.emoji[5].char})
            .addSimpleResponse({speech: response,
              displayText: 'You can try these command to refresh your memories.'})
            .addSuggestions(['tell my best memories', 'worst moments from yesterday', 'yesterday memories'])
            );
        } else {
          app.setContext('check-password');
          response = 'You have entered an incorrect pin.';
          app.ask(app.buildRichResponse()
            .addSimpleResponse(response)
            .addSimpleResponse('Please enter your password again.')
            );
        }
      });
      // else {
        //   var passDBUrl = 'https://hello-diary-app.firebaseio.com/users/' + userid + '/profile/password/chancesLeft' + firebaseKeys.extensionREST + firebaseKeys.authKey;
        //   getJSON(passDBUrl, function (chances) {
        //     var chancesLeft = chances;
        //     if (chances == 0) {
        //       response = 'I am sorry. You have tried a lot of times. Please try again later.';
        //       app.tell(app.buildRichResponse()
        //         .addSimpleResponse({speech: response,
        //           displayText: 'See you next time :)'})
        //         );
        //     } else {
        //       app.setContext('check-password');
        //       response = 'You have entered an incorrect password. Please say it again';
        //       app.ask(app.buildRichResponse()
        //         .addSimpleResponse(response)
        //         .addSimpleResponse('You have more ' + chancesLeft + 'chances left.')
        //         );
        //     }
        //     chancesLeft = chancesLeft - 1;
        //     firebase.database().ref().child('users').child(userid).child('profile').child('chancesLeft').set(chancesLeft);
        //   });
        // }
      });
  };

  const itemFeaturesSelected = app => {
    const param = app.getSelectedOption();
    var response;
    console.log('USER SELECTED: ' + param);
    if (!param) {
      app.ask('You did not select any item.');
    } else if (param === ReadDiary.SELECTION_KEY) {
      app.setContext('check-password');
      response = 'Before we proceed, please enter your security pin for verification. Say something like my pin is yourpass';
      app.ask(app.buildRichResponse()
        .addSimpleResponse({speech: response,
          displayText: 'Please enter your pin to proceed.'})
        );

      // app.setContext('read-entries');
      // response = 'You can try like "tell me my best memories from last week" or "tell me the good things i said last week". This would be fun ' + emoji.emoji[5].char;
      // app.ask(app.buildRichResponse()
      //   .addSimpleResponse({speech: response,
      //     displayText: 'You can try these command to recall your memories'})
      //   .addSuggestions(['tell my best memories', 'worst moments'])
      //   );
    } else if (param === WriteDiary.SELECTION_KEY) {
      var todayDate = new Date();
      let accessToken = app.getUser().accessToken;
      writeTimestamp(accessToken);
      var dayCount = todayDate.getDay();
      if (dayCount === 0) {
        response = 'Tell me about what are challenges for the next week?';
        app.setContext('weekly-challenge');
        app.ask(app.buildRichResponse()
          .addSimpleResponse('Let’s start with weekly challenges first')
          .addSimpleResponse(response)
          );
      } else {
        response = getRandomValue(strings.writeContents.amazingThings);
        app.setContext('amazing-things-happened');
        app.ask(app.buildRichResponse()
          .addSimpleResponse({ speech: 'Let’s have a recap of your day',
            displayText: 'Let’s have a recap of your day ' + emoji.emoji[12].char
          })
          .addSimpleResponse(response)
          );
      }
    // } else if (param === SetReminder.SELECTION_KEY) {
    //   app.ask('You selected the set reminder');
  } else if (param === QuotesOfTheDay.SELECTION_KEY) {
      // app.ask('You selected the QuotesOfTheDay');

      unirest.post('https://andruxnet-random-famous-quotes.p.mashape.com/?cat=famous&count=1')
      .header('X-Mashape-Key', 'uHMpPM4GdimshW0JO07N2Y6IUb4Wp1mYQFujsnceW7QwhcMbpp')
      .header('Content-Type', 'application/x-www-form-urlencoded')
      .header('Accept', 'application/json')
      .end(function (result) {
        var data = result.body;
        var quote = data.quote;
        var author = data.author;
        app.ask(app.buildRichResponse()
                // Create a basic card and add it to the rich response

                .addSimpleResponse('"' + quote + '"')
                .addSimpleResponse('By ' + author)
                );
        // console.log(quote+author);
      });
    } else {
      app.ask('You have selected an unknown item from the list or carousel');
    }
  };

  const weeklyChallenge = app => {
    app.setContext('amazing-things-happened');
    const paramObj = app.getContextArgument('weekly-challenge', 'weekChallenge');
    var param = paramObj.value;
    var response = getRandomValue(strings.writeContents.amazingThings);
    storeInforFirebase(app, 'weeklyChallenge', param);
    app.ask(app.buildRichResponse()
      .addSimpleResponse({ speech: 'Let’s have a recap of your day',
        displayText: 'Let’s have a recap of your day ' + emoji.emoji[12].char
      })
      .addSimpleResponse(response)
      );
  };

  // const lessContentPositive = app => {
  //   const param = app.getContextArgument('amazing-things-happened', 'amazingMoments').value;
  // };

  // const lessContentNegative = app => {

  // };

  const amazingThingsHappenedToday = app => {
    let input = app.getRawInput();
    const param = app.getContextArgument('amazing-things-happened', 'amazingMoments').value;
    const response = getRandomValue(strings.writeContents.worstThings);
    // var words = str.match(/\b\w+\b/g)
    // if (words<5) {
    //   app.setContext('less-content-followup');
    //   app.ask(app.buildRichResponse()
    //       .addSimpleResponse("You can share your memories in detailed manner. No issues :)")
    //       .addSimpleResponse("I will listen to those")
    //   );}
    // }
    // else{
      storeInforFirebase(app, 'amazingMoments', param);
      app.setContext('worst-things-happened');
      app.ask(app.buildRichResponse()
        .addSimpleResponse("That's really great " + emoji.emoji[9].char)
        .addSimpleResponse(response)
        );
      // }
    // let accessToken = app.getUser().accessToken;
    // var url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken;
    // getJSON(url, function (userData) {
    //   var str = 'access_token= ' + accessToken;
    //   var userid = userData.id;
    //   const options = {};
    //   picasa.getAlbums(accessToken, options, (error, albums) => {
    //     console.log('Error picasa getAlbums: ' + error);
    //     let date = new Date();
    //     var dateDetails = new TodayDateDetails(date);
    //     for (var i = 0; i < albums.length; i++) {
    //       var d = new Date(albums[i].published);
    //       if (d.toLocaleDateString() === dateDetails.localDate) {
    //         var albumId = albums[i].id;
    //         console.log('Album if date is today:' + albumId);
    //         getImagesDetails(userid, albumId, accessToken);
    //       }
    //     }
    //     var todayDate = getTodayDate();
    //     var imageList = [];
    //     firebase.database().ref('images/' + userid + '/' + todayDate + '/').set(imageList);
    //   // process.exit();
    //   });
    //   setTimeout(function () {
    //     console.log('Images Stored.');
    //   }, 10000);
    // });
  };

  const worstThingsHappenedToday = app => {
    let input = app.getRawInput();
    const response = getRandomValue(strings.writeContents.improvement.question);
    storeInforFirebase(app, 'badThings', input);
    app.setContext('improve-today');
    app.ask(app.buildRichResponse()
      .addSimpleResponse(getRandomValue(strings.writeContents.improvement.responses))
      .addSimpleResponse(response)
      );
  };

  const howTodayCouldBeImproved = app => {
    app.setContext('grateful-user');
    let input = app.getRawInput();
    storeInforFirebase(app, 'changesNeeded', input);
    app.ask(app.buildRichResponse()
      .addSimpleResponse({ speech: getRandomValue(strings.writeContents.gratefulFor.responses),
        displayText: getRandomValue(strings.writeContents.gratefulFor.responses)})
      .addSimpleResponse(getRandomValue(strings.writeContents.gratefulFor.question))

      );
  };

  const gratefulFor = app => {
    app.setContext('give-title');
    let input = app.getRawInput();
    const response = getRandomValue(strings.writeContents.title);
    storeInforFirebase(app, 'gratefulFor', input);
    app.ask(app.buildRichResponse()
      .addSimpleResponse(response)
      );
  };

  const journalTitle = app => {
    let input = app.getRawInput();
    const param = app.getContextArgument('give-title', 'title');
    storeInforFirebase(app, 'titleoftheday', param.value);
    // const responseShowImages = getRandomValue(strings.writeContents.showImages);
    // const response = getRandomValue(strings.writeContents.askToIncludeImages);// TODO: 2 messages responses instead of 1

    // let accessToken = app.getUser().accessToken;
    // var url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken;
    // getJSON(url, function (userData) {
    //   var userid = userData.id;
    //   var ref = firebase.database().ref();
    //   var todayDate = getTodayDate();
    //   var imageRef = ref.child(userid).child('images').child(todayDate);
    //   var imageRefURL = JSON.stringify(imageRef + '.json');
    //   console.log('imageRefURL' + imageRefURL);
    //   getJSON(imageRefURL, function (imageList) {
    //     var length = imageList.length;
    //     console.log('LENGTH:' + length);
    //     var imageListURLs = [];
    //     var imageListTitle = [];
    //     for (var i = 0; i < length; i++) {
    //       imageListURLs.push(imageList[i].url);
    //       imageListTitle.push(imageList[i].title);
    //     }
    //     var response = 'IMAGES display';
    //     console.log(imageListURLs);
    //     console.log(imageListTitle);
    //     if (length > 1) {
    //       app.setContext('images-today');
    //       // app.setContext('add-more-content-followup');
    //       if (length === 2) {
    //         app.askWithCarousel(app.buildRichResponse()
    //           .addSimpleResponse(response)
    //           .addSuggestions(
    //             ['Yes', 'No', 'Later']),
    //           app.buildCarousel()
    //       // Add the first item to the carousel
    //       .addItems(app.buildOptionItem('FIRST',
    //         ['first'])
    //       .setImage(imageListURLs[0], imageListTitle[0]))
    //       // Add the second item to the carousel
    //       .addItems(app.buildOptionItem('SECOND',
    //        ['second'])
    //       .setImage(imageListURLs[1], imageListTitle[1])
    //       )
    //       );
    //       } else if (length === 3) {
    //         app.askWithCarousel(app.buildRichResponse()
    //           .addSimpleResponse(response)
    //           .addSuggestions(
    //             ['Yes', 'No', 'Later']),
    //           app.buildCarousel()
    //       // Add the first item to the carousel
    //       .addItems(app.buildOptionItem('FIRST',
    //         ['first'])
    //       .setImage(imageListURLs[0], imageListTitle[0]))
    //       // Add the second item to the carousel
    //       .addItems(app.buildOptionItem('SECOND',
    //        ['second'])
    //       .setImage(imageListURLs[1], imageListTitle[1])
    //       )
    //       // Add the third item to the carousel
    //       .addItems(app.buildOptionItem('THIRD',
    //         ['third'])
    //       .setImage(imageListURLs[2], imageListTitle[2])
    //       )

    //       );
    //       } else if (length === 4) {
    //         app.askWithCarousel(app.buildRichResponse()
    //           .addSimpleResponse(response)
    //           .addSuggestions(
    //             ['Yes', 'No', 'Later']),
    //           app.buildCarousel()
    //       // Add the first item to the carousel
    //       .addItems(app.buildOptionItem('FIRST',
    //         ['first'])
    //       .setImage(imageListURLs[0], imageListTitle[0]))
    //       // Add the second item to the carousel
    //       .addItems(app.buildOptionItem('SECOND',
    //        ['second'])
    //       .setImage(imageListURLs[1], imageListTitle[1])
    //       )
    //       // Add the third item to the carousel
    //       .addItems(app.buildOptionItem('THIRD',
    //         ['third'])
    //       .setImage(imageListURLs[2], imageListTitle[1])
    //       )
    //       // Add the fourth item to the carousel
    //       .addItems(app.buildOptionItem('FOURTH',
    //         ['fourth'])
    //       .setImage(imageListURLs[3], imageListTitle[1])
    //       )
    //       );
    //       } else if (length === 5) {
    //         app.askWithCarousel(app.buildRichResponse()
    //           .addSimpleResponse(response)
    //           .addSuggestions(
    //             ['Yes', 'No', 'Later']),
    //           app.buildCarousel()
    //       // Add the first item to the carousel
    //       .addItems(app.buildOptionItem('FIRST',
    //         ['first'])
    //       .setImage(imageListURLs[0], imageListTitle[0]))
    //       // Add the second item to the carousel
    //       .addItems(app.buildOptionItem('SECOND',
    //        ['second'])
    //       .setImage(imageListURLs[1], imageListTitle[1])
    //       )
    //       // Add the third item to the carousel
    //       .addItems(app.buildOptionItem('THIRD',
    //         ['third'])
    //       .setImage(imageListURLs[2], imageListTitle[2])
    //       )
    //       // Add the fourth item to the carousel
    //       .addItems(app.buildOptionItem('FOURTH',
    //         ['fourth'])
    //       .setImage(imageListURLs[3], imageListTitle[3])
    //       )
    //       // Add the fifth item to the carousel
    //       .addItems(app.buildOptionItem('FIFTH',
    //         ['fifth'])
    //       .setImage(imageListURLs[4], imageListTitle[4])
    //       )
    //       );
    //       }
    //     } else {
          // app.setContext('images-today');
          app.setContext('add-more-content-followup');
          const response = getRandomValue(strings.writeContents.askMoreContent);
          app.ask(app.buildRichResponse()
            .addSimpleResponse({ speech: 'I loved the title ',
              displayText: 'I loved the title ' + emoji.emoji[13].char
            })
            .addSimpleResponse(response)
            .addSuggestions(['Yes', 'No'])
            );
    //     }
    //   });

    // //   }, function (errorObject) {
    // //     console.log('The read failed: ' + errorObject.code);
    // //   });
    // });
  };

  const addMoreContentYes = app => {
    const moreContent = getRandomValue(strings.writeContents.moreContent);
    app.setContext('add-more-content');

    app.ask(app.buildRichResponse()
      .addSimpleResponse(moreContent)
      );
  };

  const addMoreContentNo = app => {
    app.tell(app.buildRichResponse()
      .addSimpleResponse('I hope you learned something interesting!')
      .addSimpleResponse('Bye' + emoji.emoji[5].char + ' See you tomorrow. Take care.')
      );
  };

  // function sentimentAnalysis (input) {
  //   unirest.post('https://text-sentiment.p.mashape.com/analyze')
  //   .header('X-Mashape-Key', 'uHMpPM4GdimshW0JO07N2Y6IUb4Wp1mYQFujsnceW7QwhcMbpp')
  //   .header('Content-Type', 'application/x-www-form-urlencoded')
  //   .header('Accept', 'application/json')
  //   .send('text=' + input)
  //   .end(function (result) {
  //     let listVal = JSON.parse(result.body);
  //     var overallSentiment = textSentimentAnalysis(listVal);
  //     let response = 'Title:' + input;
  //     if (overallSentiment === 0) {
  //       response = response + 'Neutral statements';
  //     } else if (overallSentiment === 1) {
  //       response = response + 'Positive statements';
  //     } else if (overallSentiment === -1) {
  //       response = response + 'Negative statements';
  //     }
  //   });
  // }

  const addMoreContent = app => {
    const param = app.getContextArgument('add-more-content', 'moreContent');
    storeInforFirebase(app, 'moreContent', param.value);
    app.tell(app.buildRichResponse()
      .addSimpleResponse('Thank you for your kind replies.')
      .addSimpleResponse('I hope to see you again at the same time and same place. Till then, Bye ' + emoji.emoji[5].char)
      .addSuggestions(['See ya', 'Recall Memories', 'Read Quote of the Day', 'Bye'])
      );
  };

  const readEntries = app => {
    const journalType = app.getContextArgument('read-entries', 'journalType');
    const journalDate = app.getContextArgument('read-entries', 'journalDate');
    let contexts = app.getContexts('read-entries');
    console.log('Context: ' + JSON.stringify(contexts));
    if (contexts[0].name === 'read_entries_dialog_params_journaldate' || contexts[0].parameters.journalDate === '') {
      app.ask(app.buildRichResponse()
        .addSimpleResponse({speech: 'To which date you want to go?',
          displayText: 'To which date you want to go?'})
        .addSuggestions(
          ['yesterday', 'day before yesterday', 'last week', 'last date i wrote journal'])
        );
    } else if (contexts[0].parameters.journalType === '') {
      app.ask(app.buildRichResponse()
        .addSimpleResponse({speech: 'For which entries you want me to recall? Like happy moments \
          or sad moments or about your gratefulness or your confessions.',
          displayText: 'For which entries you want me to recall?'})
        .addSuggestions(
          ['happy moments', 'sad moments', 'gratefulness', 'improvement', 'confessions', 'title'])
        );
    } else {
      let accessToken = app.getUser().accessToken;
      var url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken;
      getJSON(url, function (userData) {
        var userid = userData.id;
        var referenceNode = journalType.value;
        var date = journalDate.value.date;
        console.log('date in recall:' + date);
        console.log('referenceNode: ' + referenceNode);
        var db = firebase.database().ref();        
        var responseRef = db.child(referenceNode).child(userid).child(date);
        response.catch(error => {
          console.log('an error happenned')

        });
        var responseUrl = responseRef + firebaseKeys.extensionREST + firebaseKeys.authKey;
        console.log('URL:');
        console.log(responseUrl);
        getJSON(responseUrl, function (response) {
          console.log('response:' + response);
          app.ask(app.buildRichResponse()
            .addSimpleResponse("Here's what I found")
            .addSimpleResponse(response)
            .addSuggestions(
              ['Try More ', 'Tell me again', 'Tell about last week'])
            );
        });
      });
    }
  };

  /** @type {Map<string, function(ApiAiApp): void>} */
  const actionMap = new Map();
  actionMap.set(Actions.UNRECOGNIZED_DEEP_LINK, unhandledDeepLinks);

  actionMap.set(Actions.ACTION_WELCOME, welcomeNormalUser);
  actionMap.set(Actions.CREATE_PASSWORD, createPassword);
  actionMap.set(Actions.CHECK_PASSWORD, checkPassword);
  actionMap.set(Actions.FEATURES_ITEM_SELECTED, itemFeaturesSelected);
  actionMap.set(Actions.APP_START_YES, startAppYes);
  actionMap.set(Actions.HELP, startAppYes);
  actionMap.set(Actions.APP_START_NO, startAppNo);
  actionMap.set(Actions.APP_START_LATER, startAppLater);
  actionMap.set(Actions.WEEKLY_CHALLENGE, weeklyChallenge);
  actionMap.set(Actions.AMAZING_THINGS_HAPPENED_TODAY, amazingThingsHappenedToday);
  actionMap.set(Actions.WORST_THINGS_HAPPENED_TODAY, worstThingsHappenedToday);
  actionMap.set(Actions.IMPROVE_TODAY, howTodayCouldBeImproved);
  actionMap.set(Actions.USER_GRATEFUL, gratefulFor);
  actionMap.set(Actions.TITLE_OF_THE_DAY, journalTitle);
      // actionMap.set(Actions.TODAY_IMAGES_ITEM_SELECTED, todayImagesSelected);
      actionMap.set(Actions.READ_ENTRIES, readEntries);
      actionMap.set(Actions.ADD_MORE_CONTENT_YES, addMoreContentYes);
      actionMap.set(Actions.ADD_MORE_CONTENT_NO, addMoreContentNo);
      actionMap.set(Actions.ADD_MORE_CONTENT, addMoreContent);

  // actionMap.set("actions.intent.SIGN_IN",signInApp);

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
