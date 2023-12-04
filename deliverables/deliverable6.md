# Deliverable 7: Verification and Validation

_Group 7: Codagotchi_

_Date and location: December 3rd, 2023_

_Group Members: Ben Griepp, Noah Gooby, Monique Parrish, Payton Watts, Forrest Hartley, Kyle Bambling_


## Description

The problem of irregular coding practice and lack of motivation to write code impacts a wide range of programmers, from brand-new learners to experienced developers, resulting in skill stagnation and reduced productivity. This lack of consistency hinders skill development, wastes time, and can impact software quality, incurring additional costs and missed opportunities for career growth.

For VSCode users seeking consistent coding practice and skill improvement, Codagotchi is a free VSCode extension that gamifies learning and development, incentivizing regular coding to keep a virtual pet alive and happy. Unlike traditional learning methods, our product transforms coding into an engaging and interactive experience, fostering skill growth through motivation and rewards. Codagotchi empowers programmers to maintain consistent engagement in learning and skill development.

By transforming coding into an enjoyable experience where a virtual pet thrives through regular code-writing, Codagotchi offers a compelling incentive for programmers to stay motivated and active.

## Verification

### Test framework: **Jest** ([https://jestjs.io/](https://jestjs.io/)) 

We chose to use Jest as our testing framework because of it’s balance between feature diversity and simplicity. Jest automatically supports modern JS features and requires little to no configuration / setup; combined with it’s simple syntax, it is very user-friendly. It can also be ran as a node package, and as we are using Node.js as our runtime environment, it seemed like an easy choice to choose Jest.

### GitHub Test Folder: [https://github.com/pixl-garden/codagotchi/tree/main/tests](https://github.com/pixl-garden/codagotchi/tree/main/tests) 

### Test Case Example:



* Link: [https://github.com/pixl-garden/codagotchi/blob/main/tests/ScreenComponent.test.js](https://github.com/pixl-garden/codagotchi/blob/main/tests/ScreenComponent.test.js) 
* Description: generateScreen tests
    * Should place a single sprite correctly on the screen.
    * Should return an empty screen if no sprites are given
    * Should not show a sprite if it is out-of-bounds of the screen
    * Should only show part of the sprite if that part is within bounds

### Print Screen: PASTE IMAGE ONCE ON GITHUB



## Acceptance Test

	### Test Framework: VSCode Mock Object and Jest (https://code.visualstudio.com/api/working-with-extensions/testing-extension) The 

	### GitHub Test Folder: https://github.com/pixl-garden/codagotchi/tree/main/tests 

	### Test Case Example: The test is not a full blackbox test as performing these tests using Selenium or something similar within the VSCode environment is not possible. However we are able to create a mock VSCode object that simulates running the web components in a VSCode Environment. Our first test initializes the webview and ensures that it receives the proper html to display the game. Our second test simulates an asynchronous message exchange between the VSCode API and the webview using ‘await onDidReceiveMessage(messageToSend);’ and ensures that VSCode’s globalState is properly set which is what we use to store local user data between sessions without directly saving files on the user’s system. 
Mock VSCode object implementation: https://github.com/pixl-garden/codagotchi/blob/main/__mocks__/vscode.js
Webview Test:
https://github.com/pixl-garden/codagotchi/blob/main/tests/webview.test.js

	### Print Screen: 


## Validation

### Script:

Tasks given to User:
1. Install Codagotchi 
2. Explore customization room
3. Explore settings room
4. Interact with pet
5. Authenticate via Github

Questions Asked:
1. What was your first impression when you launched the extension?
2. Did everything run smoothly (any lag, hangups?)
3. What were your thoughts on the stylistic choices of the extension?
4. On a scale of 1-10, how intuitive did you find navigation within the extension?
5. Did any features seem confusing or unclear?
6. What feature did you find the most useful or enjoyable?
7. What features do you feel could be improved?
8. On a scale of 1-10, how likely are you to use our extension in its current state?
9. What would increase the likelihood of you using the extension regularly?
10. What is the main thing you liked most about the extension?
11. Please rate / describe your overall experience from 1-10?
12. Would you recommend Codagotchi to a friend?
13. Do you have any other comments or feedback?

Data Collected:
- Natural interaction with extension, any obstacles / points of friction, intuitiveness of navigation / interaction, ease of installation, ease of authentication, general impressions and likelihood to regularly use the extension, what could be improved to increase retention.
	

### Results 1:

* Interviewer: Forrest Hartley
* Interviewee: Ryan Mitchell
* Date: December 1st, 2023
1. “I liked it. It felt a bit minimalistic, but overall it had a nice interface”
2. “I didn’t experience any noticeable lag, but window resizing could have been smoother, it was kind of choppy.”
3. “I liked the stylistic choices, but felt that the theme could have been more consistent
4. “I would give it a 7. It was easy to move around and simple, but sometimes button hovering didn’t seem to work right”
5. “There wasn’t any tutorial, which could have been helpful to understand how you’re supposed to progress.”
6. “The marge Simpson hair. I liked the marge simpson hair”
7. “I’d like to actually be able to make progress with coding”
8. “I would say 1. It’s still half-baked but if the code to gain XP part of the extension gets implemented I’ll bump that number up considerably.”
9. “Like I said previously, I want to be rewarded for coding”
10. “My answer is still the marge Simpson hair”
11. “Overall, it seems like it could be really cool, but in its current state, moving around and authenticating my GitHub account doesn’t quite do it for me. I did like the customization area though, so I’ll say 6.5”
12. “Not in its current state, but if it gets finished, I would say yes”
13. “I like the idea, but I would say that it still needs a bit of work”

	
### Results 2:

* Interviewer: Noah Gooby
* Interviewee: Ethan Gooby
* Date: December 2nd, 2023
1. “I really liked the pixel art aesthetic and the design of the main pet, which is more detailed than I expected.”
2. “The extension window took a few seconds to load, and resizing the window isn’t fluid.”
3. “Like I mentioned, I enjoy the pixel art design and the current pet.”
4. “I would give navigation a 9, I didn’t experience any issues with it.”
5. “I’m unclear on how progression is supposed to work, but it just seems like it isn’t fully implemented yet. I assume the shop page will also be tied into progression and rewards.”
6. “The ability to equip hats is definitely the best feature right now.”
7. “I would rather buy items with points than be able to equip all of them from the start. Progression and more interaction options with the pet also need to be added.”
8. “In it’s current state, I would say 3. I might run it occasionally to check in on it’s development, but I wouldn’t use it regularly until progression or rewards are added. If those are added, along with more pet interactions, I would likely give it an 8.5.”
9. “I would say the same as my last answer.”
10.  “I liked the overall design and the vision for the extension. I think it will be awesome when it is closer to being finished.”
11.  “Probably a 7. It was cool to see how far the extension has come and the direction that it’s taking.”
12.  “Absolutely, once a full release comes out.”
13. “Great work so far, focus on finishing the core mechanics.”

### Results 3:

* Interviewer: Noah Gooby
* Interviewee: Eras Kesee
* Date: December 2nd, 2023
1. “It feels nostalgic, I like it.”
2. “It took longer to load than I expected but no other issues.”
3. “The pixel art is awesome, the pet looks professionally made.”
4. “7, moving between screens was easy but some of the screens felt empty.”
5. “I don’t understand the benefit of authenticating with Github, there should be a message somewhere explaining it.”
6. “Making the little dude waddle when I click on him and giving him Marge Simpson hair.”
7. “Add more animations to the pet and flesh out some of the different menu backgrounds. Also like I said, explain the authentication part.”
8. “Probably a 2 since it doesn’t do a lot right now, but it was cool to see and I would use it later down the line.”
9.  “Getting rewards for coding, getting some benefit from authenticating, a bigger selection of customization items and more activities I can do with the pet.”
10.  “The general design of the pet and the UI, I like how simplistic the UI is.”
11.  “7, it was fun to mess around with but I won’t use it regularly until it is more finished.”
12.  “I would recommend it down the line if some of the things I brought up are added, but not at the moment. I will start building hype for it though”
13. “I want PvP, give me PvP”. 


### Reflections:

We gained a lot of insight into how users react to our extension from these interviews. It seemed that users generally liked the overall design and UI. Everyone also enjoyed the customization options (with Marge Simpson hair particularly being a hit), and users want to see us continue to add more similar options. Users also had an easy time navigating the extension.

We learned that in its current state, users feel slightly confused about the general purpose and features such as GitHub authentication. Ryan brought up a great point about adding a tutorial, which is something we will prioritize. Our progression system is not fully implemented yet, so it is understandable why the users were confused -- we will re-interview them when a fuller release is completed. 

Users also enjoyed the idea of interacting with the virtual pet, but want more interaction options to be added. 

Overall, we learned that our extension has a great foundation currently, and that we have a lot of opportunity for growth. We received great feedback that we can use to increase user engagement. Key areas that we will focus on based on these interviews are performance optimization, a clear implementation of a progression system, and providing users with a tutorial / other explanations regarding certain features. These interviews told us that users are excited about the potential of Codagotchi and are willing to recommend it when it is more developed. This presents a promising future for Codagotchi as long as we incorporate the improvements mentioned by these users.
