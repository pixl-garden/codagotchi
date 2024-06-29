import { db } from './firebaseConfig.js';

const createUserProfile = async (githubUserId, githubUsername, tokenTime) => {
    const userRef = db.ref(`users/${githubUserId}`);
    try {
        await userRef.set({
            public: {
                uid: githubUserId.toString(), // Matches the GitHub user ID
                username: githubUsername,
                profile: {
                    photoURL: `https://avatars.githubusercontent.com/u/${githubUserId}?v=4`, // Corrected template string usage
                    createdAt: new Date().toISOString(), // Corrected Date to ISO string
                    lastLoginAt: tokenTime,
                    level: 1,
                    experience: 0,
                },
                friends: {},
                owned: {
                    // Default inventory placeholders can be further defined as needed
                    inventory: {},
                },
            },
            private: {
                inbox: {},
                friendRequests: {},
            }
        });

        // Create or update username to userId mapping
        const usernameRef = db.ref(`userIdMappings/${githubUsername}`); // Potentially adjusted to use username as key
        await usernameRef.set({ userId: githubUserId });

        console.log('User profile created successfully');
        return { success: true, message: "User profile created successfully" };
    } catch (error) {
        console.error('Failed to create user profile', error);
        return { success: false, message: 'Failed to create user profile', error: error };
    }
};

export { createUserProfile };
