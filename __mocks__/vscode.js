// __mocks__/vscode.js

const EventEmitter = require('events').EventEmitter;

const vscode = {
    Uri: {
        file: jest.fn((path) => ({
            fsPath: path,
            with: jest.fn().mockReturnThis(),
            toString: jest.fn(() => path),
          })),
        parse: jest.fn(),
        joinPath: jest.fn(),
    },

    commands: {
        executeCommand: jest.fn(),
    },

    EventEmitter: class extends EventEmitter {
        constructor() {
            super();
            this.event = this; // Simplified for mocking purposes
        }
        fire(data) {
            }
    },
};

module.exports = vscode;
