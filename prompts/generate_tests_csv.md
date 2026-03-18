# Generate Test Cases CSV

## Task
Convert test cases from JSON, Markdown, or Gherkin `.feature` format to CSV format following the Test Case Creation Rules and CSV formatting standards.

## Input Data Sources

1. **Read the test cases** from one of the following locations (in order of priority):
   - `staging/test_cases.feature` - Gherkin BDD format (check FIRST — used for QUANT- tickets)
   - `staging/test_cases.json` - JSON array format (standard format)
   - `staging/test_cases.md` - Markdown format (fallback)
   - Check all three files and use the first one that exists

2. **Read the test case rules** from `config/rules/testcase_rules.md` to understand CSV format requirements and field structure.
3. **Read the minimum metadata needed for archive output** from `staging/aggregated.json`:
   - `root.key`
   - `root.team` if present, otherwise `root.components[0]`, otherwise use `unassigned`; normalize the team folder to lowercase kebab-case for `docs/teams/<team>/...`

---

## Step 0: Detect Source Format

Check which source file exists (in order):

1. **If `staging/test_cases.feature` exists** → the source is **Gherkin BDD format**. Use the **Gherkin CSV columns and mapping** described in the "Gherkin to CSV" section below.
2. **If `staging/test_cases.json` exists** → the source is **Standard JSON format**. Use the standard CSV columns and mapping described in the "JSON to CSV" section below.
3. **If `staging/test_cases.md` exists** → the source is **Markdown format**. Use the "Markdown to CSV" section below.

---

## CSV Format A: Standard Columns (for JSON / Markdown sources)

### Required CSV Columns
The CSV file MUST include the following columns in this exact order:
1. **Serial no** - Sequential numbering (1, 2, 3...)
2. **Title** - Clear, descriptive test case name
3. **Test Type** - One of: Functional, Negative, UI/UX, Performance, Compatibility, Accessibility, Security, Error Handling
4. **Preconditions** - Prerequisites before test execution
5. **Testing Steps** - Detailed step-by-step instructions (numbered 1, 2, 3...)
6. **Expected Result** - Clear expected outcome
7. **Created** - Date/Author (optional, can be empty)
8. **Reviewer** - Review status (optional, can be empty)

### CSV Header Row
```
Serial no,Title,Test Type,Preconditions,Testing Steps,Expected Result,Created,Reviewer
```

---

## CSV Format B: Gherkin Columns (for `.feature` sources)

### Required CSV Columns
The CSV file MUST include the following columns in this exact order:
1. **Serial no** - Sequential numbering (1, 2, 3...) — one per Scenario
2. **Feature** - The Feature title from the `.feature` file (same for all rows)
3. **Background** - The Background steps from the `.feature` file (same for all rows, joined with newlines)
4. **Scenario** - The Scenario title
5. **Steps** - All Given/When/Then/And/But steps for this Scenario, joined with newlines

### CSV Header Row
```
Serial no,Feature,Background,Scenario,Steps
```

---

## CSV Formatting Rules (apply to BOTH formats)

### Field Delimiter
- Use comma (`,`) as the field delimiter

### Text Qualifier (Quotes)
- **MANDATORY:** Enclose fields in double quotes (`"`) if they contain:
  - Commas
  - Newlines (line breaks)
  - Double quotes (which must be escaped as `""`)
  - Leading or trailing whitespace
- **RECOMMENDED:** Enclose all fields in double quotes for consistency and safety

### Escaping Rules
- **Double quotes within fields:** Escape by doubling them (`"` becomes `""`)
- **Newlines within fields:** Preserve as `\n` or actual newlines (both are valid in CSV)
- **Commas within fields:** Must be enclosed in quotes

### Empty Fields
- If a field is empty or optional, use empty string `""` or leave empty between commas

---

## Gherkin to CSV Conversion Details

### Parsing the `.feature` File

1. **Extract the Feature line:** The line starting with `Feature:` — everything after the colon is the Feature title.
2. **Extract Background steps:** All indented lines between `Background:` and the first `Scenario:`. Each line is a step (Given, And, etc.). Join all steps with newlines.
3. **Extract each Scenario:** For each `Scenario:` block:
   - The Scenario title is everything after `Scenario:` on that line
   - The steps are all indented Given/When/Then/And/But lines until the next Scenario or end of file
   - Join all steps for the scenario with newlines
4. **Assign serial numbers:** Number scenarios sequentially starting from 1.

### Gherkin Field Mapping

| `.feature` element | CSV Column |
|---------------------|------------|
| Scenario index (1, 2, 3...) | Serial no |
| `Feature:` title | Feature |
| `Background:` steps (joined with `\n`) | Background |
| `Scenario:` title | Scenario |
| Given/When/Then/And/But steps (joined with `\n`) | Steps |

### Gherkin CSV Example

#### Input (`staging/test_cases.feature`):
```gherkin
Feature: Unified Re-score Modal

Background:
  Given I am logged in as an admin user
  And the simplified rescoring feature flag is enabled for the account
  And an exam exists with completed results
  And I am on the Exam Shell "Review" tab

Scenario: Unified Re-score button is visible when feature flag is enabled
  Given the simplified rescoring feature flag is enabled
  When I view the Exam Shell "Review" tab
  Then I should see a new "Re-score" button
  And the button should appear below the existing "Rescore" button

Scenario: Modal can be closed using Cancel button
  Given the Unified Re-score modal is open
  When I click the "Cancel" button
  Then the modal should close
  And no changes should be made to the exam
  And the original exam state should remain unchanged
```

#### Output (`staging/test_cases.csv`):
```csv
Serial no,Feature,Background,Scenario,Steps
1,"Unified Re-score Modal","Given I am logged in as an admin user
And the simplified rescoring feature flag is enabled for the account
And an exam exists with completed results
And I am on the Exam Shell ""Review"" tab","Unified Re-score button is visible when feature flag is enabled","Given the simplified rescoring feature flag is enabled
When I view the Exam Shell ""Review"" tab
Then I should see a new ""Re-score"" button
And the button should appear below the existing ""Rescore"" button"
2,"Unified Re-score Modal","Given I am logged in as an admin user
And the simplified rescoring feature flag is enabled for the account
And an exam exists with completed results
And I am on the Exam Shell ""Review"" tab","Modal can be closed using Cancel button","Given the Unified Re-score modal is open
When I click the ""Cancel"" button
Then the modal should close
And no changes should be made to the exam
And the original exam state should remain unchanged"
```

---

## JSON to CSV Conversion Details

### JSON Structure Expected
```json
[
  {
    "serial_no": 1,
    "title": "Test Case Title",
    "test_type": "Functional",
    "preconditions": "Precondition text",
    "testing_steps": "1. Step one\n2. Step two\n3. Step three",
    "expected_result": "Expected result text",
    "created": "November 2025",
    "reviewer": ""
  }
]
```

### Field Mapping
- `serial_no` → `Serial no`
- `title` → `Title`
- `test_type` → `Test Type`
- `preconditions` → `Preconditions`
- `testing_steps` → `Testing Steps` (preserve `\n` as newlines)
- `expected_result` → `Expected Result`
- `created` → `Created` (use empty string if missing)
- `reviewer` → `Reviewer` (use empty string if missing)

### Standard CSV Example

#### Input (JSON):
```json
{
  "serial_no": 1,
  "title": "Connect and New Test Taker Button Functionality",
  "test_type": "Functional",
  "preconditions": "CJS Home Page should be loaded with valid credentials",
  "testing_steps": "1. Click 'Connect' button\n2. Verify 'Developers Info' title\n3. Click 'New Test Taker' button",
  "expected_result": "Connect button should process the connection and display 'Developers Info' title",
  "created": "November 2025",
  "reviewer": ""
}
```

#### Output (CSV Row):
```csv
1,"Connect and New Test Taker Button Functionality","Functional","CJS Home Page should be loaded with valid credentials","1. Click 'Connect' button
2. Verify 'Developers Info' title
3. Click 'New Test Taker' button","Connect button should process the connection and display 'Developers Info' title","November 2025",""
```

---

## Markdown to CSV Conversion Details

If reading from Markdown format:
1. Parse markdown table structure
2. Extract rows from table
3. Map markdown table columns to CSV columns
4. Handle markdown formatting (remove markdown syntax, preserve content)

---

## Conversion Process

### Step 1: Detect and Read Source File
1. Check if `staging/test_cases.feature` exists → **Gherkin source**
2. If not, check if `staging/test_cases.json` exists → **JSON source**
3. If not, check `staging/test_cases.md` → **Markdown source**
4. Use the first file that exists

### Step 2: Parse Test Case Data
- **If Gherkin:** Extract Feature title, Background steps, and each Scenario (title + steps) as described in the Gherkin parsing section
- **If JSON:** Parse JSON array and extract fields (`serial_no`, `title`, `test_type`, etc.)
- **If Markdown:** Parse markdown table and extract rows

### Step 3: CSV Field Formatting
For each field value:
1. **Escape double quotes:** Replace `"` with `""`
2. **Preserve newlines:** Keep `\n` characters in multiline fields (Steps, Background, Testing Steps)
3. **Enclose in quotes:** Wrap field in double quotes if it contains commas, newlines, or double quotes. For consistency, quote all fields.

### Step 4: Generate CSV Content
1. **Choose the correct header row** based on source format:
   - Gherkin → `Serial no,Feature,Background,Scenario,Steps`
   - JSON/Markdown → `Serial no,Title,Test Type,Preconditions,Testing Steps,Expected Result,Created,Reviewer`
2. For each test case / scenario:
   - Format each field according to CSV rules
   - Join fields with commas
   - Add as a new row
3. Combine header and data rows

### Step 5: Save CSV File
1. Save the complete CSV content to `staging/test_cases.csv`
2. Save the same CSV content to `docs/teams/<team>/<ticket>/test_cases.csv`
3. Ensure proper encoding (UTF-8)
4. Ensure line endings are appropriate for the platform

---

## Output Requirements

1. **Generate the CSV file** with all test cases / scenarios from the source file
2. **Save the output** to both `staging/test_cases.csv` and `docs/teams/<team>/<ticket>/test_cases.csv`
3. **Ensure completeness:**
   - All test cases / scenarios from source are included
   - All required columns are present (5 for Gherkin, 8 for standard)
   - Header row is included with correct column names for the format
   - Proper CSV formatting (quotes, escaping)
   - Newlines preserved in Steps / Testing Steps fields
   - Empty optional fields handled correctly

## CSV Quality Checklist

Before finalizing, verify:
- [ ] Header row is present with correct column names **for the detected format**
- [ ] All test cases / scenarios from source are included
- [ ] All fields are properly quoted
- [ ] Double quotes are escaped (`""`)
- [ ] Newlines are preserved in Steps / Testing Steps fields
- [ ] Commas within fields are handled correctly
- [ ] Empty fields are handled correctly
- [ ] CSV file is valid and can be opened in Excel/Google Sheets
- [ ] Column order matches the correct format (Gherkin 5-column or Standard 8-column)

## Instructions

1. **Detect and read the source file:**
   - Check `staging/test_cases.feature` first (Gherkin BDD format)
   - If not found, check `staging/test_cases.json` (standard JSON format)
   - If not found, check `staging/test_cases.md` (Markdown format)
   - Use the first file that exists
2. **Read `config/rules/testcase_rules.md`** to understand CSV format requirements
3. **Parse the source file** according to its format (Gherkin, JSON, or Markdown)
4. **Convert to CSV** using the correct column mapping for the detected format
5. **Generate CSV content** with the correct header row and data rows
6. **Save the complete CSV file** to both `staging/test_cases.csv` and `docs/teams/<team>/<ticket>/test_cases.csv`

**Remember:** The CSV file must be properly formatted with correct quoting, escaping, and newline handling. All test cases / scenarios from the source file must be included. The CSV should be valid and openable in standard spreadsheet applications like Excel or Google Sheets.

