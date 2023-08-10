import * as vscode from "vscode";
import { getNonce } from "./getNonce";
import * as fs from 'fs';
import * as path from 'path';

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  private _onDidViewReady: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidViewReady: vscode.Event<void> = this._onDidViewReady.event;

  private webviewImageUris: { [key: string]: string } = {}; // Store the image URIs

  constructor(private readonly _extensionUri: vscode.Uri) {}

  private getImageUris(): { [key: string]: vscode.Uri } {
    const imageDir = path.join(this._extensionUri.fsPath, 'images');
    const imageNames = fs.readdirSync(imageDir);
    const uris: { [key: string]: vscode.Uri } = {};

    for (const imageName of imageNames) {
      const uri = vscode.Uri.file(path.join(imageDir, imageName));
      uris[imageName] = uri;
    }

    // Convert the URIs using webview.asWebviewUri
    for (const key in uris) {
      this.webviewImageUris[key] = this._view?.webview.asWebviewUri(uris[key]).toString() || "";
    }

    return uris;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
  
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
  
      // Include the folder containing the images in localResourceRoots
      localResourceRoots: [
      vscode.Uri.file(path.join(this._extensionUri.fsPath, 'images')),
      vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media')),
      vscode.Uri.file(path.join(this._extensionUri.fsPath, 'out', 'compiled'))
      ],
    };
  
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  
    this._onDidViewReady.fire();

  
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "webview-ready": {
          // Convert the URIs using webview.asWebviewUri
          const imageUris = this.getImageUris();
          const webviewImageUris: { [key: string]: string } = {};
          for (const key in imageUris) {
              webviewImageUris[key] = webviewView.webview.asWebviewUri(imageUris[key]).toString();
          }

          // Send the converted URIs to the webview
          webviewView.webview.postMessage({
              type: 'image-uris',
              uris: webviewImageUris,
          });
          break;
      }
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
        case "resize": {
          const width = data.width;
          const height = data.height;
  
          // Now you have the dimensions of the WebView
          console.log(`WebView dimensions: ${width}x${height}`);
          break;
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "codagotchi.css")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out/compiled", "sidebar.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out/compiled", "sidebar.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="img-src vscode-webview-resource: https: data:; style-src 'unsafe-inline' ${
          webview.cspSource
        }; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}">
          const tsvscode = acquireVsCodeApi();
          window.addEventListener('resize', () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Send a message to the extension
            tsvscode.postMessage({
              type: 'resize',
              width: width,
              height: height
            });
          });

          // Trigger the resize event manually to get initial dimensions
          window.dispatchEvent(new Event('resize'));
        </script>
      </head>
      <body>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>`;
  }
}