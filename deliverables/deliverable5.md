# Deliverable 5: Design

_Group 7: Codagotchi_

_Date and location: November 12th, 2023_

_Group Members: Ben Griepp, Noah Gooby, Monique Parrish, Payton Watts, Forrest Hartley, Kyle Bambling_

## Description

The problem of irregular coding practice and lack of motivation to write code impacts a wide range of programmers, from brand-new learners to experienced developers, resulting in skill stagnation and reduced productivity. This lack of consistency hinders skill development, wastes time, and can impact software quality, incurring additional costs and missed opportunities for career growth.

For VSCode users seeking consistent coding practice and skill improvement, Codagotchi is a free VSCode extension that gamifies learning and development, incentivizing regular coding to keep a virtual pet alive and happy. Unlike traditional learning methods, our product transforms coding into an engaging and interactive experience, fostering skill growth through motivation and rewards. Codagotchi empowers programmers to maintain consistent engagement in learning and skill development.

By transforming coding into an enjoyable experience where a virtual pet thrives through regular code-writing, Codagotchi offers a compelling incentive for programmers to stay motivated and active.

## Architecture

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/8a394619-0c67-4d9e-b422-5e07282f5279)

We designed the system this way in order to let the backend modify clients’ game states and ensure that all data sent to the backend is processed, cleansed, and authenticated before reaching the database. The UserInteractions and GameLogic packages separate logic into user actions and system reactions for improved clarity and modularity.

## Class Diagram

![Copy of deli5 drawio](https://github.com/pixl-garden/codagotchi/assets/116697167/f8853618-b759-42f9-8544-f5206e5208da)

<br>

## Sequence Diagram

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/e8357203-16a5-42d4-b7f8-42ba063d7e73)

### Use Case Description:

**Actor**: Codagotchi User

**Description:** A codagotchi chooses to authenticate their profile with GitHub.

**Preconditions:**

1. The user has the Codagotchi extension installed in their VSCode editor.
2. The user has a GitHub account.
3. The Codagotchi extension is currently running in VSCode.

**Main Flow:**

1. The user opens the Codagotchi extension within VSCode.
2. The user navigates to the "settings" room within the Codagotchi extension UI.
3. The user clicks on the "GitHub" button to initiate the authentication process.
4. The Codagotchi extension opens a new browser window, directing the user to the GitHub authentication page.
5. The user enters their GitHub credentials and completes the authentication process on the GitHub page.
6. Upon successful authentication, GitHub redirects the user to a specified Firebase Cloud Function with an authentication code as part of the URL.
7. The Firebase Cloud Function processes the authentication code, exchanges it for an access token, and stores the token in the Firebase database node associated with the user's profile.
8. After the Cloud Function successfully stores the access token, the browser window automatically closes.
9. The user is returned to the VSCode window where the Codagotchi extension is running.
10. The Codagotchi extension detects the successful authentication and updates its state to reflect that the user's profile is now authenticated with GitHub.

**Postconditions:**

1. The user's GitHub profile is authenticated within the Codagotchi extension.
2. The Codagotchi extension has stored the necessary credentials to interact with GitHub on the user's behalf.

**Alternate Flows:**

1. Invalid GitHub Credentials: If the user enters invalid GitHub credentials, GitHub displays an error, and the user is given the opportunity to try to authenticate again.
2. Authentication Timeout: If the authentication process times out, the user is prompted to restart the authentication process.
3. Failed Token Storage: If the Firebase Cloud Function fails to store the access token, the user is notified of the error and prompted to authenticate again.

## Design Patterns

### Design Pattern 1- Decorator Pattern (Structural)

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/874fc885-e152-4f36-9f51-46325f13d323)

We chose decorator as the design pattern for these classes as it allows us to specify types of objects with their own parameters whilst still treating them all as GeneratedObjects, allowing easy iteration over all objects in a room for example.

**Classes:**

[https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/ObjectGenerators.svelte](https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/ObjectGenerators.svelte) 

[https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/Object.svelte](https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/Object.svelte) 

### Design Pattern 2 - Observer Pattern (Behavioral)

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/80e06805-185c-4594-a318-1b820fecd663)

Our system follows the Observer pattern by using the “Game” class as a subject, with “main” being its dependent / observer. Game alerts Main of any changes through the update() methods. The Screen class is also updated through the logic of Game by calling the model.getCurrentRoom() method.

**Classes:**

Main: [https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/Main.svelte](https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/Main.svelte) 

Game: [https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/Game.svelte](https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/Game.svelte) 

Screen: [https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/ScreenManager.svelte](https://github.com/pixl-garden/codagotchi/blob/main/webviews/components/ScreenManager.svelte) 

## Design Principles

### **Single Responsibility Principle (SRP)**

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/253e8544-cd16-492a-ae73-52d83dda1483)

Our “Sprite” class follows the Single Responsibility Principle by only having one job, which is to hold a sprite matrix and a coordinate set, which are used to render the sprite in our webview grid container.

### **Open/Closed Principle (OCP)**

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/89036353-ed3d-4d81-bf5d-8b47a11bc760)

Object extends GeneratedObject and other types of objects extend both of these classes, all while not being modifiable themselves. This allows many different subclasses of objects, while all being able to be treated as GeneratedObjects.

### **Liskov Substitution Principle (LSP)**

This can be seen in the above mentioned GeneratedObject and all of its subclasses. All instances of GeneratedObject can be replaced by one of its subclasses.

### **Interface Segregation Principle (ISP)**

![image](https://github.com/pixl-garden/codagotchi/assets/116697167/d23c5cc9-8645-401e-9cf1-c246153114f1)

Our “main” and “screen” classes are an example of how we followed Interface Segregation Principle. Sceen implements the main interface without being burdened by unrelated methods (such as preloadAllSpriteSheets() ). 

### **Dependency Inversion Principle (DIP)**

Our GitHub authentication flow (including token storage in the database) follows Dependency Inversion Principle in that it does not rely on any client code or low-level modules.
