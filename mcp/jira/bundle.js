const path = require('path');
const fs = require('fs');

const {
    jira,
    log,
    normalizeTicketKey,
    getAuthHeader,
    getJsonHeaders,
    buildJiraUrl,
} = require('./client');
const {
    adfToText,
    extractAttachmentsFromADF,
    extractConfluencePageIds,
    fetchConfluencePage,
    fetchConfluencePageByUrl,
} = require('./confluence');

async function fetchAttachment(url) {
    const res = await fetch(url, {
        headers: {
            Authorization: getAuthHeader()
        }
    });
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}

async function fetchAttachments(issue) {
    const attachments = issue.fields?.attachment || [];
    const result = [];

    for (const attachment of attachments) {
        try {
            const base64 = await fetchAttachment(attachment.content);
            result.push({
                filename: attachment.filename,
                mimeType: attachment.mimeType,
                base64
            });
        } catch (error) {
            log(`[Attachments] Warning: Failed to fetch ${attachment.filename}`);
        }
    }
    return result;
}

async function fetchLinkedIssues(issue) {
    const links = issue.fields?.issuelinks || [];
    const result = [];
    const seenKeys = new Set();

    for (const link of links) {
        const key = link?.inwardIssue?.key || link?.outwardIssue?.key || null;
        if (key && !seenKeys.has(key)) {
            seenKeys.add(key);
            try {
                const linkedIssue = await jira.findIssue(key);
                result.push(linkedIssue);
            } catch (error) {
                log(`[Linked Issues] Warning: Failed to fetch ${key}`);
            }
        }
    }
    return result;
}

async function fetchRemoteLinks(issueKey) {
    try {
        const url = buildJiraUrl(`/rest/api/3/issue/${issueKey}/remotelink`);
        const res = await fetch(url, {
            headers: getJsonHeaders()
        });

        if (res.ok) {
            return await res.json();
        }
        return [];
    } catch (error) {
        log(`[Remote Links] Warning: Failed to fetch for ${issueKey}`);
        return [];
    }
}

async function fetchComments(issueKey) {
    try {
        log(`[Comments] Fetching comments for ${issueKey}...`);
        const url = buildJiraUrl(`/rest/api/3/issue/${issueKey}/comment`);

        const res = await fetch(url, {
            headers: getJsonHeaders()
        });

        if (!res.ok) {
            log(`[Comments] Warning: Failed to fetch comments for ${issueKey}: ${res.status}`);
            return [];
        }

        const data = await res.json();
        const comments = data.comments || [];
        log(`[Comments] ✓ Found ${comments.length} comments for ${issueKey}`);

        const processedComments = [];
        for (const comment of comments) {
            let bodyText = '';
            if (comment.body && typeof comment.body === 'object' && comment.body.content) {
                bodyText = adfToText(comment.body);
            } else if (typeof comment.body === 'string') {
                bodyText = comment.body;
            }

            const commentAttachments = [];
            if (comment.body && comment.body.content) {
                const attachmentUrls = extractAttachmentsFromADF(comment.body.content);
                for (const attUrl of attachmentUrls) {
                    try {
                        const base64 = await fetchAttachment(attUrl);
                        const filename = attUrl.split('/').pop();
                        commentAttachments.push({
                            filename,
                            url: attUrl,
                            base64
                        });
                    } catch (error) {
                        log('[Comments] Warning: Failed to fetch attachment from comment');
                    }
                }
            }

            processedComments.push({
                id: comment.id,
                author: {
                    displayName: comment.author?.displayName,
                    emailAddress: comment.author?.emailAddress,
                    accountId: comment.author?.accountId
                },
                body: bodyText,
                created: comment.created,
                updated: comment.updated,
                updateAuthor: {
                    displayName: comment.updateAuthor?.displayName,
                    accountId: comment.updateAuthor?.accountId
                },
                attachments: commentAttachments
            });
        }
        return processedComments;
    } catch (error) {
        log(`[Comments] Warning: Error fetching comments for ${issueKey}:`, error.message);
        return [];
    }
}

function slimIssue(issue) {
    if (!issue) return issue;
    return {
        id: issue.id,
        key: issue.key,
        summary: issue.fields?.summary,
        description: issue.fields?.description,
        status: issue.fields?.status?.name,
        issueType: issue.fields?.issuetype?.name,
        labels: issue.fields?.labels,
        attachments: issue.fields?.attachments,
        subtasks: issue.fields?.subtasks,
        parent: issue.fields?.parent?.key,
        team: issue.fields?.customfield_10001?.name
            || issue.fields?.customfield_10001?.value
            || null,
        components: (issue.fields?.components || []).map((component) => component.name),
    };
}

function getStagingPath(filename = 'aggregated.json') {
    return path.join(process.cwd(), 'staging', filename);
}

function readAggregatedBundle() {
    const file = getStagingPath();
    if (!fs.existsSync(file)) {
        throw new Error('staging/aggregated.json not found. Run fetch-jira first.');
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function serializableBundle(aggregated) {
    const out = { ...aggregated };
    if (Array.isArray(out.attachments)) {
        out.attachments = out.attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
        }));
    }
    if (Array.isArray(out.comments)) {
        out.comments = out.comments.map((c) => {
            const comment = { ...c };
            if (Array.isArray(comment.attachments)) {
                comment.attachments = comment.attachments.map((a) => ({
                    filename: a.filename,
                    url: a.url,
                }));
            }
            return comment;
        });
    }
    return out;
}

function writeAggregatedBundle(aggregated) {
    const stagingDir = path.dirname(getStagingPath());
    if (!fs.existsSync(stagingDir)) {
        fs.mkdirSync(stagingDir, { recursive: true });
    }
    const payload = serializableBundle(aggregated);
    fs.writeFileSync(getStagingPath(), JSON.stringify(payload, null, 2), 'utf8');
}

function getExistingTicketKeys(aggregated) {
    const keys = new Set();
    if (aggregated.root?.key) keys.add(normalizeTicketKey(aggregated.root.key));
    (aggregated.linked || []).forEach((issue) => {
        if (issue?.key) keys.add(normalizeTicketKey(issue.key));
    });
    (aggregated.rovoContext || []).forEach((item) => {
        if (item?.type === 'ticket' && (item.issueKey || item.id)) {
            keys.add(normalizeTicketKey(item.issueKey || item.id));
        }
    });
    return keys;
}

function getExistingPageIds(aggregated) {
    const ids = new Set();
    (aggregated.confluence || []).forEach((page) => {
        if (page?.id) ids.add(String(page.id));
    });
    (aggregated.rovoContext || []).forEach((item) => {
        if (item?.type === 'page' && (item.pageId || item.id)) {
            ids.add(String(item.pageId || item.id));
        }
    });
    return ids;
}

function getExistingPageUrls(aggregated) {
    const urls = new Set();
    (aggregated.confluence || []).forEach((page) => {
        if (page?.url) urls.add(page.url);
    });
    (aggregated.rovoContext || []).forEach((item) => {
        if (item?.type === 'page' && item.url) {
            urls.add(item.url);
        }
    });
    return urls;
}

function buildRovoPageItem(page, extra = {}) {
    const fullText = page.textContent || '';
    const content = `Confluence Page: ${page.title || page.id}\n` +
        `${page.spaceName ? `Space: ${page.spaceName}\n` : ''}` +
        `${page.url ? `URL: ${page.url}\n` : ''}` +
        `\n${fullText}`.trim();

    return {
        type: 'page',
        id: String(page.id),
        pageId: String(page.id),
        title: page.title,
        spaceKey: page.spaceKey,
        version: page.version,
        contentFormat: page.contentFormat,
        textContent: fullText,
        isArchived: page.isArchived,
        url: page.url,
        source: 'rovo',
        fetchedAt: new Date().toISOString(),
        content,
        metadata: {
            spaceKey: page.spaceKey,
            spaceName: page.spaceName,
            isArchived: page.isArchived,
            contentFormat: page.contentFormat,
            createdBy: page.metadata?.createdBy,
            createdAt: page.metadata?.createdAt,
            lastModified: page.metadata?.lastModified,
        },
        ...extra,
    };
}

function buildRovoTicketItem(bundle) {
    const description = adfToText(bundle.root.description);
    const lines = [
        `Related Jira Ticket: ${bundle.root.key}`,
        `Summary: ${bundle.root.summary || ''}`,
        bundle.root.issueType ? `Type: ${bundle.root.issueType}` : '',
        bundle.root.status ? `Status: ${bundle.root.status}` : '',
        (bundle.root.labels || []).length > 0 ? `Labels: ${bundle.root.labels.join(', ')}` : '',
        (bundle.root.components || []).length > 0 ? `Components: ${bundle.root.components.join(', ')}` : '',
        description ? `\nDescription:\n${description}` : '',
        bundle.linked?.length
            ? `\nLinked Tickets:\n${bundle.linked.map((issue) => {
                const linkDesc = issue.description ? adfToText(issue.description) : '';
                return `--- ${issue.key}: ${issue.summary || ''}\n${linkDesc ? linkDesc + '\n' : ''}`;
            }).join('\n')}`
            : '',
        bundle.comments?.length
            ? `\nComments:\n${bundle.comments.map((comment) => {
                const author = comment.author?.displayName || 'Unknown';
                const body = typeof comment.body === 'string' ? comment.body : (comment.body && comment.body.content ? adfToText(comment.body) : '');
                return `[${author}] ${body}`.trim();
            }).join('\n\n')}`
            : '',
        bundle.attachments?.length
            ? `\nAttachments:\n${bundle.attachments.map((attachment) => `- ${attachment.filename}${attachment.mimeType ? ` (${attachment.mimeType})` : ''}`).join('\n')}`
            : '',
        bundle.confluence?.length
            ? `\nLinked Confluence Pages:\n${bundle.confluence.map((page) => {
                const titleLine = `--- ${page.title || page.id}${page.url ? ` (${page.url})` : ''}`;
                return page.textContent ? `${titleLine}\n${page.textContent}` : titleLine;
            }).join('\n\n')}`
            : '',
    ].filter(Boolean);

    return {
        type: 'ticket',
        id: bundle.root.key,
        issueKey: bundle.root.key,
        summary: bundle.root.summary,
        issueType: bundle.root.issueType,
        status: bundle.root.status,
        source: 'rovo',
        fetchedAt: new Date().toISOString(),
        content: lines.join('\n'),
        details: {
            root: bundle.root,
            linked: bundle.linked,
            comments: bundle.comments,
            attachments: (bundle.attachments || []).map((attachment) => ({
                filename: attachment.filename,
                mimeType: attachment.mimeType,
            })),
            confluence: (bundle.confluence || []).map((page) => ({
                id: page.id,
                title: page.title,
                url: page.url,
            })),
        }
    };
}

async function collectTicketBundle(ticket) {
    const normalizedTicket = normalizeTicketKey(ticket);

    const root = await jira.findIssue(normalizedTicket);
    log(`[Jira] ✓ Found ticket: ${root.fields.summary}`);

    const linked = await fetchLinkedIssues(root);
    log(`[Jira] ✓ Found ${linked.length} linked issues`);

    const attachments = await fetchAttachments(root);
    log(`[Jira] ✓ Found ${attachments.length} attachments`);

    const comments = await fetchComments(normalizedTicket);
    log(`[Jira] ✓ Found ${comments.length} comments`);

    const remoteLinks = await fetchRemoteLinks(normalizedTicket);
    log(`[Jira] ✓ Found ${remoteLinks.length} remote links`);

    if (!root.fields) {
        root.fields = {};
    }
    root.fields.remotelinks = remoteLinks;

    let rawComments = [];
    try {
        const commentUrl = buildJiraUrl(`/rest/api/3/issue/${normalizedTicket}/comment`);
        const commentRes = await fetch(commentUrl, {
            headers: getJsonHeaders()
        });
        if (commentRes.ok) {
            const commentData = await commentRes.json();
            rawComments = commentData.comments || [];
        }
    } catch (error) {
        log('[Confluence] Warning: Could not fetch raw comments for link extraction');
    }

    const { pageIDs, pageUrls } = extractConfluencePageIds(root, rawComments);
    log(`[Confluence] Found ${pageIDs.length} page IDs and ${pageUrls.length} page URLs\n`);

    const confluence = [];
    const processedPageIds = new Set();

    for (const pid of pageIDs) {
        if (processedPageIds.has(pid)) {
            log(`[Confluence] Skipping duplicate page ID: ${pid}`);
            continue;
        }

        try {
            const page = await fetchConfluencePage(pid);
            if (page && page.textContent) {
                confluence.push(page);
                processedPageIds.add(pid);
            }
        } catch (error) {
            log(`[Confluence] ✗ Error fetching page ${pid}:`, error.message);
        }
    }

    for (const url of pageUrls) {
        try {
            const page = await fetchConfluencePageByUrl(url);
            if (page && page.textContent) {
                if (processedPageIds.has(page.id)) {
                    log(`[Confluence] Skipping duplicate page from URL: ${url} (already fetched as ID ${page.id})`);
                    continue;
                }
                confluence.push(page);
                processedPageIds.add(page.id);
            }
        } catch (error) {
            log(`[Confluence] ✗ Error fetching URL ${url}:`, error.message);
        }
    }

    const archivedCount = confluence.filter((page) => page.isArchived).length;
    log(`\n[Summary] Total Confluence pages: ${confluence.length} (${archivedCount} archived)\n`);

    return {
        root: slimIssue(root),
        linked: linked.map(slimIssue),
        attachments,
        comments,
        confluence,
        metadata: {
            fetchedAt: new Date().toISOString(),
            confluencePagesCount: confluence.length,
            confluenceArchivedCount: archivedCount,
            linkedIssuesCount: linked.length,
            attachmentsCount: attachments.length,
            commentsCount: comments.length
        }
    };
}

async function appendRovoIssueToBundle({ ticket }) {
    const normalizedTicket = normalizeTicketKey(ticket);
    const aggregated = readAggregatedBundle();
    const existingTickets = getExistingTicketKeys(aggregated);

    if (existingTickets.has(normalizedTicket)) {
        return {
            success: true,
            skipped: true,
            reason: `Ticket ${normalizedTicket} already exists in aggregated.json`,
            appendedPages: 0,
        };
    }

    log(`\n[Rovo] Hydrating related Jira ticket: ${normalizedTicket}\n`);
    const bundle = await collectTicketBundle(normalizedTicket);
    const ticketItem = buildRovoTicketItem(bundle);

    aggregated.rovoContext = aggregated.rovoContext || [];
    aggregated.rovoContext.push(ticketItem);

    let appendedPages = 0;
    const existingPageIds = getExistingPageIds(aggregated);

    for (const page of bundle.confluence || []) {
        const pageId = String(page.id);
        if (existingPageIds.has(pageId)) {
            continue;
        }
        aggregated.rovoContext.push(buildRovoPageItem(page, {
            originTicket: normalizedTicket,
            origin: 'related_ticket',
        }));
        existingPageIds.add(pageId);
        appendedPages++;
    }

    writeAggregatedBundle(aggregated);

    return {
        success: true,
        skipped: false,
        ticket: normalizedTicket,
        appendedPages,
        linkedIssues: bundle.linked.length,
        comments: bundle.comments.length,
        attachments: bundle.attachments.length,
    };
}

async function appendRovoPageToBundle({ pageId, pageUrl }) {
    const aggregated = readAggregatedBundle();
    const existingPageIds = getExistingPageIds(aggregated);
    const existingPageUrls = getExistingPageUrls(aggregated);

    if (pageId && existingPageIds.has(String(pageId))) {
        return {
            success: true,
            skipped: true,
            reason: `Confluence page ${pageId} already exists in aggregated.json`,
        };
    }

    if (pageUrl && existingPageUrls.has(pageUrl)) {
        return {
            success: true,
            skipped: true,
            reason: 'Confluence page URL already exists in aggregated.json',
        };
    }

    log(`\n[Rovo] Hydrating related Confluence page: ${pageId || pageUrl}\n`);
    const page = pageId
        ? await fetchConfluencePage(String(pageId))
        : await fetchConfluencePageByUrl(pageUrl);

    if (!page || !page.textContent) {
        return {
            success: false,
            skipped: false,
            reason: `Unable to fetch Confluence page ${pageId || pageUrl}`,
        };
    }

    if (existingPageIds.has(String(page.id))) {
        return {
            success: true,
            skipped: true,
            reason: `Confluence page ${page.id} already exists in aggregated.json`,
        };
    }

    aggregated.rovoContext = aggregated.rovoContext || [];
    aggregated.rovoContext.push(buildRovoPageItem(page));
    writeAggregatedBundle(aggregated);

    return {
        success: true,
        skipped: false,
        pageId: String(page.id),
        title: page.title,
    };
}

async function fetchTicketBundle({ ticket }) {
    log(`\n[Jira] Fetching ticket: ${ticket}\n`);
    return await collectTicketBundle(ticket);
}

module.exports = {
    fetchTicketBundle,
    appendRovoIssueToBundle,
    appendRovoPageToBundle,
    writeAggregatedBundle,
};
