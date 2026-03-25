const fs = require('fs');

async function run() {
  const votes = JSON.parse(fs.readFileSync('public/helsinki_votes.json', 'utf8'));
  const voteAreas = new Set(votes.map(v => v.area));

  const geoResponse = await fetch('https://kartta.hel.fi/ws/geoserver/avoindata/wfs?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=avoindata:Halke_aanestysalue&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326');
  const geoJson = await geoResponse.json();
  const geoAreas = new Set(geoJson.features.map(f => f.properties.nimi_fi));

  console.log('Areas in votes but not in geo:');
  for (const a of voteAreas) {
    if (!geoAreas.has(a)) console.log(` - "${a}"`);
  }

  console.log('\nAreas in geo but not in votes:');
  for (const a of geoAreas) {
    if (!voteAreas.has(a)) console.log(` - "${a}"`);
  }
}

run();
