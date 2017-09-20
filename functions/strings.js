// Copyright 2017, Google, Inc.
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

/**
 * This file contains the constant strings to be used in the code logic to allow for easy editing
 * Below are eslint comments to enforce JSON like syntax since strings are usually stored in JSON
 * They are written in JavaScript for easier organization of the data and in case functions are used
 */

 /* eslint quote-props: ["error", "always"] */
 /* eslint quotes: ["error", "double"] */

// eslint-disable-next-line quotes
const deepFreeze = require('deep-freeze');

const readContents = {
  "password": {
    "create": ["For security purpose, please set a pin. Like 1234 or 54223 or anything"],
    "incorrect": [],
    "correct": [],
    "tryAgain": [],
    "askForPassword": []
  }
};

const writeContents = {

  "amazingThings": [
    "What are the best things to have happened today?",
    "How about sharing the memories of the day would you like to around carry with you?",
    "You can tell me about what made you happy and proud today.",
    "What are the things about today would you not change ever?",
    "Why don't you start with the activities that you enjoyed the most today?"
  ],

  "worstThings": [
    "What was the worst thing to have happened today?",
    "Something that you wish had not happened"
  ],

  "improvement":
  {
    "question": [
      "If you could, what would you change about today?",
      "How could you have made today a better day?"
    ],
    "responses": [
      "I am sorry about this. But I can make you strong by asking you these questions"
    ]
  },

  "gratefulFor": {
    "question": ["How about telling me something you are thankful about today?",
      "Did you have any personal achievement of the day. Let it be a small thing."],
    "responses": [
      "You have written in amazing way. I Hope you will take care about these from tomorrow."
    ]
  },

  "title": [
    "To summarize all, why don't you set a title for the day? What would it be?",
    "You can give me a title which would you like to use to describe today.",
    "Can you tell me a title which would like to associate today with?"
  ],

  "showImages": [
    "Let’s take a look at how your day went",
    "Here are a few moments from your day."
  ],

  "askToIncludeImages": ["Do you want to add these photos to your journal?"],

  "askMoreContent": [
    "Do you have anything else to add to your journal?",
    "I feel like you got something that you want to your journal? Do you?"
  ],
  "moreContent": [
    "What else was special about today?",
    "Any more memorable or special moments of the day?"
  ],
  "weeklyChallenges": [ "Tell me about what are challenges for the next week?"
  ],
  "recap": ["Let’s have a recap of your day "]
};

const general = {
  "welcome": [
    "I am your personal journal assistant. I can help you with writing entries, recalling your old memories and reminding you with updates."
  ],
  "whatICanDo": ["Alright! Here are a few things that I can do for you."],
  "heardItAll": "Actually it looks like you heard it all. Thanks for listening!",
  /** Used to give responses for no inputs */
  "noInputs": [
    "I didn't hear that.",
    "If you're still there, say that again.",
    "We can stop here. See you soon."
  ],
  "suggestions": {
    /** Google Assistant will respond to more confirmation variants than just these suggestions */
    "confirmation": [
      "Sure",
      "No thanks"
    ]
  },
  "linkOut": "Learn more",
  "unhandled": "Hello, I am your personal journal. I can help you with writing entries, recalling your memories and reminding you with updates."
};

// Use deepFreeze to make the constant objects immutable so they are not unintentionally modified
module.exports = deepFreeze({
  writeContents,
  readContents,
  general
});
