import * as vscode from 'vscode';


const CLIENT_ID = "a253a1599d7b631b091a";
const REDIRECT_URI = encodeURIComponent("https://codagotchi.firebaseapp.com/__/auth/handler");
const REQUESTED_SCOPES = "user,read:user";

const OAuth_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${REQUESTED_SCOPES}`;

export default OAuth_URL;