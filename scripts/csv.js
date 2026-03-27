"use strict";
	

const { convertTestCasesToCsv } = require("../mcp/common/csv-converter");

try {
    const result = convertTestCasesToCsv();
    console.log(`Test cases converted to CSV`);
    console.log(`Source file: ${result.sourceFile}`);
    console.log(`Staging destination: ${result.stagingDest}`);
    console.log(`Docs destination: ${result.docsDest}`);

} catch (error) {
    console.error(`Error converting test cases to CSV: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
}
