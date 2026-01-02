const path = require('path');
const fs = require('fs');
 
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
 
const JiraApi = require('jira-client');
 
const {
    Jira_DOMAIN,
    Jira_EMAIL,
    Jira_API_TOKEN
} = process.env;
 
if (!Jira_DOMAIN || !Jira_EMAIL || !Jira_API_TOKEN) {
    console.error("Jira credentials are not set in the environment variables");
    process.exit(1);
}
 
const cleanDomain = Jira_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
 
const jira = new JiraApi({
    protocol: "https",
    host: cleanDomain,
    username: Jira_EMAIL,
    password: Jira_API_TOKEN,
    apiVersion: "3"
});
 
// Log messages to stderr to keep stdout clean for MCP protocol communication
function log(message, ...args) {
    console.error(message, ...args);
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Confluence Content Conversion
// Transforms Atlassian Document Format (ADF) and HTML into readable plain text
// ─────────────────────────────────────────────────────────────────────────────

function adfToText(adfContent) {
    if (!adfContent || typeof adfContent !== 'object') {
        return '';
    }
 
    let text = '';
 
    function traverse(node) {
        if (!node) return;
 
        if (node.type === 'text') {
            text += node.text || '';
            return;
        }
 
        switch (node.type) {
            case 'paragraph':
                if (node.content) {
                    node.content.forEach(traverse);
                    text += '\n\n';
                }
                break;
            
            case 'heading':
                const level = node.attrs?.level || 1;
                text += '#'.repeat(level) + ' ';
                if (node.content) {
                    node.content.forEach(traverse);
                }
                text += '\n\n';
                break;
            
            case 'bulletList':
            case 'orderedList':
                if (node.content) {
                    node.content.forEach(traverse);
                }
                text += '\n';
                break;
            
            case 'listItem':
                text += '• ';
                if (node.content) {
                    node.content.forEach(traverse);
                }
                text += '\n';
                break;
            
            case 'codeBlock':
                text += '```\n';
                if (node.content) {
                    node.content.forEach(traverse);
                }
                text += '\n```\n\n';
                break;
            
            case 'hardBreak':
                text += '\n';
                break;
            
            default:
                if (node.content && Array.isArray(node.content)) {
                    node.content.forEach(traverse);
                }
        }
    }
 
    traverse(adfContent);
    return text.trim();
}
 
function htmlToText(html) {
    if (!html) return '';
    
    return html
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Attachment Retrieval
// Downloads and encodes file attachments from Jira issues
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAttachment(url) {
    const res = await fetch(url, {
        headers: {
            Authorization: "Basic " + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString("base64")
        }
    });
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
}
 
async function fetchAttachments(issue) {
    const attachments = issue.fields?.attachment || [];
    const result = [];
 
    for (const a of attachments) {
        try {
            const base64 = await fetchAttachment(a.content);
            result.push({
                filename: a.filename,
                mimeType: a.mimeType,
                base64
            });
        } catch (err) {
            log(`[Attachments] Warning: Failed to fetch ${a.filename}`);
        }
    }
    return result;
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Linked Issue Retrieval
// Fetches all issues linked to the primary ticket (dependencies, related work)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchLinkedIssues(issue) {
    const links = issue.fields?.issuelinks || [];
    const result = [];
 
    for (const link of links) {
        const key = link?.inwardIssue?.key || link?.outwardIssue?.key || null;
        if (key) {
            try {
                const li = await jira.findIssue(key);
                result.push(li);
            } catch (err) {
                log(`[Linked Issues] Warning: Failed to fetch ${key}`);
            }
        }
    }
    return result;
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Remote Link Retrieval
// Fetches external links attached to the ticket (Confluence pages, URLs, etc.)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRemoteLinks(issueKey) {
    try {
        const url = `https://${cleanDomain}/rest/api/3/issue/${issueKey}/remotelink`;
        const res = await fetch(url, {
            headers: {
                Authorization: "Basic " + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString("base64"),
                "Content-Type": "application/json"
            }
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

// ─────────────────────────────────────────────────────────────────────────────
// Comment Retrieval
// Fetches all comments on the ticket, including any embedded attachments
// ─────────────────────────────────────────────────────────────────────────────

async function fetchComments(issueKey) {
    try {
        log(`[Comments] Fetching comments for ${issueKey}...`);
        const url = `https://${cleanDomain}/rest/api/3/issue/${issueKey}/comment`;

        const res = await fetch(url, {
            headers: {
                Authorization: "Basic " + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString("base64"),
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            log(`[Comments] Warning: Failed to fetch comments for ${issueKey}: ${res.status}`);
            return [];
        }

        const data = await res.json();
        const comments = data.comments || [];
        log(`[Comments] ✓ Found ${comments.length} comments for ${issueKey}`);

        // Process each comment and retrieve any embedded attachments
        const processedComments = [];
        for (const comment of comments) {
            // Convert the comment body from ADF format to plain text
            let bodyText = '';
            if (comment.body && typeof comment.body === 'object' && comment.body.content) {
                bodyText = adfToText(comment.body);
            } else if (typeof comment.body === 'string') {
                bodyText = comment.body;
            }

            // Retrieve any files or images embedded in the comment
            const commentAttachments = [];
            if (comment.body && comment.body.content) {
                const attachmentUrls = extractAttachmentsFromADF(comment.body.content);
                for (const attUrl of attachmentUrls) {
                    try {
                        const base64 = await fetchAttachment(attUrl);
                        const filename = attUrl.split('/').pop();
                        commentAttachments.push({
                            filename: filename,
                            url: attUrl,
                            base64: base64
                        });
                    } catch (err) {
                        log(`[Comments] Warning: Failed to fetch attachment from comment`);
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

/**
 * Extracts attachment URLs from Atlassian Document Format content.
 * Recursively traverses the ADF tree to find media and attachment nodes.
 */
function extractAttachmentsFromADF(content) {
    const urls = [];
    if (!content || !Array.isArray(content)) {
        return urls;
    }
    for (const node of content) {
        // Media nodes contain images and file previews
        if (node.type === 'media' && node.attrs?.url) {
            urls.push(node.attrs.url);
        }
        // Attachment nodes contain downloadable files
        if (node.type === 'attachment' && node.attrs?.url) {
            urls.push(node.attrs.url);
        }
        // Continue searching in nested content
        if (node.content) {
            urls.push(...extractAttachmentsFromADF(node.content));
        }
    }
    return urls;
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Confluence Page Discovery
// Identifies Confluence page references embedded in Jira content
// ─────────────────────────────────────────────────────────────────────────────

function extractUrlsFromADF(content) {
    const urls = [];
    
    if (!content || !Array.isArray(content)) {
        return urls;
    }
    
    for (const node of content) {
        if (node.type === 'inlineCard' && node.attrs?.url) {
            urls.push(node.attrs.url);
        }
        
        if (node.type === 'text' && node.marks) {
            for (const mark of node.marks) {
                if (mark.type === 'link' && mark.attrs?.href) {
                    urls.push(mark.attrs.href);
                }
            }
        }
        
        if (node.content) {
            urls.push(...extractUrlsFromADF(node.content));
        }
    }
    
    return urls;
}
 
function extractConfluencePageIds(issue, comments = []) {
    const pageIDs = [];
    const pageUrls = [];

    const remoteLinks = issue.fields?.remotelinks || [];
    
    for (const remoteLink of remoteLinks) {
        const url = remoteLink?.object?.url || remoteLink?.url;
        if (!url) continue;
        
        if (url.includes('/wiki/') || url.includes('atlassian.net/wiki') || url.includes('confluence')) {
            const pageIdMatch = url.match(/\/pages\/(\d+)/);
            if (pageIdMatch) {
                pageIDs.push(pageIdMatch[1]);
            } else {
                pageUrls.push(url);
            }
        }
    }

    const description = issue.fields?.description;
    if (description && description.content) {
        const urls = extractUrlsFromADF(description.content);
        
        for (const url of urls) {
            if (url.includes('/wiki/') || url.includes('atlassian.net/wiki') || url.includes('confluence')) {
                const pageIdMatch = url.match(/\/pages\/(\d+)/);
                if (pageIdMatch) {
                    pageIDs.push(pageIdMatch[1]);
                } else {
                    pageUrls.push(url);
                }
            }
        }
    }

    // Search for Confluence links within comment text as well
    for (const comment of comments) {
        if (comment.body && comment.body.content) {
            const urls = extractUrlsFromADF(comment.body.content);
            
            for (const url of urls) {
                if (url.includes('/wiki/') || url.includes('atlassian.net/wiki') || url.includes('confluence')) {
                    const pageIdMatch = url.match(/\/pages\/(\d+)/);
                    if (pageIdMatch) {
                        pageIDs.push(pageIdMatch[1]);
                    } else {
                        pageUrls.push(url);
                    }
                }
            }
        }
    }

    return { pageIDs: [...new Set(pageIDs)], pageUrls: [...new Set(pageUrls)] };
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Confluence Page Retrieval
// Fetches full page content including archived pages, with v2/v1 API fallback
// ─────────────────────────────────────────────────────────────────────────────

async function fetchConfluencePage(pageID) {
    log(`[Confluence] Fetching page ID: ${pageID}`);
    
    // Attempt to fetch using the modern Confluence v2 API first
    let url = `https://${cleanDomain}/wiki/api/v2/pages/${pageID}?body-format=atlas_doc_format`;
    
    let res = await fetch(url, {
        headers: {
            Authorization: "Basic " + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString("base64"),
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    });
 
    let pageData = null;
    let bodyContent = null;
    let contentFormat = 'none';
    let isArchived = false;
 
    if (res.ok) {
        pageData = await res.json();
        isArchived = pageData.status === 'archived' || pageData.archived === true;
        
        if (isArchived) {
            log(`[Confluence] Page ${pageID} is archived - attempting to fetch anyway`);
        }
        
        if (pageData.body?.atlas_doc_format?.value) {
            bodyContent = pageData.body.atlas_doc_format.value;
            contentFormat = 'atlas_doc_format_v2';
            log(`[Confluence] ✓ Found content in v2 API (atlas_doc_format)`);
        }
    }
 
    // If v2 API didn't return content, try the legacy v1 API
    if (!bodyContent) {
        log(`[Confluence] Trying v1 API for page ${pageID}...`);
        url = `https://${cleanDomain}/wiki/rest/api/content/${pageID}?expand=body.atlas_doc_format,body.storage,body.view,version,space,history`;
        
        res = await fetch(url, {
            headers: {
                Authorization: "Basic " + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString("base64"),
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });
 
        if (!res.ok) {
            log(`[Confluence] ✗ Failed to fetch page ${pageID}: ${res.status}`);
            return null;
        }
 
        pageData = await res.json();
        isArchived = pageData.status === 'archived' || pageData.history?.latest === false;
        
        if (isArchived) {
            log(`[Confluence] Page ${pageID} is archived - attempting to extract content`);
        }
 
        // Check for content in various formats (ADF is preferred, then storage, then view)
        if (pageData.body?.atlas_doc_format?.value) {
            bodyContent = pageData.body.atlas_doc_format.value;
            contentFormat = 'atlas_doc_format';
            log(`[Confluence] ✓ Found atlas_doc_format in v1`);
        } else if (pageData.body?.storage?.value) {
            bodyContent = pageData.body.storage.value;
            contentFormat = 'storage';
            log(`[Confluence] ✓ Found storage format in v1`);
        } else if (pageData.body?.view?.value) {
            bodyContent = pageData.body.view.value;
            contentFormat = 'view';
            log(`[Confluence] ✓ Found view format in v1`);
        }
    }
 
    if (!bodyContent) {
        log(`[Confluence] ✗ No body content found for page ${pageID}`);
        return null;
    }
 
    // Convert the page content to readable plain text
    let textContent = '';

    // Handle different content formats: JSON string, HTML, or ADF object
    if (typeof bodyContent === 'string') {
        try {
            const parsed = JSON.parse(bodyContent);
            if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
                textContent = adfToText(parsed);
            } else if (bodyContent.includes('<')) {
                textContent = htmlToText(bodyContent);
            } else {
                textContent = bodyContent;
            }
        } catch (e) {
            // Content is not JSON, handle as HTML or plain text
            if (bodyContent.includes('<')) {
                textContent = htmlToText(bodyContent);
            } else {
                textContent = bodyContent;
            }
        }
    } else if (typeof bodyContent === 'object') {
        textContent = adfToText(bodyContent);
    }
 
    log(`[Confluence] ✓ Page ${pageID} - "${pageData.title}" - ${textContent.length} characters ${isArchived ? '(ARCHIVED)' : ''}`);
 
    return {
        id: pageData.id,
        title: pageData.title,
        spaceKey: pageData.space?.key || pageData.spaceId,
        spaceName: pageData.space?.name,
        version: pageData.version?.number,
        contentFormat: contentFormat,
        textContent: textContent,
        isArchived: isArchived,
        url: `https://${cleanDomain}/wiki/spaces/${pageData.space?.key || pageData.spaceId}/pages/${pageData.id}`,
        metadata: {
            createdBy: pageData.version?.by?.displayName || pageData.authorId,
            createdAt: pageData.version?.when || pageData.createdAt,
            lastModified: pageData.version?.when || pageData.version?.createdAt,
        }
    };
}
 
async function fetchConfluencePageByUrl(pageUrl) {
    log(`[Confluence] Resolving URL: ${pageUrl}`);
    
    try {
        const htmlUrl = pageUrl.startsWith('http') ? pageUrl : `https://${cleanDomain}${pageUrl}`;
        const htmlRes = await fetch(htmlUrl, {
            headers: {
                Authorization: "Basic " + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString("base64"),
            },
            redirect: 'follow'
        });
 
        if (htmlRes.ok) {
            const finalUrl = htmlRes.url;
            log(`[Confluence] Resolved to: ${finalUrl}`);
            
            // Check for archived page in URL
            if (finalUrl.includes('archived=true')) {
                log(`[Confluence] Warning: URL points to archived page`);
            }
            
            const pageIdMatch = finalUrl.match(/\/pages\/(\d+)/) || finalUrl.match(/pageId=(\d+)/);
            if (pageIdMatch) {
                return await fetchConfluencePage(pageIdMatch[1]);
            }
        }
        
        log(`[Confluence] ✗ Could not resolve URL: ${pageUrl}`);
        return null;
    } catch (error) {
        log(`[Confluence] ✗ Error fetching page by URL:`, error.message);
        return null;
    }
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Jira Comment Posting
// Posts test cases and other content as comments on Jira tickets
// ─────────────────────────────────────────────────────────────────────────────

async function postCommentToJira(issueKey, commentText) {
    try {
        log(`[Jira] Posting comment to ${issueKey}...`);
        const url = `https://${cleanDomain}/rest/api/3/issue/${issueKey}/comment`;
        // Format the comment text for Jira's Atlassian Document Format
        const adfComment = {
            body: {
                type: "doc",
                version: 1,
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: commentText
                            }
                        ]
                    }
                ]
            }
        };

        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: "Basic " + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString("base64"),
                "Content-Type": "application/json"
            },
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
        log(`[Jira] Error posting comment:`, error.message);
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

async function postTestCasesToJira({ticket}) {
    log(`\n[Jira] Posting test cases to ticket: ${ticket}\n`);
    const file = path.join(process.cwd(), 'staging', 'test_cases.json');
    if (!fs.existsSync(file)) {
        throw new Error("Test cases file not found at: " + file);
    }
    const testCases = JSON.parse(fs.readFileSync(file, 'utf8'));
    const batchSize = 4; // Post 4 test cases per comment
    const totalBatches = Math.ceil(testCases.length / batchSize);
    
    log(`[Jira] Found ${testCases.length} test cases to post in batches of ${batchSize} (${totalBatches} batch(es))\n`);

    let successCount = 0;
    let failureCount = 0;
    const commentIds = [];
    const errors = [];

    // Post summary comment first
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

    // Post test cases in batches
    for (let i = 0; i < testCases.length; i += batchSize) {
        const batch = testCases.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        let batchComment = `Test Cases Batch ${batchNumber}/${totalBatches}\n`;
        batchComment += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        batchComment += `Test Cases ${i + 1} to ${Math.min(i + batchSize, testCases.length)} of ${testCases.length}\n\n`;

        batch.forEach((tc, idx) => {
            batchComment += formatTestCase(tc, i + idx + 1, testCases.length);
            if (idx < batch.length - 1) {
                batchComment += `\n`;
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

        // Brief pause between batches to respect API rate limits
        if (i + batchSize < testCases.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    const allSuccess = failureCount === 0;
    
    return {
        totalTestCases: testCases.length,
        totalBatches: totalBatches,
        successCount: successCount,
        failureCount: failureCount,
        success: allSuccess,
        commentIds: commentIds,
        error: errors.length > 0 ? errors.join('; ') : undefined
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Ticket Processing
// Orchestrates the collection of all ticket data into a unified bundle
// ─────────────────────────────────────────────────────────────────────────────

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
    }
}
 
async function fetchTicketBundle({ticket}) {
    log(`\n[Jira] Fetching ticket: ${ticket}\n`);
    
    const root = await jira.findIssue(ticket);
    log(`[Jira] ✓ Found ticket: ${root.fields.summary}`);
 
    const linked = await fetchLinkedIssues(root);
    log(`[Jira] ✓ Found ${linked.length} linked issues`);
    
    const attachments = await fetchAttachments(root);
    log(`[Jira] ✓ Found ${attachments.length} attachments`);
    
    const comments = await fetchComments(ticket);
    log(`[Jira] ✓ Found ${comments.length} comments`);
    
    const remoteLinks = await fetchRemoteLinks(ticket);
    log(`[Jira] ✓ Found ${remoteLinks.length} remote links`);
    
    if (!root.fields) {
        root.fields = {};
    }
    root.fields.remotelinks = remoteLinks;

    // Retrieve raw comment data to extract any Confluence page references
    let rawComments = [];
    try {
        const commentUrl = `https://${cleanDomain}/rest/api/3/issue/${ticket}/comment`;
        const commentRes = await fetch(commentUrl, {
            headers: {
                Authorization: "Basic " + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString("base64"),
                "Content-Type": "application/json"
            }
        });
        if (commentRes.ok) {
            const commentData = await commentRes.json();
            rawComments = commentData.comments || [];
        }
    } catch (error) {
        log(`[Confluence] Warning: Could not fetch raw comments for link extraction`);
    }

    const { pageIDs, pageUrls } = extractConfluencePageIds(root, rawComments);
    log(`[Confluence] Found ${pageIDs.length} page IDs and ${pageUrls.length} page URLs\n`);
 
    const confluence = [];
    const processedPageIds = new Set();
    
    // Retrieve Confluence pages by their numeric ID
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
    
    // Retrieve Confluence pages by resolving their URLs
    for (const url of pageUrls) {
        try {
            const page = await fetchConfluencePageByUrl(url);
            if (page && page.textContent) {
                // Check if we already fetched this page by ID
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
 
    const archivedCount = confluence.filter(p => p.isArchived).length;
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
 
// ─────────────────────────────────────────────────────────────────────────────
// MCP Server Configuration
// Sets up the Model Context Protocol server for AI assistant integration
// ─────────────────────────────────────────────────────────────────────────────

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
 
const server = new Server({
    name: "jira-mcp",
    version: "1.3.0",
}, {
    capabilities: {
        tools: {},
    },
});
 
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "fetchTicketBundle",
                description: "Fetch Jira ticket with linked issues, attachments, and Confluence pages (with full text content, including archived pages)",
                inputSchema: {
                    type: "object",
                    properties: {
                        ticket: {
                            type: "string",
                            description: "The ID of the Jira ticket to fetch (e.g., PROJ-123)"
                        }
                    },
                    required: ["ticket"]
                }
            },
            {
                name: "postTestCasesToJira",
                description: "Post test cases from test_cases.json as comments to a Jira ticket",
                inputSchema: {
                    type: "object",
                    properties: {
                        ticket: {
                            type: "string",
                            description: "The Jira ticket ID to post comments to (e.g., PROJ-123)"
                        }
                    },
                    required: ["ticket"]
                }
            }
        ]
    };
});
 
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
 
    if (name === "fetchTicketBundle") {
        try {
            const result = await fetchTicketBundle(args);
            
            const workspaceRoot = process.cwd();
            const stagingDir = path.join(workspaceRoot, 'staging');
            const outputFile = path.join(stagingDir, 'aggregated.json');
            
            if (!fs.existsSync(stagingDir)) {
                fs.mkdirSync(stagingDir, { recursive: true });
            }
            
            fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');
            
            // Create a detailed summary
            const confluenceSummary = result.confluence.map(p =>
                `  - ${p.title} (${p.textContent.length} chars)${p.isArchived ? ' [ARCHIVED]' : ''}`
            ).join('\n');
            
            const summary = `Successfully fetched ticket ${args.ticket}
 
Jira Issue: ${result.root.summary}
Linked Issues: ${result.linked.length}
Attachments: ${result.attachments.length}
Confluence Pages: ${result.confluence.length}${result.metadata.confluenceArchivedCount > 0 ? ` (${result.metadata.confluenceArchivedCount} archived)` : ''}
${result.confluence.length > 0 ? '\nConfluence Pages:\n' + confluenceSummary : ''}
 
Data saved to: staging/aggregated.json`;
            
            return {
                content: [
                    {
                        type: "text",
                        text: summary
                    }
                ]
            };
        } catch (error) {
            log('[Error]', error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    if (name === "postTestCasesToJira") {
        try {
            const result = await postTestCasesToJira(args);
            if (result.success) {
                const summary = `Test Cases Posted to ${args.ticket}

✓ Successfully posted ${result.totalTestCases} test cases in ${result.totalBatches} batch(es) (${result.successCount} test cases)
✓ Posted ${result.commentIds.length} comment(s)
Comment IDs: ${result.commentIds.join(', ')}`;
                return {
                    content: [
                        {
                            type: "text",
                            text: summary
                        }
                    ]
                };
            } else {
                const summary = `Test Cases Posted to ${args.ticket} (Partial Success)

Posted ${result.successCount} of ${result.totalTestCases} test cases in ${result.totalBatches} batch(es)
Failed: ${result.failureCount} test cases
Posted ${result.commentIds.length} comment(s)
Comment IDs: ${result.commentIds.join(', ')}
${result.error ? `\nErrors: ${result.error}` : ''}`;
                return {
                    content: [
                        {
                            type: "text",
                            text: summary
                        }
                    ],
                    isError: result.failureCount === result.totalTestCases
                };
            }
        } catch (error) {
            log('[Error]', error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    throw new Error(`Unknown tool: ${name}`);
});
 
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("Jira MCP server v1.3.0 running on stdio");
}
 
main().catch((error) => {
    log("Fatal error in main():", error);
    process.exit(1);
});