const { integrationTestUtils } = require('./shared/helpers/integration-helpers');

async function debugTest() {
  console.log('🚀 Creating test user...');
  
  // Create test user
  const userData = await integrationTestUtils.userManager.createUser({
    firstName: 'Alice',
    lastName: 'Smith',
    birthDate: '1999-01-01',
    gender: 'FEMALE',
    interests: ['music', 'travel'],
    location: 'New York, NY'
  });
  
  console.log('✅ User created:', userData.user.id);
  
  // Create authenticated client
  const client = await integrationTestUtils.userManager.createAuthenticatedClient(userData.user.id);
  
  // Set preferences
  console.log('🔧 Setting preferences...');
  const prefResponse = await client.put('/api/v1/users/preferences', {
    ageRange: { min: 25, max: 35 },
    maxDistance: 100,
    interestedInGenders: ['MALE'],
    showMe: true
  });
  
  console.log('✅ Preferences set:', prefResponse.status, prefResponse.data);
  
  // Try to get preferences
  console.log('�� Getting preferences...');
  const getResponse = await client.get('/api/v1/users/preferences');
  console.log('✅ Preferences retrieved:', getResponse.status, getResponse.data);
  
  // Try to get potential matches
  console.log('🎯 Getting potential matches...');
  const matchResponse = await client.get('/api/v1/matching/potential-matches');
  console.log('✅ Matches response:', matchResponse.status, matchResponse.data);
}

debugTest().catch(console.error);
