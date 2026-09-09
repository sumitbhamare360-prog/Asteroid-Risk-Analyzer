const axios = require('axios');

async function testNasaApi() {
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  today.setDate(today.getDate() + 7);
  const endDate = today.toISOString().split('T')[0];

  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const url = 'https://api.nasa.gov/neo/rest/v1/feed?start_date=' + startDate + '&end_date=' + endDate + '&api_key=' + apiKey;

  console.log('=== NASA NeoWs API Test ===');
  console.log('API Key:', apiKey === 'DEMO_KEY' ? 'DEMO_KEY (no custom key set)' : 'Custom key found');
  console.log('Date range:', startDate, 'to', endDate);
  console.log('URL:', url);
  console.log('');

  try {
    const response = await axios.get(url);
    console.log('STATUS: ' + response.status + ' OK');
    console.log('Element count: ' + response.data.element_count);

    const dates = Object.keys(response.data.near_earth_objects);
    console.log('Date keys returned: ' + dates.length);
    console.log('');

    dates.forEach(function(d) {
      var count = response.data.near_earth_objects[d].length;
      console.log('  ' + d + ': ' + count + ' asteroids');
    });

    // Show sample of first asteroid
    var firstDate = dates[0];
    var sample = response.data.near_earth_objects[firstDate][0];
    console.log('');
    console.log('=== Sample Asteroid ===');
    console.log('ID:', sample.id);
    console.log('Name:', sample.name);
    console.log('Magnitude:', sample.absolute_magnitude_h);
    console.log('Hazardous:', sample.is_potentially_hazardous_asteroid);
    console.log('Diameter (m):', sample.estimated_diameter.meters.estimated_diameter_min.toFixed(2), '-', sample.estimated_diameter.meters.estimated_diameter_max.toFixed(2));
    
    if (sample.close_approach_data && sample.close_approach_data.length > 0) {
      var approach = sample.close_approach_data[0];
      console.log('Approach date:', approach.close_approach_date);
      console.log('Velocity (km/h):', parseFloat(approach.relative_velocity.kilometers_per_hour).toFixed(2));
      console.log('Miss distance (km):', parseFloat(approach.miss_distance.kilometers).toFixed(2));
    }

    console.log('');
    console.log('=== RESULT: NASA API is working and returning data! ===');
  } catch (error) {
    console.error('');
    console.error('=== RESULT: NASA API call FAILED ===');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testNasaApi();
