const { getNonce } = require('./getNonce.testfile.js');

// GETNONCE TESTS
describe('getNonce', () => {
    it('should return a string', () => {
        expect(typeof getNonce()).toBe('string');
    });

    it('should return a string of length 32', () => {
        expect(getNonce()).toHaveLength(32);
    });

    it('should return a string containing only valid characters', () => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const nonce = getNonce();

        // Check each character in the nonce
        for (const char of nonce) {
            expect(possible.includes(char)).toBe(true);
        }
    });

    it('should likely return different values on subsequent calls (not guaranteed)', () => {
        const nonce1 = getNonce();
        const nonce2 = getNonce();
        const nonce3 = getNonce();

        // Not a guaranteed test due to the nature of randomness, but likely.
        expect(nonce1).not.toBe(nonce2);
        expect(nonce2).not.toBe(nonce3);
        expect(nonce1).not.toBe(nonce3);
    });
});
