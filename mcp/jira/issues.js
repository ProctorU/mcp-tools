const fs = require('fs');

const {
    jira,
    log,
    normalizeTicketKey,
    getJsonHeaders,
    buildJiraUrl,
} = require('./client');
const {
    getStagingPath,
    resolveTicketDocPath,
} = require('../common/paths');

async function postCommentToJira(issueKey, commentText) {
    try {
        log(`[Jira] Posting comment to ${issueKey}...`);
        const url = buildJiraUrl(`/rest/api/3/issue/${issueKey}/comment`);
        const adfComment = {
            body: {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: commentText
                            }
                        ]
                    }
                ]
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: getJsonHeaders(),
            body: JSON.stringify(adfComment)
        });

        if (!res.ok) {
            const errorText = await res.text();
            log(`[Jira] Failed to post comment: ${res.status} - ${errorText}`);
            return { success: false, error: errorText };
        }

        const result = await res.json();
        log(`[Jira] ✓ Comment posted successfully (ID: ${result.id})`);
        return { success: true, commentId: result.id };
    } catch (error) {
        log('[Jira] Error posting comment:', error.message);
        return { success: false, error: error.message };
    }
}

function formatTestCase(tc, index, total) {
    let formatted = `\n${'='.repeat(60)}\n`;
    formatted += `Test Case ${index + 1}/${total}: ${tc.title}\n`;
    formatted += `${'='.repeat(60)}\n\n`;
    formatted += `Serial No: ${tc.serial_no || 'N/A'}\n`;
    formatted += `Type: ${tc.test_type || 'Functional'}\n`;
    const priority = tc.priority_id === 1 ? 'Low' : tc.priority_id === 3 ? 'High' : 'Medium';
    formatted += `Priority: ${priority}\n\n`;
    formatted += `Preconditions:\n${tc.preconditions || 'None'}\n\n`;
    formatted += `Testing Steps:\n${tc.testing_steps || 'N/A'}\n\n`;
    formatted += `Expected Result:\n${tc.expected_result || 'N/A'}\n`;
    return formatted;
}

async function postTestCasesToJira({ ticket }) {
    log(`\n[Jira] Posting test cases to ticket: ${ticket}\n`);
    const file = getStagingPath('test_cases.json');
    const resolvedFile = fs.existsSync(file)
        ? file
        : resolveTicketDocPath(ticket, 'test_cases.json');
    if (!resolvedFile) {
        throw new Error('Test cases file not found at: ' + file);
    }
    const testCases = JSON.parse(fs.readFileSync(resolvedFile, 'utf8'));
    const batchSize = 4;
    const totalBatches = Math.ceil(testCases.length / batchSize);

    log(`[Jira] Found ${testCases.length} test cases to post in batches of ${batchSize} (${totalBatches} batch(es))\n`);

    let successCount = 0;
    let failureCount = 0;
    const commentIds = [];
    const errors = [];

    const summaryComment = `Test Cases Summary\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Total Test Cases: ${testCases.length}\n` +
        `Posted in ${totalBatches} batch(es) of ${batchSize} test cases each\n\n` +
        `Test cases will be posted in separate comments below.`;

    const summaryResult = await postCommentToJira(ticket, summaryComment);
    if (summaryResult.success) {
        commentIds.push(summaryResult.commentId);
        log(`[Jira] Summary comment posted (ID: ${summaryResult.commentId})\n`);
    } else {
        log(`[Jira] Failed to post summary comment: ${summaryResult.error}\n`);
        errors.push(`Summary comment: ${summaryResult.error}`);
    }

    for (let i = 0; i < testCases.length; i += batchSize) {
        const batch = testCases.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        let batchComment = `Test Cases Batch ${batchNumber}/${totalBatches}\n`;
        batchComment += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        batchComment += `Test Cases ${i + 1} to ${Math.min(i + batchSize, testCases.length)} of ${testCases.length}\n\n`;

        batch.forEach((tc, idx) => {
            batchComment += formatTestCase(tc, i + idx + 1, testCases.length);
            if (idx < batch.length - 1) {
                batchComment += '\n';
            }
        });

        log(`[Jira] Posting batch ${batchNumber}/${totalBatches} (${batch.length} test cases)...`);
        const result = await postCommentToJira(ticket, batchComment.trim());

        if (result.success) {
            successCount += batch.length;
            commentIds.push(result.commentId);
            log(`[Jira] ✓ Batch ${batchNumber} posted successfully (ID: ${result.commentId})\n`);
        } else {
            failureCount += batch.length;
            const errorMsg = `Batch ${batchNumber}: ${result.error}`;
            errors.push(errorMsg);
            log(`[Jira] ✗ Batch ${batchNumber} failed: ${result.error}\n`);
        }

        if (i + batchSize < testCases.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    const allSuccess = failureCount === 0;

    return {
        totalTestCases: testCases.length,
        totalBatches,
        successCount,
        failureCount,
        success: allSuccess,
        commentIds,
        error: errors.length > 0 ? errors.join('; ') : undefined
    };
}

function textToADF(text) {
    if (!text) {
        return {
            type: 'doc',
            version: 1,
            content: []
        };
    }

    const paragraphs = text.split('\n\n').filter((paragraph) => paragraph.trim());
    const content = paragraphs.map((paragraph) => ({
        type: 'paragraph',
        content: [{
            type: 'text',
            text: paragraph.trim()
        }]
    }));

    return {
        type: 'doc',
        version: 1,
        content: content.length > 0 ? content : [{
            type: 'paragraph',
            content: [{
                type: 'text',
                text
            }]
        }]
    };
}

function normalizeIssueTypeName(issueTypeName) {
    return String(issueTypeName || '').trim().toLowerCase();
}

function isSubtaskIssueType(issueTypeName) {
    const normalized = normalizeIssueTypeName(issueTypeName);
    return normalized === 'sub-task' || normalized === 'subtask';
}

function isEpicIssueType(issueTypeName) {
    return normalizeIssueTypeName(issueTypeName) === 'epic';
}

function getIssuePlanPath(filename = 'issues.json', ticket) {
    const stagingPath = getStagingPath(filename);
    if (fs.existsSync(stagingPath)) {
        return stagingPath;
    }

    if (ticket) {
        const docsPath = resolveTicketDocPath(ticket, filename);
        if (docsPath) {
            return docsPath;
        }
    }

    return stagingPath;
}

function normalizeIssuePlan(rawPlan) {
    if (Array.isArray(rawPlan)) {
        return {
            mode: 'subtasks',
            items: rawPlan.map((item) => ({
                issueType: item.issueType || 'Sub-task',
                summary: item.summary,
                description: item.description,
                children: [],
            })),
        };
    }

    const items = Array.isArray(rawPlan?.items) ? rawPlan.items : [];
    return {
        mode: rawPlan?.mode || 'hierarchy',
        items,
    };
}

function readIssuePlan({ filename = 'issues.json', ticket } = {}) {
    const file = getIssuePlanPath(filename, ticket);
    if (!fs.existsSync(file)) {
        throw new Error(`Issue plan file not found at: ${file}`);
    }

    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const plan = normalizeIssuePlan(parsed);

    if (!Array.isArray(plan.items) || plan.items.length === 0) {
        throw new Error(`${filename} must contain a non-empty "items" array`);
    }

    return plan;
}

async function fetchParentContext(ticket) {
    const normalizedTicket = normalizeTicketKey(ticket);
    const issue = await jira.findIssue(normalizedTicket);
    return {
        key: normalizedTicket,
        projectKey: issue.fields?.project?.key || normalizedTicket.split('-')[0],
        issueTypeName: issue.fields?.issuetype?.name || '',
        summary: issue.fields?.summary || '',
    };
}

let epicLinkFieldIdCache;
async function getEpicLinkFieldId() {
    if (epicLinkFieldIdCache !== undefined) {
        return epicLinkFieldIdCache;
    }

    try {
        const url = buildJiraUrl('/rest/api/3/field');
        const res = await fetch(url, {
            headers: getJsonHeaders()
        });

        if (!res.ok) {
            const errorText = await res.text();
            log(`[Issue] Warning: Unable to resolve Epic Link field: ${res.status} - ${errorText}`);
            epicLinkFieldIdCache = null;
            return epicLinkFieldIdCache;
        }

        const fields = await res.json();
        const match = fields.find((field) => field?.name === 'Epic Link');
        epicLinkFieldIdCache = match?.id || null;
        return epicLinkFieldIdCache;
    } catch (error) {
        log(`[Issue] Warning: Failed to resolve Epic Link field: ${error.message}`);
        epicLinkFieldIdCache = null;
        return epicLinkFieldIdCache;
    }
}

function buildIssuePayload({ projectKey, childIssueType, summary, description, parentKey, epicLinkFieldId, epicKey }) {
    const fields = {
        project: { key: projectKey },
        issuetype: { name: childIssueType },
        summary,
    };

    if (description) {
        fields.description = textToADF(description);
    }

    if (parentKey) {
        fields.parent = { key: parentKey };
    }

    if (epicLinkFieldId && epicKey) {
        fields[epicLinkFieldId] = epicKey;
    }

    return { fields };
}

async function postIssuePayload(issuePayload, summary, issueTypeLabel) {
    const url = buildJiraUrl('/rest/api/3/issue');
    const res = await fetch(url, {
        method: 'POST',
        headers: getJsonHeaders(),
        body: JSON.stringify(issuePayload)
    });

    if (!res.ok) {
        const errorText = await res.text();
        log(`[Issue] ✗ Failed to create ${issueTypeLabel}: ${res.status} - ${errorText}`);
        return { success: false, error: errorText, status: res.status };
    }

    const result = await res.json();
    log(`[Issue] ✓ Created ${issueTypeLabel} ${result.key}: "${summary}"`);
    return { success: true, key: result.key, id: result.id };
}

async function createIssueUnderParent(parentContext, issueData) {
    const childIssueType = issueData.issueType || 'Sub-task';
    const summary = typeof issueData.summary === 'string' ? issueData.summary.trim() : '';

    if (!summary) {
        return { success: false, error: 'Missing or empty summary' };
    }

    const parentIssueType = parentContext.issueTypeName;
    const childLabel = `${childIssueType} "${summary}"`;
    log(`[Issue] Creating ${childLabel} under ${parentContext.key} (${parentIssueType})...`);

    if (isSubtaskIssueType(childIssueType)) {
        if (isSubtaskIssueType(parentIssueType)) {
            return { success: false, error: `Cannot create a subtask under subtask ${parentContext.key}` };
        }

        if (isEpicIssueType(parentIssueType)) {
            return {
                success: false,
                error: `Cannot create a top-level subtask directly under epic ${parentContext.key}. Generate a hierarchy with standard child issues first.`,
            };
        }

        const issuePayload = buildIssuePayload({
            projectKey: parentContext.projectKey,
            childIssueType: 'Sub-task',
            summary,
            description: issueData.description,
            parentKey: parentContext.key,
        });

        const result = await postIssuePayload(issuePayload, summary, 'subtask');
        return result.success
            ? { ...result, issueType: 'Sub-task', parentKey: parentContext.key }
            : result;
    }

    if (isSubtaskIssueType(parentIssueType)) {
        return {
            success: false,
            error: `Cannot create child issue type "${childIssueType}" under subtask ${parentContext.key}`,
        };
    }

    if (!isEpicIssueType(parentIssueType)) {
        return {
            success: false,
            error: `Only Epic parents can create non-subtask child issues. ${parentContext.key} is ${parentIssueType || 'an unsupported type'}.`,
        };
    }

    let issuePayload = buildIssuePayload({
        projectKey: parentContext.projectKey,
        childIssueType,
        summary,
        description: issueData.description,
        parentKey: parentContext.key,
    });

    let result = await postIssuePayload(issuePayload, summary, childIssueType);
    if (result.success) {
        return { ...result, issueType: childIssueType, parentKey: parentContext.key, relationship: 'parent' };
    }

    const epicLinkFieldId = await getEpicLinkFieldId();
    if (!epicLinkFieldId) {
        return result;
    }

    log(`[Issue] Retrying ${childIssueType} creation for ${summary} using Epic Link field ${epicLinkFieldId}...`);
    issuePayload = buildIssuePayload({
        projectKey: parentContext.projectKey,
        childIssueType,
        summary,
        description: issueData.description,
        epicLinkFieldId,
        epicKey: parentContext.key,
    });

    result = await postIssuePayload(issuePayload, summary, childIssueType);
    return result.success
        ? { ...result, issueType: childIssueType, parentKey: parentContext.key, relationship: 'epicLink' }
        : result;
}

function countPlannedIssues(items = []) {
    return items.reduce((total, item) => {
        const children = Array.isArray(item.children) ? item.children.length : 0;
        return total + 1 + children;
    }, 0);
}

async function createIssuesFromPlan({ ticket, filename = 'issues.json' }) {
    const parentContext = await fetchParentContext(ticket);
    const plan = readIssuePlan({ filename, ticket });
    const totalPlanned = countPlannedIssues(plan.items);

    log(`\n[Hierarchy] Creating issues for ${parentContext.key} (${parentContext.issueTypeName}) from ${filename}\n`);
    log(`[Hierarchy] Mode: ${plan.mode}; Planned issues: ${totalPlanned}\n`);

    let successCount = 0;
    let failureCount = 0;
    const errors = [];
    const createdItems = [];

    for (let index = 0; index < plan.items.length; index++) {
        const item = plan.items[index];
        const topLevelResult = await createIssueUnderParent(parentContext, item);

        if (!topLevelResult.success) {
            failureCount++;
            errors.push(`Item ${index + 1} ("${item.summary || 'Untitled'}"): ${topLevelResult.error}`);
            continue;
        }

        successCount++;
        const createdItem = {
            key: topLevelResult.key,
            issueType: topLevelResult.issueType,
            summary: item.summary,
            children: [],
        };
        createdItems.push(createdItem);

        const childItems = Array.isArray(item.children) ? item.children : [];
        if (childItems.length === 0) {
            continue;
        }

        const childParentContext = {
            key: topLevelResult.key,
            projectKey: parentContext.projectKey,
            issueTypeName: topLevelResult.issueType,
            summary: item.summary,
        };

        for (let childIndex = 0; childIndex < childItems.length; childIndex++) {
            const child = childItems[childIndex];
            const childResult = await createIssueUnderParent(childParentContext, child);

            if (childResult.success) {
                successCount++;
                createdItem.children.push({
                    key: childResult.key,
                    issueType: childResult.issueType,
                    summary: child.summary,
                });
            } else {
                failureCount++;
                errors.push(
                    `Child ${index + 1}.${childIndex + 1} ("${child.summary || 'Untitled'}"): ${childResult.error}`
                );
            }

            if (childIndex < childItems.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }

        if (index < plan.items.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    return {
        mode: plan.mode,
        parent: {
            key: parentContext.key,
            issueType: parentContext.issueTypeName,
        },
        totalPlanned,
        successCount,
        failureCount,
        success: failureCount === 0,
        createdItems,
        error: errors.length > 0 ? errors.join('; ') : undefined,
    };
}

async function createSubtask(parentKey, subtaskData) {
    try {
        const parentContext = await fetchParentContext(parentKey);
        return await createIssueUnderParent(parentContext, {
            issueType: 'Sub-task',
            summary: subtaskData.summary,
            description: subtaskData.description,
        });
    } catch (error) {
        log('[Subtask] ✗ Error creating subtask:', error.message);
        return { success: false, error: error.message };
    }
}

async function createSubtasksFromFile({ ticket }) {
    log(`\n[Subtask] Creating subtasks for ticket: ${ticket}\n`);

    const stagingFile = getStagingPath('subtasks.json');
    const file = fs.existsSync(stagingFile)
        ? stagingFile
        : resolveTicketDocPath(ticket, 'subtasks.json');

    if (!file || !fs.existsSync(file)) {
        throw new Error('Subtasks file not found at: ' + stagingFile);
    }

    const subtasks = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (!Array.isArray(subtasks) || subtasks.length === 0) {
        throw new Error('subtasks.json must contain a non-empty array of subtasks');
    }

    log(`[Subtask] Found ${subtasks.length} subtask(s) to create\n`);
    const parentContext = await fetchParentContext(ticket);

    let successCount = 0;
    let failureCount = 0;
    const createdKeys = [];
    const errors = [];

    for (let i = 0; i < subtasks.length; i++) {
        const subtask = subtasks[i];

        if (!subtask.summary || typeof subtask.summary !== 'string' || subtask.summary.trim() === '') {
            const errorMsg = `Subtask ${i + 1}: Missing or empty summary`;
            log(`[Subtask] ✗ ${errorMsg}`);
            errors.push(errorMsg);
            failureCount++;
            continue;
        }

        const result = await createIssueUnderParent(parentContext, {
            issueType: 'Sub-task',
            summary: subtask.summary,
            description: subtask.description,
        });

        if (result.success) {
            successCount++;
            createdKeys.push(result.key);
        } else {
            failureCount++;
            errors.push(`Subtask ${i + 1} ("${subtask.summary}"): ${result.error}`);
        }

        if (i < subtasks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    const allSuccess = failureCount === 0;
    log(`\n[Subtask] Summary: ${successCount} created, ${failureCount} failed\n`);

    return {
        totalSubtasks: subtasks.length,
        successCount,
        failureCount,
        success: allSuccess,
        createdKeys,
        error: errors.length > 0 ? errors.join('; ') : undefined
    };
}

module.exports = {
    postTestCasesToJira,
    createSubtask,
    createSubtasksFromFile,
    createIssuesFromPlan,
};
