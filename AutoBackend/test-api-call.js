import fetch from 'node-fetch';

async function testDashboardAPI() {
  console.log('🧪 Testing Dashboard API Calls...\n');

  const baseUrl = 'http://localhost:5000';
  const testCases = [
    {
      name: 'SM Pune User - RO Billing',
      url: `${baseUrl}/api/service-manager/dashboard-data?uploadedBy=sm.pune@shubh.com&city=Pune&dataType=ro_billing`
    },
    {
      name: 'SM Pune User - All Data',
      url: `${baseUrl}/api/service-manager/dashboard-data?uploadedBy=sm.pune@shubh.com&city=Pune&dataType=all`
    },
    {
      name: 'Different User - RO Billing',
      url: `${baseUrl}/api/service-manager/dashboard-data?uploadedBy=different.user@example.com&city=TestCity&dataType=ro_billing`
    }
  ];

  for (const testCase of testCases) {
    console.log(`🎯 ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}`);
    
    try {
      const response = await fetch(testCase.url);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success: ${data.success}`);
        console.log(`📊 Data Type: ${data.dataType}`);
        console.log(`📈 Count: ${data.count}`);
        console.log(`📋 Data Length: ${data.data?.length || 0}`);
        console.log(`📄 Uploads: ${data.uploads?.length || 0}`);
        
        if (data.summary) {
          console.log(`💰 Summary:`, {
            totalRecords: data.summary.totalRecords,
            totalAmount: data.summary.totalAmount,
            labourAmount: data.summary.labourAmount,
            partsAmount: data.summary.partsAmount
          });
        }
        
        if (data.data && data.data.length > 0) {
          console.log(`📄 Sample record:`, {
            RO_No: data.data[0].RO_No,
            total_amount: data.data[0].total_amount,
            service_advisor: data.data[0].service_advisor
          });
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
    
    console.log('');
  }
}

testDashboardAPI();
