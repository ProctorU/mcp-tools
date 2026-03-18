const tools = [
    {
        name: 'fetchTicketBundle',
        description: 'Fetch Jira ticket with linked issues, attachments, and Confluence pages (with full text content, including archived pages)',
        inputSchema: {
            type: 'object',
            properties: {
                ticket: {
                    type: 'string',
                    description: 'The ID of the Jira ticket to fetch (e.g., PROJ-123)'
                }
            },
            required: ['ticket']
        }
    },
    {
        name: 'postTestCasesToJira',
        description: 'Post test cases from the working or archived test_cases.json as comments to a Jira ticket',
        inputSchema: {
            type: 'object',
            properties: {
                ticket: {
                    type: 'string',
                    description: 'The Jira ticket ID to post comments to (e.g., PROJ-123)'
                }
            },
            required: ['ticket']
        }
    },
    {
        name: 'createSubtasks',
        description: "Create subtasks on a Jira ticket from the working or archived subtasks.json file. Each subtask should have: summary (required), description (optional). Priority uses Jira's project default.",
        inputSchema: {
            type: 'object',
            properties: {
                ticket: {
                    type: 'string',
                    description: 'The parent Jira ticket ID to create subtasks on (e.g., PROJ-123)'
                }
            },
            required: ['ticket']
        }
    },
    {
        name: 'createIssues',
        description: 'Create hierarchy-aware Jira issues from the working or archived issues.json. Supports epic child issues plus nested subtasks under created children.',
        inputSchema: {
            type: 'object',
            properties: {
                ticket: {
                    type: 'string',
                    description: 'The parent Jira ticket ID that anchors the issue plan (e.g., PROJ-123)'
                },
                filename: {
                    type: 'string',
                    description: 'Optional issue plan filename. Defaults to issues.json in staging/, then falls back to the archived ticket folder.'
                }
            },
            required: ['ticket']
        }
    },
    {
        name: 'createHierarchy',
        description: 'Smart hierarchy creation entry point. Reads the working or archived issues.json and creates epic children and nested subtasks according to the plan and parent issue type.',
        inputSchema: {
            type: 'object',
            properties: {
                ticket: {
                    type: 'string',
                    description: 'The parent Jira ticket ID that anchors the hierarchy (e.g., PROJ-123)'
                },
                filename: {
                    type: 'string',
                    description: 'Optional issue plan filename. Defaults to issues.json in staging/, then falls back to the archived ticket folder.'
                }
            },
            required: ['ticket']
        }
    },
    {
        name: 'appendRovoIssueToBundle',
        description: 'Fetch a related Jira ticket with comments, attachments, and linked Confluence pages, then append it to staging/aggregated.json under rovoContext if it is not already present.',
        inputSchema: {
            type: 'object',
            properties: {
                ticket: {
                    type: 'string',
                    description: 'The related Jira ticket ID to enrich and append (e.g., PROJ-456)'
                }
            },
            required: ['ticket']
        }
    },
    {
        name: 'appendRovoPageToBundle',
        description: 'Fetch a related Confluence page by page ID or URL and append it to staging/aggregated.json under rovoContext if it is not already present.',
        inputSchema: {
            type: 'object',
            properties: {
                pageId: {
                    type: 'string',
                    description: 'Confluence page ID'
                },
                pageUrl: {
                    type: 'string',
                    description: 'Confluence page URL'
                }
            }
        }
    }
];

module.exports = { tools };
