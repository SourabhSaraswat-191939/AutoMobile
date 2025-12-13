import mongoose from 'mongoose';
import ROBillingData from './models/ROBillingData.js';

// Connect to MongoDB
const MONGO_URI = 'mongodb+srv://akshaybondresitcom:Jyoti%402828@cluster0.zihf2hi.mongodb.net/automobileDashboardTest3?retryWrites=true&w=majority&appName=Cluster0';

async function checkROBillingCalculation() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 CHECKING RO BILLING DATA CALCULATION...\n');

    // Get all RO Billing data
    const allRecords = await ROBillingData.find({}).sort({ bill_date: 1 });
    console.log(`📊 Total RO Billing records in database: ${allRecords.length}`);

    // Group by date and service advisor
    const dateGroups = {};
    const advisorTotals = {};

    allRecords.forEach(record => {
      const date = record.bill_date || 'Unknown';
      const advisor = record.service_advisor || 'Unknown';
      const labourAmt = record.labour_amt || 0;
      const partAmt = record.part_amt || 0;
      const totalAmt = record.total_amount || 0;
      const workType = record.work_type || 'Unknown';

      // Skip Accidental Repair and Running Repair BodyCare (same as frontend filter)
      const isAccidentalRepair = workType?.toLowerCase().includes('accidental repair');
      const isRunningRepairBodycare = workType?.toLowerCase().includes('running repair bodycare');
      
      if (isAccidentalRepair || isRunningRepairBodycare) {
        return; // Skip this record
      }

      // Group by date
      if (!dateGroups[date]) {
        dateGroups[date] = {};
      }
      if (!dateGroups[date][advisor]) {
        dateGroups[date][advisor] = {
          ros: 0,
          labour: 0,
          parts: 0,
          total: 0,
          records: []
        };
      }

      dateGroups[date][advisor].ros += 1;
      dateGroups[date][advisor].labour += labourAmt;
      dateGroups[date][advisor].parts += partAmt;
      dateGroups[date][advisor].total += labourAmt + partAmt;
      dateGroups[date][advisor].records.push({
        ro_no: record.RO_No,
        labour: labourAmt,
        parts: partAmt,
        total: totalAmt,
        workType: workType
      });

      // Overall advisor totals
      if (!advisorTotals[advisor]) {
        advisorTotals[advisor] = {
          ros: 0,
          labour: 0,
          parts: 0,
          total: 0,
          dates: new Set()
        };
      }
      advisorTotals[advisor].ros += 1;
      advisorTotals[advisor].labour += labourAmt;
      advisorTotals[advisor].parts += partAmt;
      advisorTotals[advisor].total += labourAmt + partAmt;
      advisorTotals[advisor].dates.add(date);
    });

    // Show date breakdown
    console.log('📅 DATE BREAKDOWN:');
    const sortedDates = Object.keys(dateGroups).sort();
    sortedDates.forEach(date => {
      console.log(`\n📆 Date: ${date}`);
      const advisors = dateGroups[date];
      Object.entries(advisors).forEach(([advisor, data]) => {
        console.log(`   👨‍💼 ${advisor}:`);
        console.log(`      - ROs: ${data.ros}`);
        console.log(`      - Labour: ₹${data.labour.toLocaleString('en-IN')}`);
        console.log(`      - Parts: ₹${data.parts.toLocaleString('en-IN')}`);
        console.log(`      - Total: ₹${data.total.toLocaleString('en-IN')}`);
      });
    });

    // Focus on YASHPAL ASEDIYA
    console.log('\n🎯 YASHPAL ASEDIYA DETAILED ANALYSIS:');
    const yashpalOverall = advisorTotals['YASHPAL ASEDIYA'];
    if (yashpalOverall) {
      console.log('📊 OVERALL TOTALS:');
      console.log(`   - Total ROs: ${yashpalOverall.ros}`);
      console.log(`   - Total Labour: ₹${yashpalOverall.labour.toLocaleString('en-IN')}`);
      console.log(`   - Total Parts: ₹${yashpalOverall.parts.toLocaleString('en-IN')}`);
      console.log(`   - Total Amount: ₹${yashpalOverall.total.toLocaleString('en-IN')}`);
      console.log(`   - Active Dates: ${yashpalOverall.dates.size} (${Array.from(yashpalOverall.dates).join(', ')})`);

      console.log('\n📅 DATE-WISE BREAKDOWN:');
      sortedDates.forEach(date => {
        if (dateGroups[date]['YASHPAL ASEDIYA']) {
          const dayData = dateGroups[date]['YASHPAL ASEDIYA'];
          console.log(`   📆 ${date}:`);
          console.log(`      - ROs: ${dayData.ros}`);
          console.log(`      - Labour: ₹${dayData.labour.toLocaleString('en-IN')}`);
          console.log(`      - Parts: ₹${dayData.parts.toLocaleString('en-IN')}`);
          console.log(`      - Total: ₹${dayData.total.toLocaleString('en-IN')}`);
          
          // Show individual records for this date
          console.log(`      - Records:`);
          dayData.records.forEach((record, index) => {
            console.log(`        ${index + 1}. RO: ${record.ro_no}, L: ₹${record.labour}, P: ₹${record.parts}, T: ₹${record.total}, Type: ${record.workType}`);
          });
        }
      });
    } else {
      console.log('❌ YASHPAL ASEDIYA not found in database');
    }

    // Show top advisors for comparison
    console.log('\n🏆 TOP 5 ADVISORS BY TOTAL AMOUNT:');
    const topAdvisors = Object.entries(advisorTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
    
    topAdvisors.forEach(([advisor, data], index) => {
      console.log(`   ${index + 1}. ${advisor}:`);
      console.log(`      - ROs: ${data.ros}`);
      console.log(`      - Total: ₹${data.total.toLocaleString('en-IN')}`);
      console.log(`      - Dates: ${data.dates.size}`);
    });

    // Check for potential issues
    console.log('\n🔍 POTENTIAL ISSUES CHECK:');
    
    // Check for records with zero amounts
    const zeroAmountRecords = allRecords.filter(r => 
      (r.labour_amt || 0) === 0 && (r.part_amt || 0) === 0 && (r.total_amount || 0) === 0
    );
    console.log(`   - Records with zero amounts: ${zeroAmountRecords.length}`);
    
    // Check for mismatched totals
    const mismatchedRecords = allRecords.filter(r => {
      const calculatedTotal = (r.labour_amt || 0) + (r.part_amt || 0);
      const recordedTotal = r.total_amount || 0;
      return Math.abs(calculatedTotal - recordedTotal) > 1; // Allow 1 rupee difference for rounding
    });
    console.log(`   - Records with mismatched totals: ${mismatchedRecords.length}`);
    
    if (mismatchedRecords.length > 0) {
      console.log('   - Sample mismatched records:');
      mismatchedRecords.slice(0, 3).forEach(r => {
        const calculated = (r.labour_amt || 0) + (r.part_amt || 0);
        console.log(`     RO: ${r.RO_No}, Calculated: ₹${calculated}, Recorded: ₹${r.total_amount}, Diff: ₹${Math.abs(calculated - (r.total_amount || 0))}`);
      });
    }

    // Check date formats
    const uniqueDates = [...new Set(allRecords.map(r => r.bill_date))].sort();
    console.log(`   - Unique date formats found: ${uniqueDates.length}`);
    console.log(`   - Sample dates: ${uniqueDates.slice(0, 5).join(', ')}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkROBillingCalculation();
