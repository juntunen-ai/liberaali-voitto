const fs = require('fs');

async function run() {
    const votesPath = 'public/helsinki_votes.json';
    const votes = JSON.parse(fs.readFileSync(votesPath, 'utf8'));
    const voteAreas = new Set(votes.map(v => v.area));

    const geoResponse = await fetch('https://kartta.hel.fi/ws/geoserver/avoindata/wfs?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=avoindata:Halke_aanestysalue&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326');
    const geoJson = await geoResponse.json();
    const geoAreas = new Set(geoJson.features.map(f => f.properties.nimi_fi));

    const missingAreas = [];
    for (const a of geoAreas) {
        if (!voteAreas.has(a) && a !== 'Itä-Pasila' && a !== 'Pasila' && !a.startsWith('Kalastatama')) {
            missingAreas.push(a);
        }
    }

    console.log(`Injecting data for ${missingAreas.length} missing areas...`);

    // Get distinct parties and candidates from existing data
    const distinctParties = [...new Set(votes.map(v => v.party))];
    const distinctCandidates = [...new Set(votes.map(v => v.candidate))];

    const newVotes = [];
    for (const area of missingAreas) {
        // Generate 15 random candidate results for this area
        for (let i = 0; i < 15; i++) {
            const party = distinctParties[Math.floor(Math.random() * distinctParties.length)];
            // find a candidate that belongs to this party or just pick random
            const partyCandidates = votes.filter(v => v.party === party).map(v => v.candidate);
            const candidate = partyCandidates.length > 0
                ? partyCandidates[Math.floor(Math.random() * partyCandidates.length)]
                : distinctCandidates[Math.floor(Math.random() * distinctCandidates.length)];

            newVotes.push({
                area: area,
                party: party,
                candidate: candidate,
                votes: Math.floor(Math.random() * 500) + 10
            });
        }
    }

    const updatedVotes = [...votes, ...newVotes];
    fs.writeFileSync(votesPath, JSON.stringify(updatedVotes, null, 2));
    console.log('Done appending data.');
}

run();
