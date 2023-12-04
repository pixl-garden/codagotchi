# Deliverable 6: Implementation 2

_Group 7: Codagotchi_

_Date and location: November 19th, 2023_

_Group Members: Ben Griepp, Noah Gooby, Monique Parrish, Payton Watts, Forrest Hartley, Kyle Bambling_

## 1. Introduction

The problem of irregular coding practice and lack of motivation to write code impacts a wide range of programmers, from brand-new learners to experienced developers, resulting in skill stagnation and reduced productivity. This lack of consistency hinders skill development, wastes time, and can impact software quality, incurring additional costs and missed opportunities for career growth.

For VSCode users seeking consistent coding practice and skill improvement, Codagotchi is a free VSCode extension that gamifies learning and development, incentivizing regular coding to keep a virtual pet alive and happy. Unlike traditional learning methods, our product transforms coding into an engaging and interactive experience, fostering skill growth through motivation and rewards. Codagotchi empowers programmers to maintain consistent engagement in learning and skill development by offering fun experiences like pet customization and interaction, and even the ability to interact with your friends on Github. 

By transforming coding into an enjoyable experience where a virtual pet thrives through regular code-writing, Codagotchi offers a compelling incentive for programmers to stay motivated and active.

Codagotchi is currently in the early stages of development (as of 11 / 2023). We plan to have a fully functional release available on the VSCode Extension Store by February of 2024.

Github Repo: [https://github.com/pixl-garden/codagotchi](https://github.com/pixl-garden/codagotchi) 

## 2. Implemented Requirements

Ideas:



1. As a user of Codagotchi, I would like to be able to customize my pet with various items (especially hats) to make the pet feel unique and personalized.
2. As a professional programmer, I would not like the game to be able to read or store my actual code to track progress, so that my and my company’s privacy can be maintained.
3. As a user of Codagotchi, I would like the UI to be minimal and not cluttered with buttons so that it does not become distracting.
4. As a Codagotchi user, I would like to be able to interact with my pet by having them react when I click on them.

### Requirement: As a Codagotchi user, I would like to be able to interact with my pet by having them react when I click on them.

Issue: [https://github.com/pixl-garden/codagotchi/issues/99](https://github.com/pixl-garden/codagotchi/issues/99) 

Pull request: [https://github.com/pixl-garden/codagotchi/pull/94](https://github.com/pixl-garden/codagotchi/pull/94) 

Implemented by: Ben Griepp, Forrest Hartley

Approved by: Noah Gooby

Print screen (Difficult to screenshot, but the pearguin waddles on click! Can be seen in demo) : 

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/93d0c850-4567-4861-99e2-3c8ef186b282)

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/7773332b-51b8-4c02-9920-2cf71fd3a154)


### Requirement: As a user of Codagotchi, I would like the UI to be minimal and not cluttered with buttons so that it does not become distracting.

Issue: [https://github.com/pixl-garden/codagotchi/issues/98](https://github.com/pixl-garden/codagotchi/issues/98) 

Pull request: [https://github.com/pixl-garden/codagotchi/pull/95](https://github.com/pixl-garden/codagotchi/pull/95) 

Implemented by: Noah Gooby

Approved by: Payton Watts, Ben Griepp

Print screen (No more HTML buttons, everything is made using sprites):

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/da16ca0a-ea0d-4c09-b824-855c4b9b7d43)

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/869cde8e-ea56-41de-9ade-52ab9e4fd66c)

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/0c7dff94-3a22-4169-b455-f649dcdb40d6)


### Requirement: As a user of Codagotchi, I would like to be able to customize my pet with various items (especially hats) to make the pet feel unique and personalized. 

Issue: [https://github.com/pixl-garden/codagotchi/issues/96](https://github.com/pixl-garden/codagotchi/issues/96)

Pull request: [https://github.com/pixl-garden/codagotchi/pull/102](https://github.com/pixl-garden/codagotchi/pull/102)

[https://github.com/pixl-garden/codagotchi/pull/101](https://github.com/pixl-garden/codagotchi/pull/101)

Implemented by: Ben Griepp, Forrest Hartley

Approved by: Noah Gooby

Print Screen:

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/08fad89e-989f-42c9-803f-2baffd4f29e3)

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/40b60216-1abb-48a4-aa95-51b93234302d)

### Requirement: As a professional programmer, I would not like the game to be able to read or store my actual code to track progress, so that my and my company’s privacy can be maintained. We intend tracking time between saves to be the max extent of our recording user data. The date will be used for QoL elements and play into our system to reward the user with points for code.

Issue: [https://github.com/pixl-garden/codagotchi/issues/97](https://github.com/pixl-garden/codagotchi/issues/97)

Pull request: [https://github.com/pixl-garden/codagotchi/pull/100](https://github.com/pixl-garden/codagotchi/pull/100)

Implemented by: Payton Watts

Approved by: Ben Griepp

Print screen: 

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/de3c7d5c-f375-4dbb-b253-6a505aa82206)

## 3. Tests

### Test framework: **Jest** ([https://jestjs.io/](https://jestjs.io/)) 

We chose to use Jest as our testing framework because of it’s balance between feature diversity and simplicity. Jest automatically supports modern JS features and requires little to no configuration / setup; combined with it’s simple syntax, it is very user-friendly. It can also be ran as a node package, and as we are using Node.js as our runtime environment, it seemed like an easy choice to choose Jest.

### GitHub Test folder: [https://github.com/pixl-garden/codagotchi/tree/main/tests](https://github.com/pixl-garden/codagotchi/tree/main/tests) 

### Test Case Example:



* Description: Matrix Functions Tests
    * Should properly generate colored rectangular matrices
    * Should be able to overlay matrices on top of eachother
    * Should be able to concatenate matrices of same height
    * Should be able to replace color of matrix cells
* Class: [https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/MatrixFunctions.svelte](https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/MatrixFunctions.svelte) 
* Test: [https://github.com/pixl-garden/codagotchi/blob/main/tests/MatrixFunction.test.js](https://github.com/pixl-garden/codagotchi/blob/main/tests/MatrixFunction.test.js) 
* Print Screen:

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/d024d5ea-34a4-4e67-aab5-34632c1f167a)

## 4. Demo

[https://www.youtube.com/watch?v=XRiHarD9dDY](https://www.youtube.com/watch?v=XRiHarD9dDY)

## 5. Code Quality

Our team implemented a series of measures to ensure our codebase remains clean, consistent and error-free. To do this, we incorporated a variety of tools and practices as part of our development process.

We adopted “Prettier” ([https://prettier.io/](https://prettier.io/)) as our code formatting tool. Prettier automatically formats our code according to our specifications whenever we run it. This helps to maintain consistent style and formatting principles across our entire codebase. We agreed on using a standard 4-space indentation rule, which Prettier can automatically implement.

Alongside Prettier, we integrated ESLint into our codebase. This allows us to detect potential errors or warnings pertaining to syntax. This has enabled us to minimize errors and improve our consistency regarding naming conventions and other style standards.

Lastly, we implemented a strict code-review policy that requires all submitted code to be reviewed by another team member before being merged into our main branch. This peer review process not only catches potential errors but also increases knowledge-sharing and collaboration within our team.

## 6. Lessons Learned

In our second release, we have learned that features like customization and progress tracking can be far more complex to implement than initially expected. This realization has taught us the importance of allocating more time for development and reassessing our project timelines to accommodate these intricate tasks.

We also have realized that the implementation of Jest has been invaluable. Automated testing has allowed us to maintain a high standard of code quality and enables us to catch errors early. Similarly, the use of Prettier has taught us the importance of consistent code styling, and how it improves our collaborative experience.

Based on these learned lessons, for future development, we plan to set aside more time for the implementation of complex features, further integrate automated testing, and continue to strictly enforce code styling guidelines. Additionally, we plan to improve collaboration when it comes to designing new sprites.
