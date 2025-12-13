import { convertExcelDate, testExcelDateConversion } from './utils/dateConverter.js';

console.log('🧪 Testing Excel Date Converter...\n');

// Test the problematic date from your database
console.log('🎯 Testing Your Specific Case:');
const problematicDate = '45931';
const convertedDate = convertExcelDate(problematicDate);
console.log(`   Input: ${problematicDate} → Output: ${convertedDate}`);
console.log(`   Expected: 01/10/2025 (based on your Excel screenshot)`);
console.log(`   Match: ${convertedDate === '01/10/2025' ? '✅ YES' : '❌ NO'}\n`);

// Run comprehensive tests
testExcelDateConversion();

// Test a few more cases
console.log('\n🔍 Additional Test Cases:');
const additionalTests = [
  { input: 45963, description: 'Another date from Excel' },
  { input: '01-10-2025', description: 'Dash format from Excel' },
  { input: '03/11/2025', description: 'Already correct format' },
  { input: 'invalid', description: 'Invalid input' },
  { input: 999999, description: 'Out of range serial' }
];

additionalTests.forEach(test => {
  const result = convertExcelDate(test.input);
  console.log(`   ${test.description}: ${test.input} → ${result}`);
});

console.log('\n✅ Date converter testing completed!');
