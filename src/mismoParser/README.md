# XML Parser Module Structure

This module is a parser for mortgage MISMO-format XML files, extracting structured data using Zod validation schemas.

## Module Organization

The parser has been refactored into the following logical components:

1. **index.ts**  
   Main entry point. Exports the primary `parseXmlToJson` function and re-exports key types.

2. **schemas.ts**  
   Contains all Zod schema definitions for validating and transforming the structured data.

3. **xmlHelpers.ts**  
   Utility functions for working with XML objects, providing robust access to nested properties.

4. **extractors.ts**  
   Contains the business logic to extract data from XML objects and transform them into validated schemas.

5. **transformers.ts**  
   Utility transformers for Zod to handle type conversion for dates, numbers, and booleans.

## Usage

```typescript
import { parseXmlToJson } from 'mismo-parser';

// Read XML file
const xmlData = fs.readFileSync('loan-file.xml', 'utf8');

// Parse XML to structured data
const result = await parseXmlToJson(xmlData);

// Output as JSON
console.log(JSON.stringify(result, null, 2));
```

## Development

- The module is built using TypeScript
- All components maintain their original function and variable names for backward compatibility
- Zod schemas ensure strict validation of parsed data 

## Type Transformation

The module provides special Zod transformers for handling type conversion:

- `parseMismoDate` - Converts string dates to Date objects
- `parseMismoNumber` - Converts string numbers to numeric values
- `parseMismoBoolean` - Converts string boolean representations to boolean values

These transformers are used within schemas to ensure consistent data types regardless of the XML input format. 