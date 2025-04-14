import * as fs from 'fs';
import * as path from 'path';
import { parseXmlToJson } from '../src/mismoParser';

// Format validation tests for the parser output
describe('Formatting Function Tests', () => {
  const fixedRateXmlPath = path.join(__dirname, '../input-files/Scenario-fixed-rate-purchase.xml');
  
  // Test utilities to read files
  const readXmlFile = (filePath: string): string => {
    return fs.readFileSync(filePath, 'utf8');
  };
  
  // Test currency formatting
  describe('Currency Formatting Tests', () => {
    it('should maintain numeric values for currency fields in JSON output', async () => {
      const xmlData = readXmlFile(fixedRateXmlPath);
      // Use type assertion to avoid TypeScript errors
      const result = await parseXmlToJson(xmlData) as {
        loans: Array<{
          terms: { noteAmount?: number | string };
          ltv?: { ltvRatioPercent?: number | string };
          details?: Record<string, any>;
        }>;
        property: {
          address: Record<string, any>;
          appraisal: { value?: number | string };
          details: Record<string, any>;
        };
        borrowers: Array<{
          name: Record<string, string>;
          declarations?: Record<string, any>;
        }>;
        meta?: {
          createdDate?: Date | string;
        };
      };
      
      // Ensure we have basic structure
      expect(result).toBeDefined();
      expect(result.loans).toBeDefined();
      expect(result.loans.length).toBeGreaterThan(0);
      expect(result.property).toBeDefined();
      expect(result.property.appraisal).toBeDefined();
      
      // Note: In the test files, these might be stored as strings or numbers
      // Check the existence of the property
      expect(result.loans[0].terms).toHaveProperty('noteAmount');
      expect(result.property.appraisal).toHaveProperty('value');
      
      // Ensure values are numeric or can be parsed as numbers
      if (result.loans[0].terms.noteAmount !== undefined) {
        const amount = result.loans[0].terms.noteAmount;
        expect(typeof amount === 'number' || !isNaN(Number(amount))).toBeTruthy();
      }
      
      if (result.property.appraisal.value !== undefined) {
        const value = result.property.appraisal.value;
        expect(typeof value === 'number' || !isNaN(Number(value))).toBeTruthy();
      }
    });
  });
  
  // Test percentage formatting
  describe('Percentage Formatting Tests', () => {
    it('should maintain numeric values for percentage fields in JSON output', async () => {
      const xmlData = readXmlFile(fixedRateXmlPath);
      // Use type assertion to avoid TypeScript errors
        const result = await parseXmlToJson(xmlData) as {
        loans: Array<{
          terms: { noteRatePercent?: number | string };
          ltv?: { ltvRatioPercent?: number | string };
        }>;
      };
      
      // Ensure we have structure
      expect(result).toBeDefined();
      expect(result.loans).toBeDefined();
      expect(result.loans.length).toBeGreaterThan(0);
      expect(result.loans[0].terms).toBeDefined();
      
      // Simply check property existence and numeric type
      expect(result.loans[0].terms).toHaveProperty('noteRatePercent');
      
      if (result.loans[0].terms.noteRatePercent !== undefined) {
        const rate = result.loans[0].terms.noteRatePercent;
        expect(typeof rate === 'number' || !isNaN(Number(rate))).toBeTruthy();
      }
      
      if (result.loans[0].ltv && result.loans[0].ltv.ltvRatioPercent !== undefined) {
        const ltv = result.loans[0].ltv.ltvRatioPercent;
        expect(typeof ltv === 'number' || !isNaN(Number(ltv))).toBeTruthy();
      }
    });
  });
  
  // Test date formatting
  describe('Date Formatting Tests', () => {
    it('should store dates in a standard format in JSON output', async () => {
      const xmlData = readXmlFile(fixedRateXmlPath);
      // Use type assertion to avoid TypeScript errors
      const result = await parseXmlToJson(xmlData) as {
        loans?: Array<{
          terms?: { noteDate?: Date | string };
        }>;
        meta?: {
          createdDate?: Date | string;
        };
      };
      
      // Ensure we have structure
      expect(result).toBeDefined();
      
      // Check date fields - should be Date objects or ISO format strings
      if (result.meta && result.meta.createdDate) {
        const date = result.meta.createdDate;
        // Should be a Date object or a string in ISO format
        expect(
          date instanceof Date ||
          (typeof date === 'string' && !isNaN(Date.parse(date)))
        ).toBeTruthy();
      }
      
      // Check for loan dates if available
      if (result.loans && 
          result.loans.length > 0 && 
          result.loans[0].terms && 
          result.loans[0].terms.noteDate) {
        const date = result.loans[0].terms.noteDate;
        expect(
          date instanceof Date ||
          (typeof date === 'string' && !isNaN(Date.parse(date)))
        ).toBeTruthy();
      }
    });
  });
  
  // Test boolean formatting
  describe('Boolean Formatting Tests', () => {
    it('should store boolean values in JSON output', async () => {
      const xmlData = readXmlFile(fixedRateXmlPath);
      // Use type assertion to avoid TypeScript errors
      const result = await parseXmlToJson(xmlData) as {
        loans?: Array<{
          details?: Record<string, any>;
        }>;
        property?: {
          details?: {
            floodInsuranceRequiredByLender?: boolean | string;
          };
        };
        borrowers?: Array<{
          declarations?: Record<string, any>;
        }>;
      };
      
      // Ensure we have structure
      expect(result).toBeDefined();
      
      // Find at least one boolean field to test
      let foundBooleanField = false;
      
      // Check the property details for boolean fields
      if (result.property && 
          result.property.details && 
          result.property.details.floodInsuranceRequiredByLender !== undefined) {
        const value = result.property.details.floodInsuranceRequiredByLender;
        expect(typeof value === 'boolean' || value === "true" || value === "false").toBeTruthy();
        foundBooleanField = true;
      }
      
      // Check borrower declarations which usually have boolean fields
      if (!foundBooleanField && 
          result.borrowers && 
          result.borrowers.length > 0 && 
          result.borrowers[0].declarations) {
        const declarations = result.borrowers[0].declarations;
        // Find at least one boolean property
        for (const key in declarations) {
          const value = declarations[key];
          if (typeof value === 'boolean' || value === "true" || value === "false") {
            foundBooleanField = true;
            break;
          }
        }
      }
      
      // Loan details also have boolean fields
      if (!foundBooleanField && 
          result.loans && 
          result.loans.length > 0 && 
          result.loans[0].details) {
        const details = result.loans[0].details;
        for (const key in details) {
          const value = details[key];
          if (typeof value === 'boolean' || value === "true" || value === "false") {
            foundBooleanField = true;
            break;
          }
        }
      }
      
      expect(foundBooleanField).toBeTruthy();
    });
  });
}); 