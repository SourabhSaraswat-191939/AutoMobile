import fetch from 'node-fetch';

async function triggerDashboardStats() {
  console.log('🧪 Testing Dashboard API to trigger stats saving...\n');

  const baseUrl = 'http://localhost:5000';
  const testCases = [
    {
      name: 'RO Billing Dashboard',
      url: `${baseUrl}/api/service-manager/dashboard-data?uploadedBy=sm.pune@shubh.com&city=Pune&dataType=ro_billing`
    },
    {
      name: 'Warranty Dashboard', 
      url: `${baseUrl}/api/service-manager/dashboard-data?uploadedBy=sm.pune@shubh.com&city=Pune&dataType=warranty`
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
        
        if (data.summary) {
          console.log(`💰 Summary:`, {
            totalRecords: data.summary.totalRecords,
            totalAmount: data.summary.totalAmount,
            labourAmount: data.summary.labourAmount,
            partsAmount: data.summary.partsAmount
          });
        }
        
        console.log(`✅ API call successful - dashboard stats should be saved now`);
      } else {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
    
    console.log('');
    
    // Wait a bit between calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎉 Dashboard API calls completed. Check server logs for stats saving messages.');
}

triggerDashboardStats();
