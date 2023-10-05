/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SidebarProvider = void 0;
const vscode = __webpack_require__(1);
const getNonce_1 = __webpack_require__(3);
const fs = __webpack_require__(4);
const path = __webpack_require__(5);
class SidebarProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this._onDidViewReady = new vscode.EventEmitter();
        this.onDidViewReady = this._onDidViewReady.event;
        this.webviewImageUris = {}; // Store the image URIs
    }
    getImageUris() {
        var _a;
        const imageDir = path.join(this._extensionUri.fsPath, 'images');
        const imageNames = fs.readdirSync(imageDir);
        const uris = {};
        for (const imageName of imageNames) {
            const uri = vscode.Uri.file(path.join(imageDir, imageName));
            uris[imageName] = uri;
        }
        // Convert the URIs using webview.asWebviewUri
        for (const key in uris) {
            this.webviewImageUris[key] = ((_a = this._view) === null || _a === void 0 ? void 0 : _a.webview.asWebviewUri(uris[key]).toString()) || "";
        }
        return uris;
    }
    resolveWebviewView(webviewView) {
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
        webviewView.webview.onDidReceiveMessage((data) => __awaiter(this, void 0, void 0, function* () {
            switch (data.type) {
                case "webview-ready": {
                    // Convert the URIs using webview.asWebviewUri
                    const imageUris = this.getImageUris();
                    const webviewImageUris = {};
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
                case "click": {
                    const x = data.x;
                    const y = data.y;
                    // Now you have the click coordinates
                    console.log(`WebView click coordinates: ${x},${y}`);
                    break;
                }
            }
        }));
    }
    revive(panel) {
        this._view = panel;
    }
    _getHtmlForWebview(webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "codagotchi.css"));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "out/compiled", "sidebar.js"));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "out/compiled", "sidebar.css"));
        // Use a nonce to only allow a specific script to be run.
        const nonce = (0, getNonce_1.getNonce)();
        return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="img-src vscode-webview-resource: https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
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

          window.addEventListener('click', (event) => {
            const x = event.clientX;
            const y = event.clientY;

            // Send a message to the extension with the click coordinates
            tsvscode.postMessage({
              type: 'click',
              x: x,
              y: y
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
exports.SidebarProvider = SidebarProvider;


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getNonce = void 0;
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
exports.getNonce = getNonce;


/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 5 */
/***/ ((module) => {

module.exports = require("path");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
const vscode = __webpack_require__(1);
const SidebarProvider_1 = __webpack_require__(2);
function activate(context) {
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("codagotchiView", sidebarProvider));
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map