import fetch from 'node-fetch';

async function debugAdvisorData() {
  console.log('🔍 Debugging YASHPAL ASEDIYA data...\n');

  const baseUrl = 'http://localhost:5000';
  const apiUrl = `${baseUrl}/api/service-manager/dashboard-data?uploadedBy=sm.pune@shubh.com&city=Pune&dataType=ro_billing`;
  
  try {
    console.log('📡 Fetching RO Billing data...');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ API Response received: ${data.count} total records\n`);
    
    // Find all records for YASHPAL ASEDIYA
    const yashpalRecords = data.data.filter(record => 
      record.serviceAdvisor?.toUpperCase().includes('YASHPAL') ||
      record.service_advisor?.toUpperCase().includes('YASHPAL')
    );
    
    console.log(`🎯 Found ${yashpalRecords.length} records for YASHPAL ASEDIYA:\n`);
    
    let totalAmount = 0;
    let totalLabour = 0;
    let totalParts = 0;
    let filteredOutCount = 0;
    let includedCount = 0;
    
    yashpalRecords.forEach((record, index) => {
      const workType = record.workType || record.work_type || 'Unknown';
      const labourAmt = record.labourAmt || record.labour_amt || 0;
      const partAmt = record.partAmt || record.part_amt || 0;
      const totalAmt = record.totalAmount || record.total_amount || 0;
      const advisor = record.serviceAdvisor || record.service_advisor || 'Unknown';
      
      // Check if this record would be filtered out
      const isAccidentalRepair = workType?.toLowerCase().includes('accidental repair');
      const isRunningRepairBodycare = workType?.toLowerCase().includes('running repair bodycare');
      const wouldBeFiltered = isAccidentalRepair || isRunningRepairBodycare;
      
      if (wouldBeFiltered) {
        filteredOutCount++;
        console.log(`❌ FILTERED OUT - Record ${index + 1}:`);
      } else {
        includedCount++;
        totalAmount += totalAmt;
        totalLabour += labourAmt;
        totalParts += partAmt;
        console.log(`✅ INCLUDED - Record ${index + 1}:`);
      }
      
      console.log(`   - Advisor: ${advisor}`);
      console.log(`   - Work Type: ${workType}`);
      console.log(`   - Labour: ₹${labourAmt.toLocaleString('en-IN')}`);
      console.log(`   - Parts: ₹${partAmt.toLocaleString('en-IN')}`);
      console.log(`   - Total: ₹${totalAmt.toLocaleString('en-IN')}`);
      console.log(`   - RO No: ${record.RO_No || record.ro_no || 'Unknown'}`);
      console.log(`   - Bill Date: ${record.billDate || record.bill_date || 'Unknown'}`);
      
      if (wouldBeFiltered) {
        console.log(`   - 🚫 REASON: ${isAccidentalRepair ? 'Accidental Repair' : 'Running Repair BodyCare'}`);
      }
      console.log('');
    });
    
    console.log('📊 SUMMARY FOR YASHPAL ASEDIYA:');
    console.log(`   - Total Records Found: ${yashpalRecords.length}`);
    console.log(`   - Records Included in Performance: ${includedCount}`);
    console.log(`   - Records Filtered Out: ${filteredOutCount}`);
    console.log(`   - Included Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`);
    console.log(`   - Included Labour Amount: ₹${totalLabour.toLocaleString('en-IN')}`);
    console.log(`   - Included Parts Amount: ₹${totalParts.toLocaleString('en-IN')}`);
    console.log('');
    
    if (filteredOutCount > 0) {
      console.log('⚠️ ISSUE IDENTIFIED:');
      console.log(`   ${filteredOutCount} records are being filtered out from Service Advisor Performance`);
      console.log('   This explains why YASHPAL ASEDIYA shows lower amounts than expected');
      console.log('');
      console.log('💡 POSSIBLE SOLUTIONS:');
      console.log('   1. Remove the filtering for Accidental Repair and Running Repair BodyCare');
      console.log('   2. Add a toggle to include/exclude these work types');
      console.log('   3. Show separate totals for different work types');
    }
    
    // Check work type distribution
    const workTypeDistribution = {};
    yashpalRecords.forEach(record => {
      const workType = record.workType || record.work_type || 'Unknown';
      if (!workTypeDistribution[workType]) {
        workTypeDistribution[workType] = { count: 0, totalAmount: 0 };
      }
      workTypeDistribution[workType].count++;
      workTypeDistribution[workType].totalAmount += record.totalAmount || record.total_amount || 0;
    });
    
    console.log('📈 WORK TYPE DISTRIBUTION FOR YASHPAL ASEDIYA:');
    Object.entries(workTypeDistribution).forEach(([workType, data]) => {
      console.log(`   - ${workType}: ${data.count} records, ₹${data.totalAmount.toLocaleString('en-IN')}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAdvisorData();
