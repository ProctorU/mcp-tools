const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { log } = require('./client');
const { tools } = require('./tool-definitions');
const { handleToolCall } = require('./tool-handlers');

const server = new Server({
    name: "jira-mcp",
    version: "1.5.0",
}, {
    capabilities: {
        tools: {},
    },
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args);
});
 
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("Jira MCP server v1.5.0 running on stdio");
}
 
main().catch((error) => {
    log("Fatal error in main():", error);
    process.exit(1);
});