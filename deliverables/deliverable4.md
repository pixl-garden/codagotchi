# Deliverable 4: Implementation 1

_Group 7: Codagotchi_

_Date and location: October 29th, 2023_

_Group Members: Ben Griepp, Noah Gooby, Monique Parrish, Payton Watts, Forrest Hartley, Kyle Bambling_

## 1. Introduction

The problem of irregular coding practice and lack of motivation to write code impacts a wide range of programmers, from brand-new learners to experienced developers, resulting in skill stagnation and reduced productivity. This lack of consistency hinders skill development, wastes time, and can impact software quality, incurring additional costs and missed opportunities for career growth.

For VSCode users seeking consistent coding practice and skill improvement, Codagotchi is a free VSCode extension that gamifies learning and development, incentivizing regular coding to keep a virtual pet alive and happy. Unlike traditional learning methods, our product transforms coding into an engaging and interactive experience, fostering skill growth through motivation and rewards. Codagotchi empowers programmers to maintain consistent engagement in learning and skill development by offering fun experiences like pet customization and interaction, and even the ability to interact with your friends on GitHub. 

By transforming coding into an enjoyable experience where a virtual pet thrives through regular code-writing, Codagotchi offers a compelling incentive for programmers to stay motivated and active.

Github Repo: [https://github.com/kitgore/codagotchi](https://github.com/kitgore/codagotchi) 

<br>

## 2. Implemented Requirements

##### Requirement: As a user of the Codagotchi extension, I would like the ability to collect multiple creatures, so that I can do even more with Codagotchi as I code.

Issue: [https://github.com/kitgore/codagotchi/issues/60](https://github.com/kitgore/codagotchi/issues/60) 

Pull request: [https://github.com/kitgore/codagotchi/pull/71](https://github.com/kitgore/codagotchi/pull/71)

Implemented by: Forrest Hartley, Ben Griepp

Approved by: Noah Gooby

Print screen:

![image](https://github.com/kitgore/codagotchi/assets/116697167/6237d0f8-5921-43d7-a15c-ae49acf8b54a)

![image](https://github.com/kitgore/codagotchi/assets/116697167/294623c4-a2a7-4ffb-a7b5-dab29e5aabfb)

<br>

##### Requirement: As a graduated CS major, difficulty levels to choose from and giving users suggestions would be good additions to have so that the game stays fresh as you play longer.

Issue: [https://github.com/kitgore/codagotchi/issues/61](https://github.com/kitgore/codagotchi/issues/61) 

Pull request: [https://github.com/kitgore/codagotchi/pull/65](https://github.com/kitgore/codagotchi/pull/65)

Implemented by: Noah Gooby

Approved by: Ben Griepp

Print screen:

![image](https://github.com/kitgore/codagotchi/assets/116697167/b6487860-ddb0-49d3-9a35-c68b7b5343ce)


<br>

##### Requirement: As a regular coder, I’d like to be able to link my Codagotchi extension with my GitHub account so I can sync my progress across multiple systems.

Issue: [https://github.com/kitgore/codagotchi/issues/58](https://github.com/kitgore/codagotchi/issues/58)

Pull request: [https://github.com/kitgore/codagotchi/pull/53](https://github.com/kitgore/codagotchi/pull/53) 

Implemented by: Noah Gooby & Ben Griepp

Approved by: Ben Griepp & Forrest Hartley

Print screen:

![image](https://github.com/kitgore/codagotchi/assets/116697167/e6b83bb5-baba-49f0-88b2-751a8753dc04)


<br>

#### Requirements: As a beginner programmer, I want the point system to be fair to less experienced programmers so that I can enjoy the game too.

Issue: [https://github.com/kitgore/codagotchi/issues/16](https://github.com/kitgore/codagotchi/issues/16)

Pull request: [https://github.com/kitgore/codagotchi/pull/76](https://github.com/kitgore/codagotchi/pull/76)

Implemented by: Payton Watts, Ben Griepp

Approved by: Ben Griepp

Print screen:

![image](https://github.com/kitgore/codagotchi/assets/72285390/7e96a389-6294-4963-851f-1574dc4cb8e7)
![image](https://github.com/kitgore/codagotchi/assets/72285390/08c07db0-c58c-4dca-8078-f8d781b52869)

<br>

## 3. Tests

#### Test framework: **Jest** ([https://jestjs.io/](https://jestjs.io/)) 

We chose to use Jest as our testing framework because of it’s balance between feature diversity and simplicity. Jest automatically supports modern JS features and requires little to no configuration / setup; combined with it’s simple syntax, it is very user-friendly. It can also be ran as a node package, and as we are using Node.js as our runtime environment, it seemed like an easy choice to choose Jest.

#### GitHub Test folder: [https://github.com/kitgore/codagotchi/tree/main/tests](https://github.com/kitgore/codagotchi/tree/main/tests) 

#### Test case examples:

* Description: generateScreen tests
    * Should place a single sprite correctly on the screen.
    * Should return an empty screen if no sprites are given
    * Should not show a sprite if it is out-of-bounds of the screen
    * Should only show part of the sprite if that part is within bounds
* Class: [https://github.com/kitgore/codagotchi/blob/main/webviews/components/ScreenComponent.svelte](https://github.com/kitgore/codagotchi/blob/main/webviews/components/ScreenComponent.svelte) 
* Test: [https://github.com/kitgore/codagotchi/blob/main/tests/ScreenComponent.test.js](https://github.com/kitgore/codagotchi/blob/main/tests/ScreenComponent.test.js)
* Print screen:

![image](https://github.com/kitgore/codagotchi/assets/116697167/579b3e3b-41b0-46a3-af40-5e93bd635f2b)

* Description: SpriteReader tests
    * Should return empty array and log error if sprite sheet is not preloaded
    * Should return empty array if sprite rows don’t fully fit sprite height
    * Should return empty array if sprite columns don’t fully fit sprite width
* Class: [https://github.com/kitgore/codagotchi/blob/main/webviews/components/SpriteReader.svelte](https://github.com/kitgore/codagotchi/blob/main/webviews/components/SpriteReader.svelte) 
* Test: [https://github.com/kitgore/codagotchi/blob/main/tests/SpriteReader.test.js](https://github.com/kitgore/codagotchi/blob/main/tests/SpriteReader.test.js)
* Print screen:

![image](https://github.com/kitgore/codagotchi/assets/116697167/be9eec26-7ce7-47e7-8636-8c4e8de4e96d)


* Description: getNonce tests
    * Should return a string
    * Should return a string of length 32
    * Should return a string that only has valid characters
    * SHOULD return different values on subsequent calls (this is not guaranteed, but an issue is present if subsequent calls regularly return the same value)
* Class: [https://github.com/kitgore/codagotchi/blob/main/src/getNonce.ts](https://github.com/kitgore/codagotchi/blob/main/src/getNonce.ts) 
* Test: [https://github.com/kitgore/codagotchi/blob/main/tests/getNonce.test.js](https://github.com/kitgore/codagotchi/blob/main/tests/getNonce.test.js)
* Print Screen: 

![image](https://github.com/kitgore/codagotchi/assets/116697167/33a6ae94-a870-4b1c-8dc1-e4f055f1e969)


<br>

## 4. Adopted Technologies


* **Node.js:**
    * We chose Node.js for our primary backend service due to it’s scalability, ease-of-use, and popularity.
* **Svelte:**
    * Svelte was our choice for frontend framework because of its unique approach to user interfaces. It also compiles components at buildtime, leading to faster performance and a cleaner, more intuitive codebase.
* **Firebase Realtime Database:**
    * We opted for Firebase Realtime Database to fulfill our database requirements due to it’s realtime synchronization capabilities. This allows for increased responsiveness in the user experience.
* **Firebase Authentication (Using GitHub as a provider):**
    * Choosing Firebase Authentication was a natural choice given our existing Firebase project. Using GitHub as a provider allows us to implement the GitHub friend interactions specified in our user stories, and pairs will with our application as it is a VSCode extension.
* **NodeFFI:**
    * We chose to utilize NodeFFI due to it’s ability to import C functions into our Node.js environment. This way, we can satisfy the project requirements without worrying about the often-tricky integration of C code into JavaScript environments.
* **Aseprite:**
    * Aseprite was an easy choice in terms of pixel-art / sprite-creation tools. Aseprite is a specialized yet easy-to-use tool that is specifically made for pixel art creation. As such, it vastly speeds up our spritesheet creation time.

<br>

## 5. Learning / Training

Our team has been fortunate in that Ben is quite experienced with TypeScript/JavaScript and has been able to impart that knowledge on the rest of the team. He has held Discord sessions where he goes over both our codebase and basic TypeScript functionalities which has been immensely helpful. 

We have also each done independent research into Svelte. Both the “Ben Awad” and “Fireship” YouTube channels have been especially helpful in this regard. The standard Svelte, TypeScript, and Firebase documentations have also been very helpful in our learning process.

Ben, Noah, Forrest and Payton have all invested time into using Aseprite to create sample sprite sheets in order to familiarize ourselves with the tool and the spritesheet creation process. Forrest in particular has become an Aseprite expert and has developed the majority of our sprites.

Lastly, we have often held in-person coding sessions outside of our normal meeting time 

to help anyone who attends catch up on the codebase, and offers them a chance to contribute in a collaborative setting.

<br>

## 6. Deployment

As our project is a VSCode extension, we are unable to deploy a working prototype (incomplete extensions are not allowed to be uploaded to the VSCode extension store). However, anyone is free to clone our repository and run the extension as a developer in VSCode. After cloning the repository, users should run 

```npm install concurrently```

through the CLI (inside of the repository folder), followed by 

```npm run watch```. 

The extension can then be launched in a developement session through the VSCode GUI or by pressing “F5”. To run our **jest** tests, users can run

```npm test```

through the CLI. 

We discussed the issue of not being able to deploy a prototype with Dr. Palmer, who stated that we can provide proof of our backend system (Firebase in our situation) in place of this. Evidence of the functional connection between our extension and our Firebase Database will be shown in the **“Demo”** section.

<br>

## 7. Licensing

We chose the MIT license for this project because it is one of the most permissive and open licenses available; it allows others to use, modify, and even distribute our software as they wish. This aligns with our focus on collaboration and information-sharing. The MIT license also lacks the restrictiveness and complexity of many other licenses, which encourages greater adoption and use of our software while maintaining our credit as the original creators of Codagotchi.

<br>

## 8. Readme, Contributing, Code of Conduct, and License Files

Readme: [https://github.com/kitgore/codagotchi/blob/main/README.md](https://github.com/kitgore/codagotchi/blob/main/README.md)

Contributing: [https://github.com/kitgore/codagotchi/blob/main/CONTRIBUTING.md](https://github.com/kitgore/codagotchi/blob/main/CONTRIBUTING.md)

Code of Conduct: [https://github.com/kitgore/codagotchi/blob/main/CODE_OF_CONDUCT.md](https://github.com/kitgore/codagotchi/blob/main/CODE_OF_CONDUCT.md)

License: [https://github.com/kitgore/codagotchi/blob/main/LICENSE.md](https://github.com/kitgore/codagotchi/blob/main/LICENSE.md)

<br>

## 9. Look & Feel

While designing the user interface for our project, we were inspired by this project’s namesake: the Tamagotchi. We aimed to capture the general vibe and nostalgia of the original device while adding contemporary elements (such as a diverse color pallete, more detailed sprites, and more detailed animations) to satisfy a modern audience.

We also understand that a responsive, intuitive user experience is paramount. This is why we chose to include clearly marked buttons (such as “Shop” and “Settings”) to simplify the user’s navigation experience without cluttering the extension window. 

Please note: The buttons included in the following screenshots are placeholders -- they will be replaced with proper sprites soon.

Screenshots:

![image](https://github.com/kitgore/codagotchi/assets/116697167/66f23395-afb2-4578-b897-22a118314c4f)

![image](https://github.com/kitgore/codagotchi/assets/116697167/04f9acc6-cef9-436d-bff5-2fc6f650e1c8)

![image](https://github.com/kitgore/codagotchi/assets/116697167/092f1dae-f92b-4468-8183-0861e02dd5ba)

![image](https://github.com/kitgore/codagotchi/assets/116697167/6237d0f8-5921-43d7-a15c-ae49acf8b54a)

<br>

## 10. Lessons Learned

Throughout the development of this initial implementation, our team has gained multiple valuable insights into the complexities of our project and the importance of collaboration. We have learned that collaborating while making contributions to the codebase is extremely important; it is easy to get lost and potentially overwhelmed while navigating the codebase alone (especially for the first time), so working in a team during this process is critical. 

Furthermore, we have come to recognize the value of version control (GitHub in particular). The majority of us have become significantly more comfortable with GitHub throughout this development process and have realized just how critical it is to have this familiarity; in particular, we have realized the importance of regularly pulling to get the most up-to-date code and creating regular, detailed commits. 

Lastly, we have gained respect for the development process for projects of this scale. As our codebase has grown in size and complexity, we have come to appreciate the value of constant and clear communication, as well as the amount of time it can take to implement seemingly trivial requirements. Clear communication and collaboration with the team makes it substantially easier to navigate and contribute to the codebase.

### Our Plans Moving Forwards:

* **Continue to increase communication across the team.** Meaningful code seems to mainly be added when done in collaboration with team members who understand the codebase.
* **Be more stringent / firm on meeting times and attendance.** Less tolerance will be given to members who do not contribute regularly or frequently miss group meetings.
* **Spend more time dividing workload.** We should prioritize improving clarity regarding _who_ should be doing _what_. 
* **Play to the strengths of each member.** Members substantially comfortable with coding should focus on such; as should archivists, quality assurance, designers, etc. In other words, we plan to solidify group roles moving forwards.
* **Narrow our focus.** We have narrowed down our highest-priority requirements as of Report 8 (Week 9). These will be our focus moving forwards.

## 11. Demo

[https://www.youtube.com/watch?v=YgisLCUObSw](https://www.youtube.com/watch?v=YgisLCUObSw)
