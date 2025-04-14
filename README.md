# MISMO Parser

This project provides a TypeScript implementation of a parser that converts MISMO-format XML loan data into structured JSON.

## Overview

The parser converts complex, hierarchical mortgage loan XML data (conforming to MISMO - Mortgage Industry Standards Maintenance Organization standards) into a standardized, well-structured format that's easier to work with programmatically or view as human-readable documentation.

## Features

- Parses MISMO-format XML loan data
- Extracts key loan information including property, loan terms, borrower data, etc.
- Handles ULDD loan files
- Strong TypeScript typing with interface definitions
- Comprehensive test suite with over 75% code coverage

## Installation

```bash
# Install dependencies
npm install
```

## Usage

### Using the Parser in TypeScript

```typescript
import { parseXmlToJson } from './src/mismoParser';
import * as fs from 'fs';

async function processXml() {
  // Read XML file
  const xmlData = fs.readFileSync('input-files/Scenario-fixed-rate-purchase.xml', 'utf8');
  
  // Parse to JSON
  const jsonOutput = await parseXmlToJson(xmlData, 'json');
  
  console.log(jsonOutput);
}

processXml();
```

### Running the Test Script

```bash
# Run with a specific XML file
npx ts-node test-parser-ts.ts input-files/Scenario-fixed-rate-purchase.xml
```

## Testing

The project includes a comprehensive test suite using Jest to validate the functionality of the XML parser. The tests cover the basic functionality, formatting functions, and error handling with a code coverage of approximately 75%.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run a specific test file
npm test -- __tests__/xmlParser.test.ts

# Run tests in watch mode during development
npm test -- --watch
```

### Test Structure

Tests are organized into multiple files:

- `xmlParser.test.ts`: Tests basic parser functionality for different loan types
- `formatting.test.ts`: Tests formatting of data values (currency, dates, percentages, etc.)
- `error-handling.test.ts`: Tests error handling and edge cases

## Test Coverage

The test suite provides over 75% code coverage of the XML parser, with key areas covered including:

- Core conversion functionality between XML to JSON
- Data type validation and conversion
- Proper formatting of values (currency, dates, percentages)
- Error handling for invalid XML inputs
- Handling of different loan types (fixed-rate, ARM, etc.)
- Processing of minimal valid XML structures
- Handling large XML files

## Project Structure

- `src/mismoParser`: Main TypeScript parser implementation directory containing schemas and extractors
- `proposed-types-schema.ts`: TypeScript interface definitions for loan data
- `test-parser-ts.ts`: Test script to parse XML files
- `__tests__/`: Test suite for validating parser functionality

## Implementation Details

The parser uses a modular approach with the following key components:

1. **XML Parsing**: Uses `xml2js` for initial XML parsing
2. **Type Definitions**: Uses TypeScript interfaces and Zod for type safety
3. **Data Extraction**: Extracts structured data from complex XML hierarchies
4. **Formatting**: Formats dates, currency values, percentages, etc.
5. **Output Generation**: Creates JSON output as specified

## Type Transformation
The project uses Zod for schema validation with flexible type transformers. The `transformers.ts` module provides utility functions for transforming data types when validating XML data:

### Key Components
- `parseMismoDate`: Transforms string values into Date objects
- `parseMismoNumber`: Transforms string values into numbers
- `parseMismoBoolean`: Transforms string values into booleans

These transformers handle automatic type conversion during schema validation, making the parser more robust when dealing with inconsistent input data from XML sources.

### Usage Example
```typescript
import { parseMismoDate, parseMismoNumber, parseMismoBoolean } from './transformers';

const MySchema = z.object({
  createdDate: parseMismoDate,  // Accepts either Date objects or strings that can be parsed as dates
  amount: parseMismoNumber,     // Accepts either numbers or strings that can be parsed as numbers
  isActive: parseMismoBoolean   // Accepts either booleans or strings like "true", "yes", "1"
});
```

These flexible types allow the parser to handle XML data more gracefully without throwing validation errors when string values need to be converted to specific types. 