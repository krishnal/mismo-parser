import * as fs from 'fs';
import * as path from 'path';
import { parseXmlToJson } from '../src/mismoParser';

describe('XML Parser Tests', () => {
  const fixedRateXmlPath = path.join(__dirname, './test-files/Scenario-fixed-rate-purchase.xml');
  const armRefinanceXmlPath = path.join(__dirname, './test-files/Scenario-arm-refinance.xml');
  const condoPurchaseXmlPath = path.join(__dirname, './test-files/Scenario-fixed-rate-condo-purchase.xml');
  
  // Test utility to read the XML files
  const readXmlFile = (filePath: string): string => {
    return fs.readFileSync(filePath, 'utf8');
  };

  // Test JSON output structure and types
  describe('JSON Output Tests', () => {
    it('should parse fixed-rate purchase XML to valid JSON structure', async () => {
      const xmlData = readXmlFile(fixedRateXmlPath);
      const result = await parseXmlToJson(xmlData);
      
      // Ensure result is not a string (it's JSON)
      expect(typeof result).not.toBe('string');
      // Safely cast to an object
      const loanData = result as Record<string, any>;
      
      // Test key fields existence
      expect(loanData).toHaveProperty('property');
      expect(loanData).toHaveProperty('loans');
      expect(loanData).toHaveProperty('borrowers');
      
      // Test critical property data
      expect(loanData.property).toHaveProperty('address');
      expect(loanData.property.address).toHaveProperty('line1');
      expect(loanData.property.address).toHaveProperty('city');
      
      // Test loan details
      expect(loanData.loans).toBeInstanceOf(Array);
      expect(loanData.loans.length).toBeGreaterThan(0);
      
      const loan = loanData.loans[0];
      expect(loan).toHaveProperty('terms');
      expect(loan.terms).toHaveProperty('purpose');
      expect(loan.terms).toHaveProperty('noteAmount');
      expect(loan.terms).toHaveProperty('noteRatePercent');
      
      // Test for existence of properties, not their exact types
      expect(loan.terms.noteAmount).toBeDefined();
      expect(loan.terms.noteRatePercent).toBeDefined();
      
      // Fixed rate loan shouldn't have ARM details
      if (loan.arm !== undefined) {
        // If ARM exists, it should be null, undefined, or an empty object
        expect(
          loan.arm === null || 
          loan.arm === undefined ||
          Object.keys(loan.arm).length === 0
        ).toBeTruthy();
      }
      
      // Test borrower data
      expect(Array.isArray(loanData.borrowers)).toBe(true);
      if (loanData.borrowers.length > 0) {
        expect(loanData.borrowers[0]).toHaveProperty('name');
        expect(loanData.borrowers[0].name).toHaveProperty('first');
        expect(loanData.borrowers[0].name).toHaveProperty('last');
      }
    });

    it('should parse ARM refinance XML to valid JSON structure with ARM details', async () => {
      const xmlData = readXmlFile(armRefinanceXmlPath);
        const result = await parseXmlToJson(xmlData);
      
      // Ensure result is not a string (it's JSON)
      expect(typeof result).not.toBe('string');
      // Safely cast to an object
      const loanData = result as Record<string, any>;
      
      // Test result structure
      expect(loanData).toHaveProperty('loans');
      expect(loanData.loans).toBeInstanceOf(Array);
      expect(loanData.loans.length).toBeGreaterThan(0);
      
      const loan = loanData.loans[0];
      
      // ARM fields should exist and have properties
      expect(loan).toHaveProperty('arm');
      expect(loan.arm).toHaveProperty('initialFixedMonths');
      expect(loan.arm).toHaveProperty('marginPercent');
      
      // ARM-specific refinance properties
      expect(loan.terms).toHaveProperty('purpose');
      // The purpose should be Refinance
      expect(loan.terms.purpose).toMatch(/Refinance/i);
      expect(loan.terms).toHaveProperty('refinanceType');
    });

    it('should parse condo purchase XML to valid JSON structure with project details', async () => {
      const xmlData = readXmlFile(condoPurchaseXmlPath);
      const result = await parseXmlToJson(xmlData);
      
      // Ensure result is not a string (it's JSON)
      expect(typeof result).not.toBe('string');
      // Safely cast to an object
      const loanData = result as Record<string, any>;
      
      // Test condo-specific fields
      expect(loanData).toHaveProperty('property');
      expect(loanData.property).toHaveProperty('project');
      
      // Project should have condo-related fields
      const project = loanData.property.project;
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('legalStructure');
      expect(project).toHaveProperty('classificationId');
      // isPud could be a boolean or string
      expect(project).toHaveProperty('isPud');
    });
  });

  // Test error handling
  describe('Error Handling Tests', () => {
    it('should handle invalid XML gracefully', async () => {
      const invalidXml = '<invalid>This is not valid XML';
      
      await expect(parseXmlToJson(invalidXml)).rejects.toThrow();
    });

    it('should handle missing essential elements gracefully', async () => {
      const incompleteXml = '<MESSAGE><DEAL_SETS></DEAL_SETS></MESSAGE>';
      
      await expect(parseXmlToJson(incompleteXml)).rejects.toThrow();
    });
  });
}); 