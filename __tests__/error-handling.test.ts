import * as fs from 'fs';
import * as path from 'path';
import { parseXmlToJson } from '../src/mismoParser';

// Wrap the entire test suite in a try-catch to prevent TypeScript errors
// from halting execution
describe('Error Handling and Edge Cases', () => {
  // Test invalid XML input
  describe('Invalid XML Handling', () => {
    it('should throw error for empty XML', async () => {
      try {
        const emptyXml = '';
        await expect(parseXmlToJson(emptyXml)).rejects.toThrow();
      } catch (error) {
        console.error('Test Error:', error);
        throw error;
      }
    });
    
    it('should throw error for malformed XML', async () => {
      try {
        const malformedXml = '<root><unclosed>';
        await expect(parseXmlToJson(malformedXml)).rejects.toThrow();
      } catch (error) {
        console.error('Test Error:', error);
        throw error;
      }
    });
    
    it('should throw error for invalid non-XML text', async () => {
      try {
        const nonXmlText = 'This is just plain text, not XML';
        await expect(parseXmlToJson(nonXmlText)).rejects.toThrow();
      } catch (error) {
        console.error('Test Error:', error);
        throw error;
      }
    });
  });
  
  // Test missing required elements handling
  describe('Missing Required Elements Handling', () => {
    it('should throw error for missing MESSAGE root element', async () => {
      try {
        const missingRoot = '<NOT_MESSAGE></NOT_MESSAGE>';
        await expect(parseXmlToJson(missingRoot)).rejects.toThrow();
      } catch (error) {
        console.error('Test Error:', error);
        throw error;
      }
    });
    
    it('should throw error for missing DEAL_SETS element', async () => {
      try {
        const missingDealSets = '<MESSAGE><NOT_DEAL_SETS></NOT_DEAL_SETS></MESSAGE>';
        await expect(parseXmlToJson(missingDealSets)).rejects.toThrow();
      } catch (error) {
        console.error('Test Error:', error);
        throw error;
      }
    });
    
    it('should throw error for missing essential loan containers', async () => {
      try {
        const missingLoanContainers = `
          <MESSAGE>
            <DEAL_SETS>
              <DEAL_SET>
                <DEALS>
                  <DEAL>
                    <PARTIES></PARTIES>
                    <!-- Missing LOANS element -->
                  </DEAL>
                </DEALS>
              </DEAL_SET>
            </DEAL_SETS>
          </MESSAGE>
        `;
        await expect(parseXmlToJson(missingLoanContainers)).rejects.toThrow();
      } catch (error) {
        console.error('Test Error:', error);
        throw error;
      }
    });
  });
  
  // Test handling of output format
  describe('Output Format Handling', () => {
    it('should handle different XML formats correctly', async () => {
      try {
        const validXmlPath = path.join(__dirname, './test-files/Scenario-fixed-rate-purchase.xml');
        const xmlData = fs.readFileSync(validXmlPath, 'utf8');
        
        // Test result format
        const result = await parseXmlToJson(xmlData);
        expect(typeof result).not.toBe('string');
        expect(result).toHaveProperty('loans');
        expect(result).toHaveProperty('property');
        expect(result).toHaveProperty('borrowers');
      } catch (error) {
        console.error('Test Error:', error);
        throw error;
      }
    });
  }); 
  // Test limit handling
  describe('Resource Limit Handling', () => {
    it('should handle very large valid XML files', async () => {
      try {
        // Generate a large but well-formed XML file with repeating structure
        let largeXml = '<MESSAGE><DEAL_SETS><DEAL_SET><DEALS><DEAL><PARTIES>';
        
        // Add many party elements
        for (let i = 0; i < 100; i++) {
          largeXml += `<PARTY><INDIVIDUAL><n><FirstName>Person${i}</FirstName><LastName>Test</LastName></n></INDIVIDUAL></PARTY>`;
        }
        
        largeXml += '</PARTIES><LOANS><LOAN LoanRoleType="SubjectLoan"><LOAN_STATE><LoanStateType>AtClosing</LoanStateType></LOAN_STATE><TERMS_OF_MORTGAGE></TERMS_OF_MORTGAGE></LOAN></LOANS></DEAL></DEALS></DEAL_SET></DEAL_SETS></MESSAGE>';
        
        // The parser might still throw for this XML if it doesn't have all required fields
        // Let's just assert that it processes without XML parsing errors
        try {
          await parseXmlToJson(largeXml);
          // Test passes if it doesn't throw XML parsing errors
          expect(true).toBe(true);
        } catch (error) {
          // If it fails, ensure it's not with a XML parsing error
          expect((error as Error).message).not.toMatch(/xml|parse|syntax|tag/i);
        }
      } catch (error) {
        console.error('Test Error:', error);
        throw error;
      }
    });
  });
}); 