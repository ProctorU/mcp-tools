# Generate Test Cases CSV

## Task
Convert test cases from JSON or Markdown format to CSV format following the Test Case Creation Rules and CSV formatting standards.

## Input Data Sources

1. **Read the test cases** from one of the following locations (in order of priority):
   - `staging/test_cases.json` - JSON array format (primary source)
   - `staging/test_cases.md` - Markdown format (if JSON not available)
   - Check both files and use whichever exists

2. **Read the test case rules** from `config/rules/testcase_rules.md` to understand CSV format requirements and field structure.

## CSV Format Requirements

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
The first row MUST be the header row with column names:
```
Serial no,Title,Test Type,Preconditions,Testing Steps,Expected Result,Created,Reviewer
```

### CSV Formatting Rules

#### Field Delimiter
- Use comma (`,`) as the field delimiter

#### Text Qualifier (Quotes)
- **MANDATORY:** Enclose fields in double quotes (`"`) if they contain:
  - Commas
  - Newlines (line breaks)
  - Double quotes (which must be escaped as `""`)
  - Leading or trailing whitespace
- **RECOMMENDED:** Enclose all fields in double quotes for consistency and safety

#### Escaping Rules
- **Double quotes within fields:** Escape by doubling them (`"` becomes `""`)
- **Newlines within fields:** Preserve as `\n` or actual newlines (both are valid in CSV)
- **Commas within fields:** Must be enclosed in quotes

#### Testing Steps Format
- Preserve numbered steps format (1. Step one\n2. Step two\n3. Step three)
- Keep newlines within the Testing Steps field
- Each step should be on a new line within the quoted field

#### Empty Fields
- If a field is empty or optional (Created, Reviewer), use empty string `""` or leave empty between commas
- Example: `1,Title,Functional,Preconditions,Steps,Result,,` (empty Created and Reviewer)

### CSV Row Format Example
```csv
Serial no,Title,Test Type,Preconditions,Testing Steps,Expected Result,Created,Reviewer
1,"Test Case Title","Functional","Precondition text","1. Step one
2. Step two
3. Step three","Expected result text","November 2025",""
```

## Conversion Process

### Step 1: Read Source File
1. Check if `staging/test_cases.json` exists
   - If yes, read and parse JSON array
   - Each object in the array represents one test case
2. If JSON doesn't exist, check `staging/test_cases.md`
   - Parse Markdown table or structured format
   - Extract test case data from markdown

### Step 2: Parse Test Case Data
For each test case, extract:
- `serial_no` or `Serial no` → CSV column "Serial no"
- `title` or `Title` → CSV column "Title"
- `test_type` or `Test Type` → CSV column "Test Type"
- `preconditions` or `Preconditions` → CSV column "Preconditions"
- `testing_steps` or `Testing Steps` → CSV column "Testing Steps"
- `expected_result` or `Expected Result` → CSV column "Expected Result"
- `created` or `Created` → CSV column "Created" (optional, default to empty)
- `reviewer` or `Reviewer` → CSV column "Reviewer" (optional, default to empty)

### Step 3: CSV Field Formatting
For each field value:
1. **Escape double quotes:** Replace `"` with `""`
2. **Preserve newlines:** Keep `\n` characters in Testing Steps and other multiline fields
3. **Enclose in quotes:** Wrap field in double quotes if it contains:
   - Commas
   - Newlines
   - Double quotes
   - Or for consistency, quote all fields

### Step 4: Generate CSV Content
1. Create header row with column names
2. For each test case:
   - Format each field according to CSV rules
   - Join fields with commas
   - Add as a new row
3. Combine header and data rows

### Step 5: Save CSV File
1. Save the complete CSV content to `staging/test_cases.csv`
2. Ensure proper encoding (UTF-8)
3. Ensure line endings are appropriate for the platform

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

## Markdown to CSV Conversion Details

If reading from Markdown format:
1. Parse markdown table structure
2. Extract rows from table
3. Map markdown table columns to CSV columns
4. Handle markdown formatting (remove markdown syntax, preserve content)

## Output Requirements

1. **Generate the CSV file** with all test cases from the source file
2. **Save the output** to `staging/test_cases.csv`
3. **Ensure completeness:**
   - All test cases from source are included
   - All required columns are present
   - Header row is included
   - Proper CSV formatting (quotes, escaping)
   - Newlines preserved in Testing Steps field
   - Empty optional fields handled correctly

## CSV Quality Checklist

Before finalizing, verify:
- [ ] Header row is present with correct column names
- [ ] All test cases from source are included
- [ ] All fields are properly quoted
- [ ] Double quotes are escaped (`""`)
- [ ] Newlines are preserved in Testing Steps field
- [ ] Commas within fields are handled correctly
- [ ] Empty fields (Created, Reviewer) are handled correctly
- [ ] CSV file is valid and can be opened in Excel/Google Sheets
- [ ] All 8 columns are present
- [ ] Column order matches: Serial no, Title, Test Type, Preconditions, Testing Steps, Expected Result, Created, Reviewer

## Instructions

1. **Read the source file:**
   - Check `staging/test_cases.json` first (primary source)
   - If not found, check `staging/test_cases.md`
   - Use whichever file exists
2. **Read `config/rules/testcase_rules.md`** to understand CSV format requirements
3. **Parse the source file:**
   - If JSON: Parse JSON array and extract test case objects
   - If Markdown: Parse markdown table or structured format
4. **Convert each test case to CSV row:**
   - Map fields from source format to CSV columns
   - Format fields according to CSV rules (quotes, escaping)
   - Preserve newlines in Testing Steps field
   - Handle empty optional fields
5. **Generate CSV content:**
   - Create header row
   - Add data rows for each test case
   - Ensure proper CSV formatting
6. **Save the complete CSV file** to `staging/test_cases.csv`

## CSV Formatting Example

### Input (JSON):
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

### Output (CSV Row):
```csv
1,"Connect and New Test Taker Button Functionality","Functional","CJS Home Page should be loaded with valid credentials","1. Click 'Connect' button
2. Verify 'Developers Info' title
3. Click 'New Test Taker' button","Connect button should process the connection and display 'Developers Info' title","November 2025",""
```

**Remember:** The CSV file must be properly formatted with correct quoting, escaping, and newline handling. All test cases from the source file must be included. The CSV should be valid and openable in standard spreadsheet applications like Excel or Google Sheets.

