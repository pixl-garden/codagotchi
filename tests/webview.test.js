const vscode = require('vscode');
const { SidebarProvider } = require('../out/SidebarProvider.js');

jest.mock('vscode');

describe('SidebarProvider', () => {
  let sidebarProvider;
  let mockWebviewView;
  let extensionUri;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
  
    // Mock the vscode.Uri.file() to return an object with fsPath
    vscode.Uri.file.mockImplementation((path) => ({
      fsPath: path,
      with: jest.fn().mockReturnThis(),
      toString: jest.fn(() => path),
    }));

    // Set up the common variables before each test
    extensionUri = vscode.Uri.file(__dirname);
    sidebarProvider = new SidebarProvider(extensionUri, {
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      subscriptions: []
    });

    mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: jest.fn(),
        postMessage: jest.fn(),
        asWebviewUri: jest.fn(),
      }
    };

    // Initialize the webview with the mocked object
    sidebarProvider.resolveWebviewView(mockWebviewView);
  });

  test('Webview is initialized correctly', () => {
    // Ensure the HTML for the webview was set
    expect(mockWebviewView.webview.html).toContain('<html');
    // Add any additional initialization assertions here
  });

  test('Webview message handling for getGlobalState', async () => {
    // Mock the global state retrieval
    const globalStateData = { someKey: 'someValue' };
    sidebarProvider.context.globalState.get.mockImplementation(() => globalStateData);

    // Define the message to send
    const messageToSend = { type: 'getGlobalState' };

    // Assume onDidReceiveMessage is the first call
    const onDidReceiveMessage = mockWebviewView.webview.onDidReceiveMessage.mock.calls[0][0];

    // Simulate receiving a message in the webview
    await onDidReceiveMessage(messageToSend);

    // Assert postMessage was called with the correct state
    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith({
      type: 'currentState',
      value: globalStateData,
    });

    // Verify the get method of globalState was called with the correct key
    expect(sidebarProvider.context.globalState.get).toHaveBeenCalledWith('globalInfo', {});
  });

  // Add more tests as necessary
});
