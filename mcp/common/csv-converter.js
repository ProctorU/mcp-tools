const fs = require("fs");
const {
    getStagingPath,
    getTicketDocPath,
    sanitizeTeamFolder,
    sanitizeTicketFolder,
} = require("./paths");

// ---------------------------------------------------------------------------
// RFC 4180 CSV helpers
// ---------------------------------------------------------------------------

function csvField(value) {
    const str = value == null ? "" : String(value);
    // Always quote every field for safety (commas, newlines, quotes inside)
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
}

function csvRow(fields) {
    return fields.map(csvField).join(",");
}

// ---------------------------------------------------------------------------
// Gherkin (.feature) parser
// ---------------------------------------------------------------------------

function parseGherkin(content) {
    const lines = content.split(/\r?\n/);

    let featureTitle = "";
    let backgroundSteps = [];
    const scenarios = [];

    let mode = null; // "background" | "scenario"
    let currentScenario = null;

    for (const raw of lines) {
        const line = raw.trim();

        if (line.startsWith("Feature:")) {
            featureTitle = line.replace(/^Feature:\s*/, "").trim();
            mode = null;
            continue;
        }

        if (line.startsWith("Background:")) {
            mode = "background";
            backgroundSteps = [];
            continue;
        }

        if (line.startsWith("Scenario:") || line.startsWith("Scenario Outline:")) {
            if (currentScenario) {
                scenarios.push(currentScenario);
            }
            const title = line.replace(/^Scenario(?: Outline)?:\s*/, "").trim();
            currentScenario = { title, steps: [] };
            mode = "scenario";
            continue;
        }

        // Step lines: Given, When, Then, And, But
        const isStep = /^(Given|When|Then|And|But)\b/.test(line);

        if (mode === "background" && isStep) {
            backgroundSteps.push(line);
            continue;
        }

        if (mode === "scenario" && currentScenario && isStep) {
            currentScenario.steps.push(line);
            continue;
        }
    }

    if (currentScenario) {
        scenarios.push(currentScenario);
    }

    return { featureTitle, backgroundSteps, scenarios };
}

function gherkinToCsv(content) {
    const { featureTitle, backgroundSteps, scenarios } = parseGherkin(content);
    const backgroundText = backgroundSteps.join("\n");

    const header = csvRow(["Serial no", "Feature", "Background", "Scenario", "Steps"]);
    const rows = scenarios.map((scenario, idx) =>
        csvRow([
            String(idx + 1),
            featureTitle,
            backgroundText,
            scenario.title,
            scenario.steps.join("\n"),
        ])
    );

    return [header, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// JSON parser
// ---------------------------------------------------------------------------

function jsonToCsv(content) {
    const data = JSON.parse(content);
    const arr = Array.isArray(data) ? data : [data];

    const header = csvRow([
        "Serial no",
        "Title",
        "Test Type",
        "Preconditions",
        "Testing Steps",
        "Expected Result",
        "Created",
        "Reviewer",
    ]);

    const rows = arr.map((tc) =>
        csvRow([
            tc.serial_no != null ? String(tc.serial_no) : "",
            tc.title || "",
            tc.test_type || "",
            tc.preconditions || "",
            tc.testing_steps || "",
            tc.expected_result || "",
            tc.created || "",
            tc.reviewer || "",
        ])
    );

    return [header, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Markdown table parser
// ---------------------------------------------------------------------------

function markdownToCsv(content) {
    const lines = content.split(/\r?\n/);

    // Find the first table header row
    const headerLineIdx = lines.findIndex((l) => l.trim().startsWith("|"));
    if (headerLineIdx === -1) {
        throw new Error("No markdown table found in test_cases.md");
    }

    const parseTableRow = (line) =>
        line
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim());

    const headerCells = parseTableRow(lines[headerLineIdx]);

    // Map known markdown column names to standard CSV columns (case-insensitive)
    const colMap = {
        "serial no": "Serial no",
        "serial_no": "Serial no",
        "#": "Serial no",
        "title": "Title",
        "test type": "Test Type",
        "test_type": "Test Type",
        "type": "Test Type",
        "preconditions": "Preconditions",
        "precondition": "Preconditions",
        "testing steps": "Testing Steps",
        "testing_steps": "Testing Steps",
        "steps": "Testing Steps",
        "expected result": "Expected Result",
        "expected_result": "Expected Result",
        "expected": "Expected Result",
        "created": "Created",
        "reviewer": "Reviewer",
    };

    const csvColumns = [
        "Serial no",
        "Title",
        "Test Type",
        "Preconditions",
        "Testing Steps",
        "Expected Result",
        "Created",
        "Reviewer",
    ];

    // Map header index -> CSV column name
    const colIndexMap = headerCells.map((h) => colMap[h.toLowerCase()] || h);

    const header = csvRow(csvColumns);

    const dataRows = [];
    for (let i = headerLineIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith("|")) break; // end of table
        if (/^\|[-| :]+\|$/.test(line)) continue; // separator row

        const cells = parseTableRow(line);
        const rowObj = {};
        colIndexMap.forEach((col, idx) => {
            rowObj[col] = cells[idx] || "";
        });

        dataRows.push(
            csvRow(csvColumns.map((col) => rowObj[col] || ""))
        );
    }

    return [header, ...dataRows].join("\n");
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

function resolveTeamAndTicket() {
    const aggregatedPath = getStagingPath("aggregated.json");
    if (!fs.existsSync(aggregatedPath)) {
        throw new Error("staging/aggregated.json not found. Run fetch-jira first.");
    }

    const aggregated = JSON.parse(fs.readFileSync(aggregatedPath, "utf8"));
    const root = aggregated.root || {};

    const ticket = sanitizeTicketFolder(root.key);
    const rawTeam = root.team || (root.components && root.components[0]) || "unassigned";
    const team = sanitizeTeamFolder(rawTeam);

    return { team, ticket };
}

function convertTestCasesToCsv() {
    const { team, ticket } = resolveTeamAndTicket();

    // Detect source format
    const featurePath = getStagingPath("test_cases.feature");
    const jsonPath = getStagingPath("test_cases.json");
    const mdPath = getStagingPath("test_cases.md");

    let csvContent;
    let sourceFile;

    if (fs.existsSync(featurePath)) {
        sourceFile = featurePath;
        csvContent = gherkinToCsv(fs.readFileSync(featurePath, "utf8"));
    } else if (fs.existsSync(jsonPath)) {
        sourceFile = jsonPath;
        csvContent = jsonToCsv(fs.readFileSync(jsonPath, "utf8"));
    } else if (fs.existsSync(mdPath)) {
        sourceFile = mdPath;
        csvContent = markdownToCsv(fs.readFileSync(mdPath, "utf8"));
    } else {
        throw new Error(
            "No test case source file found. Expected one of: staging/test_cases.feature, staging/test_cases.json, staging/test_cases.md"
        );
    }

    // Write to staging
    const stagingDest = getStagingPath("test_cases.csv");
    fs.writeFileSync(stagingDest, csvContent, "utf8");

    // Write to docs/teams/<team>/<ticket>/
    const { mkdirSync } = require("fs");
    const docsDest = getTicketDocPath(team, ticket, "test_cases.csv");
    const docsDir = require("path").dirname(docsDest);
    mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(docsDest, csvContent, "utf8");

    return {
        sourceFile,
        team,
        ticket,
        stagingDest,
        docsDest,
    };
}

module.exports = { convertTestCasesToCsv, parseGherkin, gherkinToCsv, jsonToCsv, markdownToCsv };
