const https = require('https');

// extension to get stats for
const extensionName = 'RandomFractalsInc.vscode-data-preview';

// stats time interval
const timeInterval = 1000 * 60 * 10; // ever 10 mins

// print stats CSV header
console.log('DateTime, Installs, Downloads, Version');

// get initial stats
getStats();

// schedule repeated stats calls
const timeOut = setInterval(getStats, timeInterval);

/**
 * Gets configured extension stats and prints 
 * DateTime, Installs, Downloads, Version
 * CSV to conole for copy over to hourly/daily stats
 * data files for vscode extension metrics and analytics.
 */
function getStats() {
  // create ext stats request body
  const requestBody = JSON.stringify({
    filters: [{
      criteria: [{
        filterType: 7,
        value: extensionName
      }, {
        filterType : 12,
        value: '4096'
      }]
    }],
    flags: 914
  }, null, 2);
  // console.log('request:', requestBody);

  // create post request options
  const requestOptions = {
    protocol: 'https:',
    host: 'marketplace.visualstudio.com',
    port: 443,
    path: '/_apis/public/gallery/extensionquery',
    method: 'POST',
    headers: {
      'Accept': 'application/json;api-version=3.0-preview.1',
      'Content-Type' : 'application/json',
      'Content-Length' : Buffer.byteLength(requestBody, 'utf8')
    }
  };

  // create ext. stats data post request
  const postRequest = https.request(requestOptions, (response) => {
    response.setEncoding('utf8');
    // console.log('statusCode:', response.statusCode);
    // console.log('headers:', response.headers);
    // get response data
    let responseText = '';
    response.on('data', (chunk) => {
      responseText += chunk;
    });
  
    // process data stats
    response.on('end', () => {
      const responseData = JSON.parse(responseText);
      // console.log('response:', JSON.stringify(responseData, null, 2));
      const results = responseData.results;
      if (results.length > 0 && results[0].extensions && results[0].extensions.length > 0) {
        // get the 1st extension info
        const extension = results[0].extensions[0];
        const extensionVersion = extension.versions[0].version;
        const extensionStats = extension.statistics;
        // console.log('version:', extensionVersion);
        // console.log('stats:', JSON.stringify(extensionStats, null, 2));

        // convert extension stats to simpler data object
        const stats = {};
        extensionStats.forEach(stat => {
          stats[stat.statisticName] = stat.value;
        });
        // console.log('stats:', JSON.stringify(stats, null, 2));

        // log periodic stats in CSV format: DateTime, Installs, Downloads, Version
        const timeString = getLocalDateTimeISOString(new Date());
        console.log(`${timeString}, ${stats.install}, ${stats.install + stats.updateCount}, v${extensionVersion}`);
      }
    });
  });
  
  // write post request data body and send
  postRequest.write(requestBody);
  postRequest.end();
  postRequest.on("error", (err) => {
    console.log("Error: " + err.message);
  });

} // end of getStats()

/**
 * Converts a Date to local date and time ISO string.
 * @param dateTime Date to convert to local date/time ISO string.
 */
function getLocalDateTimeISOString(dateTime) {
  return dateTime.getFullYear() + '-' +
    pad(dateTime.getMonth() + 1) + '-' + 
    pad(dateTime.getDate()) + 'T' + 
    pad(dateTime.getHours()) + ':' + 
    pad(dateTime.getMinutes()) + ':' + 
    pad(dateTime.getSeconds());
}

/**
 * Pads date/time fields with 0s.
 * @param number date/time part number.
 */
function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}
