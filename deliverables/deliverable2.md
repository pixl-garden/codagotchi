# Requirements

_Group 7: Codagotchi_

_Date and location: Sep 30, 2023_

_Group Members: Ben Griepp, Noah Gooby, Monique Parrish, Payton Watts, Forrest Hartley, Kyle Bambling_

## 1. Positioning

### 1.1 Problem Statement

The problem of irregular coding practice and lack of motivation to write code impacts a wide range of programmers, from brand-new learners to experienced developers, resulting in skill stagnation and reduced productivity. This lack of consistency hinders skill development, wastes time, and can impact software quality, incurring additional costs and missed opportunities for career growth.

### 1.2 Product position statement

For VSCode users seeking consistent coding practice and skill improvement, Codagotchi is a free VSCode extension that gamifies learning and development, incentivizing regular coding to keep a virtual pet alive and happy. Unlike traditional learning methods, our product transforms coding into an engaging and interactive experience, fostering skill growth through motivation and rewards.

### 1.3 Value proposition

Codagotchi, a free VSCode extension, empowers programmers to maintain consistent engagement in learning and skill development. By transforming coding into an enjoyable experience where a virtual pet thrives through regular code-writing, Codagotchi offers a compelling incentive for programmers to stay motivated and active.

### 1.4 Customer segment



1. **VSCode Enthusiasts:** Users who want to enhance their VSCode experience with a unique and motivational extension.
2. **Programming Novices:** Individuals new to coding looking for a fun and engaging way to learn and practice.
3. **Skill-Refining Developers:** Programmers committed to honing their skills and seeking an extra push for consistent coding practice.
4. **Motivation-Seekers:** Those in need of ongoing motivation and rewards to maintain a regular coding routine.
5. **Computer Science Students:** Students pursuing a computer science degree, benefiting from an interactive tool for skill-building alongside their coursework.
6. **Competitive Coding Enthusiasts:** Highly motivated programmers who thrive on competition and seek to challenge their friends and peers on leaderboards to determine coding activity superiority, using Codagotchi as the ultimate gamified coding companion.

## 2. Stakeholders



1. **Users:** The primary users of Codagotchi, including VSCode enthusiasts, beginner programmers, skill-refining developers, motivation-seekers, and computer science students. Their responsibility is to engage with the extension and maintain consistent coding practice.
2. **Development Team:** The developers responsible for designing, coding, and maintaining the Codagotchi extension (Us). Our role is to ensure the product's functionality, performance, and continuous improvement.
3. **Competitive Coders:** Users who actively engage in competitive programming and leaderboards. They play a pivotal role in fostering competition within the Codagotchi community.
4. **Reviewers and Influencers:** Individuals or platforms that review and promote VSCode extensions, potentially influencing Codagotchi's adoption.
5. **VSCode Marketplace:** The platform hosting Codagotchi for distribution. Ensuring compliance with marketplace guidelines and policies is crucial.
6. **Competitors:** Other VSCode extensions or coding platforms offering similar gamified learning experiences / virtual pet extensions. Keeping track of and responding to competitor activity is important.
7. **Detractors or Critics:** Individuals who may have negative feedback or concerns about Codagotchi. Their insights can be valuable for addressing potential issues.

## 3. Functional Requirements

1. Virtual Pet Interaction
2. Coding Activity Tracking
3. Rewards and Points System
4. Leaderboard and Challenges
5. Customization Options
6. (Soft) Coding Reminders / Notifications
7. Progress / Achievement Tracking
8. Offline functionality
9. User profile/settings
10. Online data syncing
11. Online friend interaction

## 4. Non-functional Requirements


1. Performance Efficiency / Response Time:
    1. Objective Goal: The system should load and respond to user interactions within 1 second.
    2. Importance: Quick response times are essential to maintain user engagement and prevent frustration.
2. Scalability:
    1. Objective Goal: The system should handle a 50% increase in concurrent users without performance worsening.
    2. Importance: Scalability ensures that Codagotchi can accommodate growth in user base and activity.
3. Compatibility:
    1. Objective Goal: Ensure compatibility with the latest versions of VSCode and common operating systems (Windows, macOS, Linux).
    2. Importance: Compatibility ensures a broader reach, enabling more users to benefit from Codagotchi.

## 5. Minimum Viable Product

The Minimal Viable Product (MVP) for Codagotchi will focus on delivering core features that align with the initial value proposition. The primary aim is to validate the concept and engagement of the target audience. This involves establishing the following features: Virtual pet interaction, Coding activity tracking,  Rewards / Points system, and Customization options. We will test and validate the MVP by measuring user engagement, collecting user feedback and satisfaction ratings, and measuring user retention.

## 6. Use Cases

### 6.1 Use Case Diagram

![image](https://github.com/kitgore/codagotchi/assets/116697167/2a98f10a-0c09-427b-897c-22df8544ef58)

### 6.2 Use Case Descriptions

**Use Case #1**

**Actor:** New User

**Trigger:** New user launches VSCode and initiates Codagotchi for the first time

**Pre-Conditions:** The Codagotchi extension is installed, the user has never launched it

**Post-Conditions:** The user successfully initiates Codagotchi and has their user information stored in backend

**Success Scenario:**

1. The user launches / initiates Codagotchi extension in VSCode
2. Local extension information is taken, validated, and stored
3. User is redirected to first-time process
4. During this process, user chooses their pet sprite and customizes appearance
5. User is informed about how system works (points)
6. The first-time process concludes

![image](https://github.com/kitgore/codagotchi/assets/116697167/88179221-4dbc-4093-afad-c820707a6143)


**Use Case #2**

**Actor:** Codagotchi user

**Trigger:** The user starts a coding session in VSCode

**Pre-Conditions:** The virtual pet is active in the interface

**Post-Conditions:** Users coding activity is tracked and their pets status is updated; any points are distributed

**Success Scenario:** 

1. User opens VSCode and begins coding session
2. Start time of coding session is recorded
3. As the user codes, session duration is tracked
4. Session end time is recorded
5. Session duration is calculated and user is rewarded with points
6. Virtual pet status is updated

 Interface sketch N/A; this use case has no display output

**Use Case #3**

**Actor:** Codagotchi user

**Trigger:** The user decides to customize their virtual pet

**Pre-Conditions:** Virtual pet is active in interface

**Post-Conditions:** The user’s virtual pet has been customized to their desires. 

**Success Scenario:** 

1. User clicks customization menu 
2. Customization menu opens and allows user to select different appearance options
3. User selects and confirms their choices
4. Virtual pet appearance is updated

![image](https://github.com/kitgore/codagotchi/assets/116697167/cc501b93-10db-4e55-b6ba-e1d825f1750d)


**Use Case #4**

**Actor:** Github User

**Trigger:** User chooses to log in via Github to sync user info across systems

**Pre-Conditions:** User has a pet, User has a Github account

**Post-Conditions:** User’s local data is synced with backend

**Success Scenario:** 

1. User signs into Github for the first time
2. User clicks Github sign in button
3. Opens github authentication page in web browser
4. User gets a confirmation in the extension that they are logged into github

**Alternate Scenario:** 

1. User signs into Github with an existing account on a second IDE
2. User clicks Github sign in button
3. Opens github authentication page in web browser
4. User gets a confirmation in the extension that they are logged into github
5. Extension syncs data to existing backend data

![image](https://github.com/kitgore/codagotchi/assets/116697167/1a3e8285-7c66-40c8-aeec-b9fb00a20c19)


**Use Case #5**

**Actor:** Codagotchi user

**Trigger:** User interacts with friends with the extension

**Pre-Conditions:** User is signed in to github, virtual pet is active in interface

**Post-Conditions:** User has sent / received item / otherwise interacted with GitHub friend

**Success Scenario:** 

1. User clicks on Friends option in settings interface
2. Friends window is opened
3. User selects friend
4. User selects interaction option with friend
5. Confirmation message is shown
6. Friend window closes

![image](https://github.com/kitgore/codagotchi/assets/116697167/6ee62bc5-e65e-4a7a-a411-87e65e5ffabc)


**Use Case #6**

**Actor:** Codagotchi User

**Trigger:** User decides to enable code break reminders

**Pre-Conditions:** User has a virtual pet

**Post-Conditions:** User receives reminders to take a break after coding for a set amount of time

**Success Scenario:** 

1. User clicks to enable code break reminders
2. A code break reminders UI appears
3. User chooses an amount of time to receive reminders after
4. Code break reminder UI closes
5. User receives notifications after coding for chosen amount of time

![image](https://github.com/kitgore/codagotchi/assets/116697167/865a4bd0-eeb7-4e51-bc67-e274a6c37dfe)

## 7. User stories


1. As a user of the Codagotchi extension, I would like the ability to collect multiple creatures, so that I can do even more with Codagotchi as I code.
   Priority Level: Medium
   Est. Hours: 5
2. As a beginner programmer, I want the point system to be fair to less experienced programmers so that I can enjoy the game too.
   Priority Level: High
   Est. Hours: 2
3. As someone who wants to make sure I keep coding regularly, I would like features like competing with friends and multiple pet choices to keep me motivated to keep coding.
   Priority Level: Medium
   Est. Hours: 8
4. As a more experienced programmer, I’d appreciate a leaderboard and some challenges to choose from such that I can compete with friends and other players.
   Priority Level: Low
   Est. Hours: 8
5. As a user of Codagotchi, I would like to be able to buy items for my creature, but also not have the game be too distracting either, so that I can enjoy the game fully.
   Priority Level: Medium
   Est. Hours: 5
6. As a senior CS student, I’d like the game to be competitive, but also having break reminders during long coding sessions so that the game is very supportive of coders.
   Priority Level: Low
   Est. Hours: 1
7. As a graduated CS major, difficulty levels to choose from and giving users suggestions would be good additions to have so that the game stays fresh as you play longer.
   Priority Level: Medium
   Est. Hours: 5
8. As a current CS major, I don’t want the game to have voice lines and intrusive features, so that I can stay focused while I code.
   Priority Level: Medium
   Est. Hours: 1
9. As a new and self-taught programmer, I’d like there to be not just instructions, but a tutorial too, so that I can be sure to know how to play the game.
   Priority Level: High
   Est. Hours: 3
10. As a professional programmer, I would like the game to solely read character count and such, not specific code that it would be saving and analyzing, so that my company’s code stays private.
   Priority Level: High
   Est. Hours: 2
11. As a K-12 coding teacher, I’d like the game to be easy to play, but still fun, so that students of all ages can use it while learning to code.
   Priority Level: High
   Est. Hours: 2
12. As a CS professor tasking my students to practice with the Codagotchi to learn more about a language, I’d like it so that syntactical characters aren’t counted like the rest of code is, so that students are being rewarded for only the actual code.
   Priority Level: High
   Est. Hours: 3

## 8. Issue tracker

Issue tracker is updated at: https://github.com/kitgore/codagotchi/issues

![Screenshot 2023-09-30 at 3 45 56 PM](https://github.com/kitgore/codagotchi/assets/116300933/9e5a1e14-812d-4984-aefa-c237d3b0fd60)
