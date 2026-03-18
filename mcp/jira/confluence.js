const {
    log,
    cleanDomain,
    getAuthHeader,
    getJsonHeaders,
    buildConfluenceUrl,
} = require('./client');

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

            case 'heading': {
                const level = node.attrs?.level || 1;
                text += '#'.repeat(level) + ' ';
                if (node.content) {
                    node.content.forEach(traverse);
                }
                text += '\n\n';
                break;
            }

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

function extractAttachmentsFromADF(content) {
    const urls = [];
    if (!content || !Array.isArray(content)) {
        return urls;
    }
    for (const node of content) {
        if (node.type === 'media' && node.attrs?.url) {
            urls.push(node.attrs.url);
        }
        if (node.type === 'attachment' && node.attrs?.url) {
            urls.push(node.attrs.url);
        }
        if (node.content) {
            urls.push(...extractAttachmentsFromADF(node.content));
        }
    }
    return urls;
}

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

async function fetchConfluencePage(pageID) {
    log(`[Confluence] Fetching page ID: ${pageID}`);

    let url = buildConfluenceUrl(`/api/v2/pages/${pageID}?body-format=atlas_doc_format`);

    let res = await fetch(url, {
        headers: {
            ...getJsonHeaders(),
            Accept: 'application/json',
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
            log('[Confluence] ✓ Found content in v2 API (atlas_doc_format)');
        }
    }

    if (!bodyContent) {
        log(`[Confluence] Trying v1 API for page ${pageID}...`);
        url = buildConfluenceUrl(`/rest/api/content/${pageID}?expand=body.atlas_doc_format,body.storage,body.view,version,space,history`);

        res = await fetch(url, {
            headers: {
                ...getJsonHeaders(),
                Accept: 'application/json',
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

        if (pageData.body?.atlas_doc_format?.value) {
            bodyContent = pageData.body.atlas_doc_format.value;
            contentFormat = 'atlas_doc_format';
            log('[Confluence] ✓ Found atlas_doc_format in v1');
        } else if (pageData.body?.storage?.value) {
            bodyContent = pageData.body.storage.value;
            contentFormat = 'storage';
            log('[Confluence] ✓ Found storage format in v1');
        } else if (pageData.body?.view?.value) {
            bodyContent = pageData.body.view.value;
            contentFormat = 'view';
            log('[Confluence] ✓ Found view format in v1');
        }
    }

    if (!bodyContent) {
        log(`[Confluence] ✗ No body content found for page ${pageID}`);
        return null;
    }

    let textContent = '';

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
        } catch (error) {
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
        contentFormat,
        textContent,
        isArchived,
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
                Authorization: getAuthHeader(),
            },
            redirect: 'follow'
        });

        if (htmlRes.ok) {
            const finalUrl = htmlRes.url;
            log(`[Confluence] Resolved to: ${finalUrl}`);

            if (finalUrl.includes('archived=true')) {
                log('[Confluence] Warning: URL points to archived page');
            }

            const pageIdMatch = finalUrl.match(/\/pages\/(\d+)/) || finalUrl.match(/pageId=(\d+)/);
            if (pageIdMatch) {
                return await fetchConfluencePage(pageIdMatch[1]);
            }
        }

        log(`[Confluence] ✗ Could not resolve URL: ${pageUrl}`);
        return null;
    } catch (error) {
        log('[Confluence] ✗ Error fetching page by URL:', error.message);
        return null;
    }
}

module.exports = {
    adfToText,
    htmlToText,
    extractAttachmentsFromADF,
    extractUrlsFromADF,
    extractConfluencePageIds,
    fetchConfluencePage,
    fetchConfluencePageByUrl,
};
