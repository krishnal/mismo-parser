/**
 * Example demonstrating how to use the XML parser library with TypeScript
 * 
 * Usage: ts-node test-parser-ts.ts <path-to-xml-file>
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseXmlToJson } from './src/mismoParser';

async function main() {
  try {
    // Check if file path is provided
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Please provide a path to an XML file');
      console.error('Usage: ts-node test-parser-ts.ts <path-to-xml-file>');
      process.exit(1);
    }

    const xmlFilePath = args[0];
    
    // Check if file exists
    if (!fs.existsSync(xmlFilePath)) {
      console.error(`File not found: ${xmlFilePath}`);
      process.exit(1);
    }
    
    // Read the XML file
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
    
    // Parse the XML to JSON
    console.log(`Parsing XML to JSON...`);
    const result = await parseXmlToJson(xmlData);
    
    // Output the result
    console.log('\n---- Parsed Output ----\n');
    
    let outputPath: string;


      
      // Save to file with proper type conversion
    outputPath = path.join(
      path.dirname(xmlFilePath),
      `${path.basename(xmlFilePath, path.extname(xmlFilePath))}_ts.json`
    );
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    
    console.log(`\nOutput saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();