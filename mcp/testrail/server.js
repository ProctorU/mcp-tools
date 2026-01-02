// ─────────────────────────────────────────────────────────────────────────────
// TestRail MCP Server
// Integrates with TestRail to push test cases from the staging directory
// ─────────────────────────────────────────────────────────────────────────────

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const fs = require("fs");
const path = require("path");

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
     TESTRAIL_URL,
     TESTRAIL_USER,
     TESTRAIL_EMAIL,
     TESTRAIL_API_KEY,
     TESTRAIL_SECTION_ID
} = process.env;
const TESTRAIL_USERNAME = TESTRAIL_USER || TESTRAIL_EMAIL;

/**
 * Converts test type names to TestRail's numeric type IDs.
 * Returns Functional (2) as the default if no match is found.
 */
function getTypeId(testType) {
    const typeMap = {
        'Acceptance': 1,
        'Functional': 2,
        'Smoke': 3,
        'Regression': 4,
        'Security': 5,
        'Usability': 6,
        'Performance': 7,
        'Compatibility': 8,
        'Integration': 9,
        'Exploratory': 10,
        'Other': 12
    };
    return typeMap[testType] || 2;
}

/**
 * Formats test steps for TestRail's text field.
 * Preserves existing line breaks or trims whitespace for single-line input.
 */
function formatStepsAsText(testStepsString) {
    if (testStepsString.includes('\r\n') || testStepsString.includes('\n')) {
        return testStepsString;
    }
    return testStepsString.trim();
}

/**
 * Pushes an array of test cases to a TestRail section.
 * Each test case is created via the TestRail API with proper field mapping.
 */
async function pushTestRailCases(sectionId, cases) {
    if (!TESTRAIL_URL) {
        throw new Error("TESTRAIL_URL is not set in environment variables");
    }
    if (!TESTRAIL_USERNAME) {
        throw new Error("TESTRAIL_USER or TESTRAIL_EMAIL is not set in environment variables");
    }
    if (!TESTRAIL_API_KEY) {
        throw new Error("TESTRAIL_API_KEY is not set in environment variables");
    }
    const { default: fetch } = await import("node-fetch");
    const base = TESTRAIL_URL.replace(/\/$/, "");
    const auth = "Basic " + Buffer.from(`${TESTRAIL_USERNAME}:${TESTRAIL_API_KEY}`).toString("base64");
    const results = [];
    for(const tc of cases){
        // Construct the API payload with TestRail field names
        const payload = {
            title: tc.title,
            type_id: getTypeId(tc.test_type),
            priority_id: tc.priority_id || 2,
            refs: tc.serial_no ? `AUTO-${tc.serial_no}` : null,
            custom_preconds: tc.preconditions || "",
            custom_steps: formatStepsAsText(tc.testing_steps),
            custom_expected: tc.expected_result || "",
        };
 
        console.error(`\nCreating test case: ${tc.title}`);
        console.error(`Type: ${tc.test_type} (ID: ${payload.type_id})`);
        console.error(`Steps length: ${payload.custom_steps.length} characters`);
        const response = await fetch(`${base}/index.php?/api/v2/add_case/${sectionId}`, {
            method: "POST",
            headers: {
                "Authorization": auth,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to create test case "${tc.title}":`, errorText);
            results.push({ error: errorText, title: tc.title });
        } else {
            const data = await response.json();
            console.error(` Successfully created test case: C${data.id}`);
            results.push(data);
        }
    }
    return results;
}
const server = new Server({
    name: "testrail-mcp",
    version: "1.3.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "pushTestRail",
            description: "Push test cases into TestRail",
            inputSchema: {
                type: "object",
                properties: {
                    sectionId: {
                        type: "string",
                        description: "The TestRail section ID to push test cases to. If not provided, uses TESTRAIL_SECTION_ID from environment."
                    }
                }
            }
        }
    ]
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = request.params.name;
    const args = request.params.arguments || {};
    if(tool === "pushTestRail"){
        const sectionId = args.sectionId || TESTRAIL_SECTION_ID;
        if(!sectionId){
            return {
                content: [
                    {
                        type: "text",
                        text: "TestRail section ID is not set. Please provide sectionId or set TESTRAIL_SECTION_ID in .env"
                    }
                ]
            };
        }
        const file = path.join(process.cwd(), 'staging', 'test_cases.json');
        if(!fs.existsSync(file)){
            return {
                content: [
                    {
                        type: "text",
                        text: ` Test cases file not found at: ${file}\n\nPlease ensure test_cases.json exists in the staging directory.`
                    }
                ]
            };
        }
        try {
            const testCases = JSON.parse(fs.readFileSync(file, 'utf8'));
            console.error(`\n${'='.repeat(60)}`);
            console.error(`Found ${testCases.length} test case(s) to push to TestRail`);
            console.error(`Section ID: ${sectionId}`);
            console.error(`${'='.repeat(60)}`);
            const results = await pushTestRailCases(sectionId, testCases);
            const successCount = results.filter(r => !r.error).length;
            const failCount = results.filter(r => r.error).length;
            const successCases = results.filter(r => !r.error && r.id);
            const caseLinks = successCases.map(c => `C${c.id}`).join(', ');
            return {
                content: [
                    {
                        type: "text",
                        text: ` TestRail Push Complete!
 
Summary:
   • Successfully created: ${successCount} test case(s)
   • Failed: ${failCount} test case(s)
   • Section ID: ${sectionId}
${successCount > 0 ? ` Created Cases: ${caseLinks}` : ''}
 
${failCount > 0 ? '  Check console logs for error details.' : ''}`
                    }
                ]
            };
        } catch (error) {
            console.error(" Error details:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: ` Error pushing test cases to TestRail:\n\n${error.message}\n\nCheck console logs for more details.`
                    }
                ]
            };
        }
    }
    throw new Error(`Unknown tool: ${tool}`);
});

// Initialize and start the MCP server on stdio
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(" TestRail MCP server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});