# Codagotchi TODO: 

## Economy
- [ ] Mining and fishing activities gives random items for crafting and experience
- [ ] Crafting items are only used for crafting (which is a shop in a way)
- [ ] Main currency is coins, used in gatcha and shop
- [ ] To get coins:
    - [ ] Daily login bonus
    - [ ] Selling extra items in the shop
    - [ ] Leveling up

## Client / Customization:

### Pets have 2 sizes (different accessories fit different pets)
- [ ] 4 Pets on demo release (1/4 done) (LIST HERE LATER:)
 * Pet 0: TODO: 
 * Pet 1: TODO: Pearguin
 * Pet 2: TODO:
 * Pet 3: TODO:
 * Pet 4: TODO:

- [ ] ? Accessories

### Backgrounds (different furniture types)
- [ ] 5 Backgrounds on demo release (1/5 done) (LIST HERE LATER:)
 * Background 0: TODO: Regular house
 * Background 1: TODO: Beach house
 * Background 2: TODO: Space shuttle
 * Background 3: TODO: Kazakhstan style yurt
 * Background 4: TODO: Japanese style house
 * Background 5: TODO: Castle
- [ ] Allow transparency option for not distracting from coding
- [ ] ? Furniture: predefined places where you could put different types of furniture: carpet, bed, desk, etc.

### Gatcha Room 
- [ ] Pachinko- [ ]style game where you can win accessories and backgrounds with currency (cheaper than shop)

### Shop Room
- [ ] Daily update of 1- [ ]3 items for sale that you can buy certinly (what makes it different from gatcha)
- [ ] Allow to buy accessories and backgrounds with currency

### Friends
- [ ] Allow to see friends room, pet, and level by clicking on their name in the friends list

### Progression
- [ ] Working leveling system based on client coding
- [ ] Different age levels for pet (ex.: 0- [ ]1 = egg, 2- [ ]5 = infant, etc.)
- [ ] Rewards
- [ ] Daily login bonus
- [ ] Health bar (if you don't code for a while, pet gets sick)

### Food System
- [ ] Food system for pet (ex.: feeding pet with fish, berries, etc.)
- [ ] If you don't feed your pet, it gets sick

### Cooking System
- [ ] ? Should we do 

### Crafting 
- [ ] Basically another shop, but you can craft items with materials you get from coding
- [ ] Materials can be obtained from shop, or daily login bonus, or activities
- [ ] ex. Buying a beach ball from the shop, you can craft a beach ball with 10 sea shells and 10 sand (or something like that)

## Backend:

### Firebase
- [ ] ITEMS COLLECTION (just ids)
- [ ] But all the textures and models are stored in the client

### Inventory functions
- [ ] Store items in the inventory 

### Pet functions
- [ ] Feeding pet
- [ ] Happiness, Hunger, eepiness system

### Shop Room
- [ ] Set up shop and items on the backend so they are stored somewhere
- [ ] Set up gatcha and items on the backend so they are stored somewhere

### Customization
- [ ] One pet at a time
- [ ] Owned field in protected:
```
{
    "owned": {
        "backgrounds": [0, 1, 2..],
        "accessories": [0, 1, 2..],
        "furniture1": [0, 1, 2..],
        "furniture2": [0, 1, 2..],
    }
}
```
- [ ] Owned field could be binary with a 1 if an item at index is owned or 0 if not
- [ ] ex: 101101 -> [0, 2, 3, 5]

### Bedroom / Furniture
- [x] Tabs:
    - [x] Wallpaper
    - [x] Floor
    - [x] Furniture
    - [x] Wall items
- [ ] Clickable Arrows in furniture menu
- [ ] Transparent Furniture clicking
- [ ] Figure out rug rendering

### Postoffice
- [ ] Postoffice Background/Room
- [ ] Postcard Sending UI
- [ ] Postcard Receiving UI
- [ ] Postcard sending/recieving rewards --> friend levels for different players
- [ ] Postcard saving/discard system

### Progression
- [ ] Storing level, pet status, age, etc. syncing with client
- [ ] XP streak bonuses
- [ ] If the client hasn't logged in for a while, pet gets sick (server side update)

### Bugs
- [X] Stamp Menu missing / stamp loads at wrong height on initial flip

### Optimization
- [X] Convert Sprite Sheets to JSON !!
- [X] Screen Resize Normalization (its a lot better now but should probably go down in res at smaller sizes??)
- [X] Switch to webGL rendering
- [ ] Remove cachemanager.ts

### Ban System
- [ ] Ban system for cheaters by checking if they're sending too many requests

### Friend System 
- [ ] When clicking on friend profile (pet / room / other info) is shown cached, makes individual request
    for their info and updates it once its loaded 


