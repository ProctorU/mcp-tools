const { log, normalizeTicketKey } = require('./client');
const {
    fetchTicketBundle,
    appendRovoIssueToBundle,
    appendRovoPageToBundle,
    writeAggregatedBundle,
} = require('./bundle');
const {
    postTestCasesToJira,
    createSubtasksFromFile,
    createIssuesFromPlan,
} = require('./issues');

function textResponse(text, isError = false) {
    return {
        content: [
            {
                type: 'text',
                text
            }
        ],
        ...(isError ? { isError: true } : {})
    };
}

async function handleFetchTicketBundle(args) {
    try {
        const result = await fetchTicketBundle(args);
        writeAggregatedBundle(result);

        const confluenceSummary = result.confluence.map((page) =>
            `  - ${page.title} (${page.textContent.length} chars)${page.isArchived ? ' [ARCHIVED]' : ''}`
        ).join('\n');

        const summary = `Successfully fetched ticket ${args.ticket}

Jira Issue: ${result.root.summary}
Linked Issues: ${result.linked.length}
Attachments: ${result.attachments.length}
Confluence Pages: ${result.confluence.length}${result.metadata.confluenceArchivedCount > 0 ? ` (${result.metadata.confluenceArchivedCount} archived)` : ''}
${result.confluence.length > 0 ? '\nConfluence Pages:\n' + confluenceSummary : ''}

Data saved to: staging/aggregated.json`;

        return textResponse(summary);
    } catch (error) {
        log('[Error]', error);
        return textResponse(`Error: ${error.message}`, true);
    }
}

async function handlePostTestCases(args) {
    try {
        const result = await postTestCasesToJira(args);
        if (result.success) {
            const summary = `Test Cases Posted to ${args.ticket}

✓ Successfully posted ${result.totalTestCases} test cases in ${result.totalBatches} batch(es) (${result.successCount} test cases)
✓ Posted ${result.commentIds.length} comment(s)
Comment IDs: ${result.commentIds.join(', ')}`;
            return textResponse(summary);
        }

        const summary = `Test Cases Posted to ${args.ticket} (Partial Success)

Posted ${result.successCount} of ${result.totalTestCases} test cases in ${result.totalBatches} batch(es)
Failed: ${result.failureCount} test cases
Posted ${result.commentIds.length} comment(s)
Comment IDs: ${result.commentIds.join(', ')}
${result.error ? `\nErrors: ${result.error}` : ''}`;
        return textResponse(summary, result.failureCount === result.totalTestCases);
    } catch (error) {
        log('[Error]', error);
        return textResponse(`Error: ${error.message}`, true);
    }
}

async function handleCreateSubtasks(args) {
    try {
        const result = await createSubtasksFromFile(args);
        if (result.success) {
            const summary = `Subtasks Created on ${args.ticket}

✓ Successfully created ${result.successCount} of ${result.totalSubtasks} subtask(s)

Created Subtasks:
${result.createdKeys.map((key) => `  - ${key}`).join('\n')}`;
            return textResponse(summary);
        }

        const summary = `Subtasks Created on ${args.ticket} (Partial Success)

Created ${result.successCount} of ${result.totalSubtasks} subtask(s)
Failed: ${result.failureCount} subtask(s)

${result.createdKeys.length > 0 ? `Created Subtasks:\n${result.createdKeys.map((key) => `  - ${key}`).join('\n')}` : ''}
${result.error ? `\nErrors: ${result.error}` : ''}`;
        return textResponse(summary, result.failureCount === result.totalSubtasks);
    } catch (error) {
        log('[Error]', error);
        return textResponse(`Error: ${error.message}`, true);
    }
}

async function handleCreateIssues(name, args) {
    try {
        const result = await createIssuesFromPlan(args);
        const createdSummary = result.createdItems.length > 0
            ? result.createdItems.map((item) => {
                const childLines = item.children.map((child) => `    - ${child.key} (${child.issueType})`);
                return `  - ${item.key} (${item.issueType})${childLines.length ? `\n${childLines.join('\n')}` : ''}`;
            }).join('\n')
            : '  - None';

        const summary = `${name === 'createHierarchy' ? 'Hierarchy' : 'Issues'} Created on ${result.parent.key} (${result.parent.issueType})` +
            `${result.success ? '' : ' (Partial Success)'}\n\n` +
            `Mode: ${result.mode}\n` +
            `Created ${result.successCount} of ${result.totalPlanned} planned issue(s)\n` +
            `Failed: ${result.failureCount}\n\n` +
            `Created Issues:\n${createdSummary}` +
            `${result.error ? `\n\nErrors: ${result.error}` : ''}`;

        return textResponse(summary, result.failureCount === result.totalPlanned);
    } catch (error) {
        log('[Error]', error);
        return textResponse(`Error: ${error.message}`, true);
    }
}

async function handleAppendRovoIssue(args) {
    try {
        const result = await appendRovoIssueToBundle(args);
        return {
            content: [
                {
                    type: 'text',
                    text: result.skipped
                        ? `Skipped related Jira ticket ${normalizeTicketKey(args.ticket)}: ${result.reason}`
                        : `Appended related Jira ticket ${result.ticket} to rovoContext\n` +
                          `Comments: ${result.comments}\n` +
                          `Attachments: ${result.attachments}\n` +
                          `Linked Issues: ${result.linkedIssues}\n` +
                          `Linked Confluence Pages Appended: ${result.appendedPages}`
                }
            ],
            isError: result.success === false
        };
    } catch (error) {
        log('[Error]', error);
        return textResponse(`Error: ${error.message}`, true);
    }
}

async function handleAppendRovoPage(args) {
    try {
        const result = await appendRovoPageToBundle(args);
        return {
            content: [
                {
                    type: 'text',
                    text: result.skipped
                        ? `Skipped related Confluence page: ${result.reason}`
                        : `Appended related Confluence page ${result.pageId}: ${result.title}`
                }
            ],
            isError: result.success === false
        };
    } catch (error) {
        log('[Error]', error);
        return textResponse(`Error: ${error.message}`, true);
    }
}

async function handleToolCall(name, args = {}) {
    if (name === 'fetchTicketBundle') {
        return handleFetchTicketBundle(args);
    }

    if (name === 'postTestCasesToJira') {
        return handlePostTestCases(args);
    }

    if (name === 'createSubtasks') {
        return handleCreateSubtasks(args);
    }

    if (name === 'createIssues' || name === 'createHierarchy') {
        return handleCreateIssues(name, args);
    }

    if (name === 'appendRovoIssueToBundle') {
        return handleAppendRovoIssue(args);
    }

    if (name === 'appendRovoPageToBundle') {
        return handleAppendRovoPage(args);
    }

    throw new Error(`Unknown tool: ${name}`);
}

module.exports = { handleToolCall };
