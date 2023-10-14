# Deliverable 3: Analysis

_Group 7: Codagotchi_

_Date and location: October 15th, 2023_

_Group Members: Ben Griepp, Noah Gooby, Monique Parrish, Payton Watts, Forrest Hartley, Kyle Bambling_

# 1. System Descriptions

The problem of irregular coding practice and lack of motivation to write code impacts a wide range of programmers, from brand-new learners to experienced developers, resulting in skill stagnation and reduced productivity. This lack of consistency hinders skill development, wastes time, and can impact software quality, incurring additional costs and missed opportunities for career growth. For VSCode users seeking consistent coding practice and skill improvement, Codagotchi is a free VSCode extension that gamifies learning and development, incentivizing regular coding to keep a virtual pet alive and happy. Unlike traditional learning methods, our product transforms coding into an engaging and interactive experience, fostering skill growth through motivation and rewards. Codagotchi empowers programmers to maintain consistent engagement in learning and skill development. By transforming coding into an enjoyable experience where a virtual pet thrives through regular code-writing, Codagotchi offers a compelling incentive for programmers to stay motivated and active.

VSCode **users** download Codagotchi from the VSCode Extension Marketplace. The **user** is represented by their _name, streak, _and optional _github info_. The **user** **_interacts_** with the **main** interface, which contains the _grid container_ and _pixel clicker_ attributes. The **Main Class** **_controls_** game_ _logic_,_ screen events, and **_initializes _Objects**, ensuring a seamless user experience. In addition, **main** **_refreshes_** the **Screen Component**, which **_manages_** _sprite reading_,_ sprite dimensions_, and renders _sprites _by **_reading _**the **sprite** _pixel matrix _and _coordinates_. The **sprites** are **_implemented_** by instances of the **Object Class** contains the _states, sprites, location _and_ current frame_ and **_serves as a parent_** for the **Pet**, **UI elements/buttons**, and **items classes **and **_exports _sprites**. The **Pet Class** encapsulates essential pet data like _name, health, weight, height, status and evolution_. the** UI / Button Class** facilitates_ triggers (calling other functions)_, contains given_ content_, and has states for being _clicked_ or _hovered_ over. The **Item Class** has a _name, type and cost_. Together, these classes fulfill the system's requirements, making the Codagotchi extension engaging and interactive. 

# 2. Model

![Screenshot from 2023-10-13 19-37-02](https://github.com/kitgore/codagotchi/assets/116697167/6b22c24f-cf6d-4cd8-81b4-50c4cba63019)

User

* The user class keeps track of the codagotchi’s stats, such as hunger/health, and evolution.
* This is necessary as it ensures that all important pet data that is used to affect the sprites and other classes is easy to access in one place.

Sprite Component

* The Sprite class represents every sprite frame rendered to the screen.
* Sprites have a matrix which stores the pixel information for that sprite as well as x and y coordinates to determine the sprite’s location on the screen.

Screen Component

* The screen class “listens” for clicks on the extension area, grabs the pixel coordinates clicked, compares that with sprite classes coordinates and then applies the necessary reaction to a click.

Object class -> Pet Class / UI / Button Class / Item class

* Object Class
    * The object class has sprites, states, and coordinate location
    * States are an array of sprite to loop through 
    * All objects have a Sprite, State, set of Coordinates, and Frame
* Pet Class
    * The pet class stores all identifying data for each codagotchi pet. This includes the pets name, age, height, weight, status, and evolution.
* UI / Button Class
    * The button class is responsible for all interactions between the user, and the on screen buttons.
    * Has a state for if/if not clicked, has/doesn’t have text, user is/isn’t hovering over button/UI area, and what function to call if clicked.
* Item Class
    * The item class contains all accessories that can be added to any given pet.
    * Items include hats, ties, helmets and more
    * All items have a cost, type, and unique name

Main

* Preloads all spritesheets so they can be referenced
* Controls all game logic
* Handles screen resize
* Handles click events
* Initializes objects and their locations
