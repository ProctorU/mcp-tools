// ─────────────────────────────────────────────────────────────────────────────
// Semantic Chunking
// Converts aggregated.json into typed, metadata-rich chunks for embedding.
// Handles ADF (Atlassian Document Format) descriptions, acceptance criteria
// extraction, and all source types (jira, confluence, rovo).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively extracts plain text from an ADF (Atlassian Document Format) node.
 */
function adfToText(adfNode) {
    if (!adfNode) return "";
    if (typeof adfNode === "string") return adfNode;
    if (adfNode.type === "text") return adfNode.text || "";

    if (!adfNode.content || !Array.isArray(adfNode.content)) return "";

    return adfNode.content
        .map((child) => {
            if (child.type === "hardBreak") return "\n";
            if (child.type === "paragraph") return adfToText(child) + "\n";
            if (child.type === "heading") return adfToText(child) + "\n";
            if (child.type === "bulletList" || child.type === "orderedList") {
                return child.content
                    .map((li) => "- " + adfToText(li))
                    .join("\n") + "\n";
            }
            if (child.type === "listItem") return adfToText(child);
            if (child.type === "codeBlock") {
                return "```\n" + adfToText(child) + "\n```\n";
            }
            if (child.type === "table") {
                return child.content
                    .map((row) =>
                        row.content
                            .map((cell) => adfToText(cell))
                            .join(" | ")
                    )
                    .join("\n") + "\n";
            }
            return adfToText(child);
        })
        .join("")
        .trim();
}

/**
 * Walks the ADF tree to find sections headed "Acceptance Criteria" (or "AC")
 * and returns the content below each as separate strings.
 */
function extractAcceptanceCriteria(adfDescription) {
    if (!adfDescription || !adfDescription.content) return [];

    const criteria = [];
    let capturing = false;
    let currentAc = [];

    for (const node of adfDescription.content) {
        const isHeading = node.type === "heading";
        if (isHeading) {
            const headingText = adfToText(node).toLowerCase();
            if (
                headingText.includes("acceptance criteria") ||
                headingText.includes("acceptance criterion") ||
                /^\s*ac\s*$/i.test(headingText) ||
                /^\s*ac\s*:/i.test(headingText)
            ) {
                if (currentAc.length > 0) {
                    criteria.push(currentAc.join("\n").trim());
                }
                currentAc = [];
                capturing = true;
                continue;
            } else if (capturing) {
                criteria.push(currentAc.join("\n").trim());
                currentAc = [];
                capturing = false;
            }
        }

        if (capturing) {
            const text = adfToText(node);
            if (text) currentAc.push(text);
        }
    }

    if (capturing && currentAc.length > 0) {
        criteria.push(currentAc.join("\n").trim());
    }

    // If a single block was captured, try splitting by list items
    if (criteria.length === 1) {
        const lines = criteria[0].split(/\n/).filter((l) => l.trim());
        if (lines.length > 1 && lines.every((l) => l.startsWith("- "))) {
            return lines.map((l) => l.replace(/^- /, "").trim());
        }
    }

    return criteria.filter((c) => c.length > 0);
}

/**
 * Resolves the team for a ticket from the aggregated data.
 * Fallback: team field → components[0] → "unassigned"
 */
function getTeamForTicket(aggregated) {
    return (
        aggregated.root.team?.toLowerCase() ||
        aggregated.root.components?.[0]?.toLowerCase() ||
        "unassigned"
    );
}

/**
 * Splits markdown/text content by heading boundaries for Confluence pages.
 * Handles all heading levels (# through ####) and falls back to
 * paragraph-based splitting for long unstructured content.
 */
function splitByHeadings(text) {
    if (!text) return [];

    const sections = text
        .split(/\n(?=#{1,4} )/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20);

    if (sections.length > 1) return sections;

    if (text.length > 1500) {
        const paragraphs = text.split(/\n{2,}/);
        const merged = [];
        let current = "";
        for (const p of paragraphs) {
            if (current.length + p.length > 1200 && current.length > 0) {
                merged.push(current.trim());
                current = p;
            } else {
                current += (current ? "\n\n" : "") + p;
            }
        }
        if (current.trim()) merged.push(current.trim());
        return merged.filter((s) => s.length > 20);
    }

    return sections.length > 0 ? sections : (text.length > 20 ? [text] : []);
}

/**
 * Splits text into sub-chunks when it exceeds maxLen, breaking on
 * paragraph boundaries to preserve readability.
 */
function splitLongText(text, maxLen = 1200) {
    if (!text || text.length <= maxLen) return [text];
    const paragraphs = text.split(/\n{2,}/);
    const parts = [];
    let current = "";
    for (const p of paragraphs) {
        if (current.length + p.length > maxLen && current.length > 0) {
            parts.push(current.trim());
            current = p;
        } else {
            current += (current ? "\n\n" : "") + p;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

function getAttachmentMimeType(attachment = {}) {
    return attachment.mimeType || attachment.contentType || attachment.type || "";
}

function getAttachmentTextContent(attachment = {}) {
    const textFields = [
        "textContent",
        "text",
        "extractedText",
        "ocrText",
        "summary",
        "content",
    ];

    for (const field of textFields) {
        const value = attachment?.[field];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return "";
}

function getAttachmentChunkType(attachment = {}) {
    const mimeType = getAttachmentMimeType(attachment).toLowerCase();
    const filename = (attachment.filename || "").toLowerCase();
    const isImage = mimeType.startsWith("image/")
        || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(filename);

    if (isImage) return "attachment_image";
    if (getAttachmentTextContent(attachment)) return "attachment_text";
    return "attachment_reference";
}

function buildAttachmentChunkText(attachment, contextLabel) {
    const filename = attachment.filename || "unnamed attachment";
    const mimeType = getAttachmentMimeType(attachment) || "unknown";
    const extractedText = getAttachmentTextContent(attachment);
    const chunkType = getAttachmentChunkType(attachment);
    const lines = [
        `Attachment: ${filename}`,
        `Context: ${contextLabel}`,
        `MIME type: ${mimeType}`,
    ];

    if (attachment.url) {
        lines.push(`URL: ${attachment.url}`);
    }

    if (chunkType === "attachment_image") {
        lines.push("Attachment kind: image or screenshot");
        lines.push("Potential value: UI labels, layout, visual states, or design cues.");
    }

    if (attachment.base64 && !extractedText) {
        lines.push("Binary payload exists in aggregated.json but is not embedded in the vector store.");
    }

    if (extractedText) {
        lines.push("Extracted attachment text:");
        lines.push(extractedText);
    }

    return lines.join("\n");
}

/**
 * Converts an aggregated.json bundle into an array of typed chunks.
 * Each chunk has: id, hash (added later), project, team, type, source,
 * ticket, pageId, linkedFrom, timestamp, lastFetched, text.
 *
 * Generates rich, granular chunks so that SRS, UI, test case, and
 * subtask generation queries can retrieve comprehensive context.
 */
function chunkAggregatedJSON(aggregated, project) {
    const chunks = [];
    const team = getTeamForTicket(aggregated);
    const ticketKey = aggregated.root.key;

    const base = {
        project,
        team,
        ticket: ticketKey,
        timestamp: aggregated.metadata?.fetchedAt || new Date().toISOString(),
        linkedFrom: [ticketKey],
    };

    // 0. Ticket metadata (summary, status, type, labels) — always retrievable
    const metaParts = [
        `Ticket: ${ticketKey}`,
        `Summary: ${aggregated.root.summary || ""}`,
        aggregated.root.issueType ? `Type: ${aggregated.root.issueType}` : "",
        aggregated.root.status ? `Status: ${aggregated.root.status}` : "",
        (aggregated.root.labels || []).length > 0
            ? `Labels: ${aggregated.root.labels.join(", ")}`
            : "",
        (aggregated.root.components || []).length > 0
            ? `Components: ${aggregated.root.components.join(", ")}`
            : "",
    ].filter(Boolean);

    chunks.push({
        ...base,
        id: `${ticketKey}_metadata`,
        type: "description",
        source: "jira",
        text: metaParts.join("\n"),
    });

    // 1. Main ticket description (ADF → plain text), split if long
    const descriptionText = adfToText(aggregated.root.description);
    if (descriptionText) {
        const fullDesc = `${aggregated.root.summary}\n\n${descriptionText}`;
        const descParts = splitLongText(fullDesc);
        descParts.forEach((part, i) => {
            chunks.push({
                ...base,
                id: `${ticketKey}_description${descParts.length > 1 ? `_${i}` : ""}`,
                type: "description",
                source: "jira",
                text: part,
            });
        });
    }

    // 2. Acceptance criteria — extracted from ADF description
    const acList = extractAcceptanceCriteria(aggregated.root.description);
    if (acList.length > 0) {
        chunks.push({
            ...base,
            id: `${ticketKey}_acceptance_criteria_combined`,
            type: "acceptance_criteria",
            source: "jira",
            text: `Acceptance Criteria for ${ticketKey}:\n` + acList.map((ac, i) => `${i + 1}. ${ac}`).join("\n"),
        });

        acList.forEach((ac, i) => {
            chunks.push({
                ...base,
                id: `${ticketKey}_acceptance_criteria_${i}`,
                type: "acceptance_criteria",
                source: "jira",
                text: ac,
            });
        });
    }

    // 3. Comments — one chunk per comment
    (aggregated.comments || []).forEach((comment, i) => {
        const body =
            typeof comment.body === "string"
                ? comment.body
                : adfToText(comment.body);
        const author = comment.author?.displayName || comment.author || "";
        if (body && body.trim().length > 10) {
            chunks.push({
                ...base,
                id: `${ticketKey}_comment_${i}`,
                type: "comment",
                source: "jira",
                text: author ? `[${author}]: ${body}` : body,
            });
        }

        (comment.attachments || []).forEach((attachment, j) => {
            const text = buildAttachmentChunkText(
                attachment,
                `Comment attachment${author ? ` from ${author}` : ""}`
            );
            const parts = splitLongText(text);
            const type = getAttachmentChunkType(attachment);

            parts.forEach((part, partIndex) => {
                chunks.push({
                    ...base,
                    id: `${ticketKey}_comment_${i}_attachment_${j}${parts.length > 1 ? `_${partIndex}` : ""}`,
                    type,
                    source: "attachment",
                    commentId: comment.id,
                    attachmentName: attachment.filename,
                    mimeType: getAttachmentMimeType(attachment),
                    text: part,
                });
            });
        });
    });

    // 4. Root-ticket attachments — one chunk per attachment
    (aggregated.attachments || []).forEach((attachment, i) => {
        const text = buildAttachmentChunkText(attachment, "Root ticket attachment");
        const parts = splitLongText(text);
        const type = getAttachmentChunkType(attachment);

        parts.forEach((part, partIndex) => {
            chunks.push({
                ...base,
                id: `${ticketKey}_attachment_${i}${parts.length > 1 ? `_${partIndex}` : ""}`,
                type,
                source: "attachment",
                attachmentName: attachment.filename,
                mimeType: getAttachmentMimeType(attachment),
                text: part,
            });
        });
    });

    // 5. Linked tickets — one summary chunk per linked ticket
    (aggregated.linked || []).forEach((linked) => {
        const linkedDesc =
            typeof linked.description === "string"
                ? linked.description
                : adfToText(linked.description);
        const linkType = linked.linkType || linked.relationship || "";
        const typeSuffix = linkType ? ` (${linkType})` : "";
        chunks.push({
            ...base,
            id: `${ticketKey}_linked_${linked.key}`,
            type: linked.issueType === "Bug"
                ? "bug_ticket"
                : "linked_ticket_summary",
            source: "jira",
            linkedTicket: linked.key,
            text: `Linked${typeSuffix}: ${linked.key} — ${linked.summary}\n${linkedDesc || ""}`.trim(),
        });
    });

    // 6. Confluence pages — chunk by heading/section
    (aggregated.confluence || []).forEach((page) => {
        const content = page.textContent || page.content || "";

        if (page.title && content.length > 20) {
            chunks.push({
                ...base,
                id: `confluence_${page.id}_title`,
                type: page.title?.toLowerCase().includes("ui")
                    ? "ui_notes"
                    : "confluence_section",
                source: "confluence",
                pageId: page.id,
                text: `Confluence: ${page.title}\n\n${content.substring(0, 500)}`,
            });
        }

        const sections = splitByHeadings(content);
        if (sections.length === 0 && content.length > 20) {
            sections.push(content);
        }
        sections.forEach((section, i) => {
            chunks.push({
                ...base,
                id: `confluence_${page.id}_section_${i}`,
                type: page.title?.toLowerCase().includes("ui")
                    ? "ui_notes"
                    : "confluence_section",
                source: "confluence",
                pageId: page.id,
                text: section,
            });
        });
    });

    // 7. Rovo context — one chunk per result, with duplicate guards
    const existingIssueKeys = new Set([
        ticketKey,
        ...(aggregated.linked || []).map((linked) => linked.key).filter(Boolean),
    ]);
    const existingPageIds = new Set(
        (aggregated.confluence || []).map((page) => String(page.id)).filter(Boolean)
    );
    const seenRovoChunkIds = new Set();

    (aggregated.rovoContext || []).forEach((item, i) => {
        const isPage = item.type === "page";
        const itemPageId = item.pageId || item.id;
        const itemIssueKey = item.issueKey || item.id;
        const text = isPage && (item.textContent != null && item.textContent !== "")
            ? item.textContent
            : item.content;
        if (!text || text.trim().length <= 10) return;

        if (isPage && itemPageId && existingPageIds.has(String(itemPageId))) return;
        if (!isPage && itemIssueKey && existingIssueKeys.has(String(itemIssueKey))) return;

        const stableId = isPage
            ? `${ticketKey}_rovo_page_${String(itemPageId || i)}`
            : `${ticketKey}_rovo_ticket_${String(itemIssueKey || i)}`;

        if (seenRovoChunkIds.has(stableId)) return;
        seenRovoChunkIds.add(stableId);

        chunks.push({
            ...base,
            id: stableId,
            type: isPage ? "rovo_related_page" : "rovo_related_ticket",
            source: "rovo",
            pageId: isPage && itemPageId ? String(itemPageId) : undefined,
            linkedTicket: !isPage && itemIssueKey ? String(itemIssueKey) : undefined,
            text,
        });
    });

    return chunks;
}

module.exports = {
    adfToText,
    extractAcceptanceCriteria,
    getTeamForTicket,
    chunkAggregatedJSON,
    splitByHeadings,
    splitLongText,
};
