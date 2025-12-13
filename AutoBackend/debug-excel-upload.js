import XLSX from 'xlsx';
import fs from 'fs';

/**
 * Debug script to test Excel parsing and column mapping
 */

// Simulate the parseExcelFile function
const parseExcelFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      
      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return reject(new Error('Excel file contains no worksheets'));
      }
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert worksheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use array of arrays format first
        defval: '', // Default value for empty cells
        blankrows: false // Skip blank rows
      });
      
      if (jsonData.length === 0) {
        return reject(new Error('Excel file is empty'));
      }
      
      // Get headers from first row
      const headers = jsonData[0].map(header => 
        header ? header.toString().trim() : ''
      ).filter(header => header !== '');
      
      if (headers.length === 0) {
        return reject(new Error('No valid headers found in Excel file'));
      }
      
      console.log(`📋 Raw Headers from Excel:`, headers);
      
      // Convert data rows to objects
      const results = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowObject = {};
        let hasData = false;
        
        headers.forEach((header, index) => {
          const cellValue = row[index];
          if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
            // Convert to string and trim
            rowObject[header] = cellValue.toString().trim();
            hasData = true;
          }
        });
        
        // Only add rows that have at least one non-empty cell
        if (hasData && Object.keys(rowObject).length > 0) {
          results.push(rowObject);
        }
      }
      
      console.log(`📊 Parsed Excel file: ${results.length} data rows, ${headers.length} columns`);
      console.log(`📋 Headers: ${headers.join(', ')}`);
      
      if (results.length > 0) {
        console.log(`📄 Sample row:`, results[0]);
      }
      
      resolve(results);
    } catch (error) {
      console.error('❌ Error parsing Excel file:', error);
      reject(new Error(`Failed to parse Excel file: ${error.message}`));
    }
  });
};

// Simulate column mapping
const mapColumnNames = (excelRows, fileType) => {
  if (!excelRows || excelRows.length === 0) {
    return excelRows;
  }

  const columnMappings = {
    'ro_billing': {
      'R/O No': 'RO_No',
      'RO No': 'RO_No',
      'RO_No': 'RO_No',
      'Service Advisor': 'service_advisor',
      'Labour Amt': 'labour_amt',
      'Part Amt': 'part_amt',
      'Total Amount': 'total_amount'
    },
    'operations_part': {
      'OP/Part Code': 'OP_Part_Code',
      'OP_Part_Code': 'OP_Part_Code',
      'Total': 'OP_Part_Code'  // Map 'Total' column to OP_Part_Code
    },
    'warranty': {
      'Claim Number': 'claim_number',
      'claim_number': 'claim_number',
      'R/O No': 'RO_No',
      'RO No': 'RO_No'
    },
    'booking_list': {
      'Reg. No': 'Reg_No',
      'Reg No': 'Reg_No',
      'Reg_No': 'Reg_No'
    }
  };

  const mappings = columnMappings[fileType] || {};
  
  console.log(`🔄 Applying column mappings for ${fileType}:`);
  console.log(`   Available mappings:`, Object.keys(mappings));

  return excelRows.map(row => {
    const mappedRow = {};
    
    Object.keys(row).forEach(originalKey => {
      const mappedKey = mappings[originalKey] || originalKey;
      mappedRow[mappedKey] = row[originalKey];
      
      if (mappings[originalKey]) {
        console.log(`   Mapped: "${originalKey}" → "${mappedKey}"`);
      }
    });
    
    return mappedRow;
  });
};

// Test function
async function testExcelUpload() {
  console.log('🎯 Excel Upload Debug Test');
  
  // You can test with a sample Excel file path
  const testFilePath = 'test-sample.xlsx'; // Replace with actual file path
  
  if (!fs.existsSync(testFilePath)) {
    console.log('⚠️ No test file found. Creating a sample test...');
    
    // Test with sample data for different file types
    const testCases = [
      {
        fileType: 'ro_billing',
        sampleData: [
          { 'R/O No': 'R123', 'Service Advisor': 'John', 'Total Amount': '1000' },
          { 'R/O No': 'R124', 'Service Advisor': 'Jane', 'Total Amount': '2000' }
        ]
      },
      {
        fileType: 'operations_part',
        sampleData: [
          { 'Total': 'OP123', 'Description': 'Part A' },
          { 'Total': 'OP124', 'Description': 'Part B' }
        ]
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing ${testCase.fileType}:`);
      console.log(`📋 Sample data:`, testCase.sampleData);
      
      // Apply column mapping
      const mappedData = mapColumnNames(testCase.sampleData, testCase.fileType);
      console.log(`🔄 After mapping:`, mappedData);
      
      // Test unique key extraction
      const requiredFields = {
        'ro_billing': ['RO_No'],
        'warranty': ['claim_number'],
        'booking_list': ['Reg_No'],
        'operations_part': ['OP_Part_Code']
      };
      
      const uniqueKey = requiredFields[testCase.fileType][0];
      const uniqueKeys = mappedData.map(row => row[uniqueKey]).filter(key => key);
      
      console.log(`🔑 Unique key field: ${uniqueKey}`);
      console.log(`🔑 Extracted unique keys:`, uniqueKeys);
      console.log(`📊 Valid keys count: ${uniqueKeys.length}`);
      
      if (uniqueKeys.length === 0) {
        console.log(`❌ PROBLEM: No valid ${uniqueKey} found! This would cause 0 rows processed.`);
      } else {
        console.log(`✅ SUCCESS: Found ${uniqueKeys.length} valid keys`);
      }
    }
    
    return;
  }
  
  try {
    // Parse the Excel file
    console.log(`\n📁 Parsing Excel file: ${testFilePath}`);
    const excelRows = await parseExcelFile(testFilePath);
    
    // Test different file types
    const fileTypes = ['ro_billing', 'operations_part', 'warranty', 'booking_list'];
    
    for (const fileType of fileTypes) {
      console.log(`\n🧪 Testing file type: ${fileType}`);
      
      // Apply column mapping
      const mappedRows = mapColumnNames(excelRows, fileType);
      console.log(`🔄 After mapping, sample row:`, mappedRows[0]);
      
      // Test unique key extraction
      const requiredFields = {
        'ro_billing': ['RO_No'],
        'warranty': ['claim_number'],
        'booking_list': ['Reg_No'],
        'operations_part': ['OP_Part_Code']
      };
      
      const uniqueKey = requiredFields[fileType][0];
      const uniqueKeys = mappedRows.map(row => row[uniqueKey]).filter(key => key);
      
      console.log(`🔑 Unique key field: ${uniqueKey}`);
      console.log(`🔑 Extracted unique keys (first 5):`, uniqueKeys.slice(0, 5));
      console.log(`📊 Valid keys count: ${uniqueKeys.length} out of ${mappedRows.length} rows`);
      
      if (uniqueKeys.length === 0) {
        console.log(`❌ PROBLEM: No valid ${uniqueKey} found! This would cause 0 rows processed.`);
        console.log(`📋 Available columns:`, Object.keys(mappedRows[0] || {}));
      } else {
        console.log(`✅ SUCCESS: Found ${uniqueKeys.length} valid keys`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testExcelUpload();
