const path = require('path');
const fs = require('fs');
const JiraApi = require('jira-client');

// Locate the .env configuration file by searching up the directory tree
let envPath = null;
let currentDir = __dirname;
const maxDepth = 5;
let depth = 0;

while (depth < maxDepth && !envPath) {
    const testPath = path.join(currentDir, '.env');
    if (fs.existsSync(testPath)) {
        envPath = testPath;
        break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
    depth++;
}

if (envPath) {
    require('dotenv').config({ path: envPath });
} else {
    require('dotenv').config();
}

const {
    Jira_DOMAIN,
    Jira_EMAIL,
    Jira_API_TOKEN
} = process.env;

if (!Jira_DOMAIN || !Jira_EMAIL || !Jira_API_TOKEN) {
    console.error('Jira credentials are not set in the environment variables');
    process.exit(1);
}

const cleanDomain = Jira_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');

const jira = new JiraApi({
    protocol: 'https',
    host: cleanDomain,
    username: Jira_EMAIL,
    password: Jira_API_TOKEN,
    apiVersion: '3'
});

// Log messages to stderr to keep stdout clean for MCP protocol communication
function log(message, ...args) {
    console.error(message, ...args);
}

function normalizeTicketKey(ticket) {
    return String(ticket || '').trim().toUpperCase();
}

function getAuthHeader() {
    return 'Basic ' + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString('base64');
}

function getJsonHeaders(extraHeaders = {}) {
    return {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
        ...extraHeaders,
    };
}

function buildJiraUrl(apiPath) {
    return `https://${cleanDomain}${apiPath}`;
}

function buildConfluenceUrl(apiPath) {
    return `https://${cleanDomain}/wiki${apiPath}`;
}

module.exports = {
    jira,
    log,
    cleanDomain,
    Jira_EMAIL,
    Jira_API_TOKEN,
    normalizeTicketKey,
    getAuthHeader,
    getJsonHeaders,
    buildJiraUrl,
    buildConfluenceUrl,
};
