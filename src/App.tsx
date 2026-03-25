import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';


interface VoteData {
  area: string;
  party: string;
  candidate: string;
  votes: number;
}

const PARTY_COLORS: Record<string, string> = {
  'KOK': '#006288',
  'SDP': '#E11931',
  'PS': '#FFDE55',
  'KESK': '#01954B',
  'VIHR': '#61BF1A',
  'VAS': '#BF1E24',
  'RKP': '#FFDD93',
  'KD': '#18359B',
  'LIIK': '#B5086E',
  'LIBE': '#F5A623',
  'OTHER': '#888888'
};

function GeoJsonLayer({ mapData, onHover, onClick }: { mapData: any, onHover: (info: any) => void, onClick: (area: string) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !mapData) return;

    // Clear existing data layers
    map.data.forEach((feature) => map.data.remove(feature));

    // Add new GeoJSON
    map.data.addGeoJson(mapData);

    // Set styling based on topParty
    map.data.setStyle((feature) => {
      const topParty = feature.getProperty('topParty') || 'OTHER';
      const color = PARTY_COLORS[topParty] || PARTY_COLORS['OTHER'];
      return {
        fillColor: color,
        fillOpacity: 0.6,
        strokeColor: '#334155',
        strokeWeight: 1.5,
      };
    });

    const mouseOverListener = map.data.addListener('mouseover', (e: google.maps.Data.MouseEvent) => {
      const props: any = {};
      e.feature.forEachProperty((val, key) => { props[key] = val; });

      let x = 0;
      let y = 0;
      if (e.domEvent && (e.domEvent as MouseEvent).clientX !== undefined) {
        x = (e.domEvent as MouseEvent).offsetX || 0;
        y = (e.domEvent as MouseEvent).offsetY || 0;
      }
      onHover({ feature: { properties: props }, x, y });
    });

    const mouseOutListener = map.data.addListener('mouseout', () => {
      onHover(null);
    });

    const clickListener = map.data.addListener('click', (e: google.maps.Data.MouseEvent) => {
      const areaName = e.feature.getProperty('nimi_fi');
      if (areaName) {
        onClick(areaName);
      }
    });

    return () => {
      google.maps.event.removeListener(mouseOverListener);
      google.maps.event.removeListener(mouseOutListener);
      google.maps.event.removeListener(clickListener);
    };

  }, [map, mapData, onHover, onClick]);

  return null;
}

export default function App() {
  const [data, setData] = useState<VoteData[]>([]);
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ feature: any, x: number, y: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/helsinki_votes.json').then(res => res.json()),
      fetch('https://kartta.hel.fi/ws/geoserver/avoindata/wfs?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=avoindata:Halke_aanestysalue&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326').then(res => res.json())
    ])
      .then(([votesJson, geoJson]: [any, any]) => {
        const nameMap: Record<string, string> = {
          'Kalastatama A': 'Kalasatama A',
          'Kalastatama B': 'Kalasatama B',
          'Itä-Pasila': 'Pasila C',
          'Pasila': 'Pasila D'
        };

        geoJson.features.forEach((f: any) => {
          if (f.properties && f.properties.nimi_fi && nameMap[f.properties.nimi_fi]) {
            f.properties.nimi_fi = nameMap[f.properties.nimi_fi];
          }
        });

        setData(votesJson);
        setGeoData(geoJson);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, []);

  const filteredData = useMemo(() => {
    let filtered = data;
    if (selectedArea) {
      filtered = filtered.filter(d => d.area === selectedArea);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.candidate.toLowerCase().includes(term) ||
        d.party.toLowerCase().includes(term) ||
        d.area.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [data, searchTerm, selectedArea]);

  const partyVotes = useMemo(() => {
    const votes: Record<string, number> = {};
    filteredData.forEach(d => {
      votes[d.party] = (votes[d.party] || 0) + d.votes;
    });
    return Object.entries(votes)
      .map(([party, votes]) => ({ party, votes }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10);
  }, [filteredData]);

  const candidateVotes = useMemo(() => {
    const votes: Record<string, { votes: number, party: string }> = {};
    filteredData.forEach(d => {
      if (!votes[d.candidate]) {
        votes[d.candidate] = { votes: 0, party: d.party };
      }
      votes[d.candidate].votes += d.votes;
    });
    return Object.entries(votes)
      .map(([candidate, info]) => ({ candidate, votes: info.votes, party: info.party }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10);
  }, [filteredData]);

  const areas = useMemo(() => {
    const areaSet = new Set<string>();
    data.forEach(d => areaSet.add(d.area));
    return Array.from(areaSet).sort();
  }, [data]);

  const totalVotes = useMemo(() => {
    return filteredData.reduce((sum, d) => sum + d.votes, 0);
  }, [filteredData]);

  const mapData = useMemo(() => {
    if (!geoData || !data.length) return null;

    const areaPartyVotes: Record<string, Record<string, number>> = {};
    const areaCandidateVotes: Record<string, Record<string, { votes: number, party: string }>> = {};

    data.forEach(d => {
      if (!areaPartyVotes[d.area]) areaPartyVotes[d.area] = {};
      areaPartyVotes[d.area][d.party] = (areaPartyVotes[d.area][d.party] || 0) + d.votes;

      if (!areaCandidateVotes[d.area]) areaCandidateVotes[d.area] = {};
      if (!areaCandidateVotes[d.area][d.candidate]) {
        areaCandidateVotes[d.area][d.candidate] = { votes: 0, party: d.party };
      }
      areaCandidateVotes[d.area][d.candidate].votes += d.votes;
    });

    const features = geoData.features.map((f: any, i: number) => {
      const areaName = f.properties.nimi_fi;
      const votes = areaPartyVotes[areaName] || {};
      const sortedParties = Object.entries(votes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const candidateVotes = areaCandidateVotes[areaName] || {};
      const sortedCandidates = Object.entries(candidateVotes)
        .map(([candidate, info]) => ({ candidate, votes: info.votes, party: info.party }))
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 3);

      const topParty = sortedParties[0]?.[0] || 'OTHER';

      return {
        ...f,
        id: f.properties.id || i, // Ensure numeric ID for feature-state
        properties: {
          ...f.properties,
          topParty,
          topParties: JSON.stringify(sortedParties.map(p => ({ party: p[0], votes: p[1] }))),
          topCandidates: JSON.stringify(sortedCandidates),
          color: PARTY_COLORS[topParty] || PARTY_COLORS['OTHER']
        }
      };
    });

    // CRITICAL FIX: MapLibre GL JS strictly rejects GeoJSON containing a top-level `crs` property.
    // The Helsinki WFS returns EPSG:4326 wrapped with a CRS object which will silently abort MapLibre's parsing. 
    // We strictly omit the `crs` property and only return the features.
    const { features: featureSet } = geoData;
    return { type: 'FeatureCollection', features: features };
  }, [geoData, data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Loading election data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-300 shrink-0">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold tracking-tight">Helsingin vaalitulokset</h1>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-slate-500">Valitse vaalit</span>
              <select className="border border-slate-300 rounded px-2 py-1 bg-slate-50">
                <option>2023 Eduskuntavaalit</option>
              </select>
            </div>
          </div>
          <div className="text-xs text-slate-500 hidden md:block">
            Karttapohja: Helsingin kaupunki. Tulokset: Oikeusministeriö.
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Map */}
        <div className="flex-1 flex flex-col border-r border-slate-300 bg-white relative">
          <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Karttanäkymä</span>
              <select className="border border-slate-300 rounded px-2 py-1 text-sm bg-white w-64">
                <option>Voittanut puolue</option>
              </select>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 mb-1">Suhdeluvut</span>
              <div className="flex border border-slate-300 rounded overflow-hidden">
                <button className="px-3 py-1 text-xs bg-blue-100 text-blue-800 font-medium">Kpl</button>
                <button className="px-3 py-1 text-xs bg-white text-slate-600 border-l border-slate-300">%-osuus</button>
              </div>
            </div>
          </div>

          <div className="flex-1 relative">
            {mapData && (
              <APIProvider apiKey={(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || ''}>
                <Map
                  defaultCenter={{ lat: 60.1699, lng: 24.9384 }}
                  defaultZoom={10.5}
                  disableDefaultUI={true}
                  mapId="DEMO_MAP_ID"
                  style={{ width: '100%', height: '100%', position: 'absolute' }}
                >
                  <GeoJsonLayer mapData={mapData} onHover={setHoverInfo} onClick={setSelectedArea} />
                </Map>
              </APIProvider>
            )}
            {hoverInfo && (
              <div
                className="absolute bg-white p-3 rounded-lg shadow-lg border border-slate-200 pointer-events-none z-10"
                style={{ left: hoverInfo.x + 10, top: hoverInfo.y + 10 }}
              >
                <h4 className="font-bold text-sm mb-2">{hoverInfo.feature.properties.nimi_fi}</h4>
                <div className="space-y-1 mb-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Puolueet</div>
                  {(typeof hoverInfo.feature.properties.topParties === 'string'
                    ? JSON.parse(hoverInfo.feature.properties.topParties)
                    : hoverInfo.feature.properties.topParties).map((p: any, i: number) => (
                      <div key={p.party} className="flex items-center justify-between text-xs w-48">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PARTY_COLORS[p.party] || PARTY_COLORS['OTHER'] }}></span>
                          <span className="font-medium">{p.party}</span>
                        </div>
                        <span className="text-slate-500">{p.votes}</span>
                      </div>
                    ))}
                </div>
                {hoverInfo.feature.properties.topCandidates && (
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 mb-1">Ehdokkaat</div>
                    {(typeof hoverInfo.feature.properties.topCandidates === 'string'
                      ? JSON.parse(hoverInfo.feature.properties.topCandidates)
                      : hoverInfo.feature.properties.topCandidates).map((c: any, i: number) => (
                        <div key={c.candidate} className="flex items-center justify-between text-xs w-48">
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PARTY_COLORS[c.party] || PARTY_COLORS['OTHER'] }}></span>
                            <span className="truncate" title={c.candidate}>{c.candidate}</span>
                          </div>
                          <span className="text-slate-500 shrink-0">{c.votes}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Map Legend */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded shadow-sm border border-slate-200 text-xs">
              <div className="font-bold mb-2">Voittanut puolue</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(PARTY_COLORS).filter(([p]) => p !== 'OTHER').map(([party, color]) => (
                  <div key={party} className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></span>
                    <span>{party}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Charts */}
        <div className="w-[800px] flex flex-col bg-white shrink-0">
          <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Äänestysalue</span>
              <select
                className="border border-slate-300 rounded px-2 py-1 text-sm bg-white w-64"
                value={selectedArea || ''}
                onChange={(e) => setSelectedArea(e.target.value || null)}
              >
                <option value="">Helsinki</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-8">
              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500 mb-1">Suhdeluvut</span>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  <button className="px-3 py-1 text-xs bg-blue-100 text-blue-800 font-medium">Kpl</button>
                  <button className="px-3 py-1 text-xs bg-white text-slate-600 border-l border-slate-300">%-osuus</button>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500 mb-1">Näytä ehdokkaista</span>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  <button className="px-3 py-1 text-xs bg-blue-100 text-blue-800 font-medium">30</button>
                  <button className="px-3 py-1 text-xs bg-white text-slate-600 border-l border-slate-300">Kaikki</button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex gap-6">
            {/* Puolueet Chart */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-center font-medium text-slate-700 mb-4">Puolueet<br /><span className="text-xs text-slate-500 font-normal">{selectedArea || 'Helsinki'}</span></h3>
              <div className="flex-1 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={partyVotes} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="party" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={40} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                      {partyVotes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PARTY_COLORS[entry.party] || PARTY_COLORS['OTHER']} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ehdokkaat Chart */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-center font-medium text-slate-700 mb-4">Ehdokkaat<br /><span className="text-xs text-slate-500 font-normal">{selectedArea || 'Helsinki'}</span></h3>
              <div className="flex-1 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={candidateVotes} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="candidate" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={12}>
                      {candidateVotes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PARTY_COLORS[entry.party] || PARTY_COLORS['OTHER']} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Legend */}
          <div className="p-4 border-t border-slate-200 flex justify-center space-x-4 flex-wrap gap-y-2 text-xs">
            {Object.entries(PARTY_COLORS).filter(([p]) => p !== 'OTHER').map(([party, color]) => (
              <div key={party} className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></span>
                <span className="font-medium">{party}</span>
              </div>
            ))}
          </div>
        </div>
      </main >
    </div >
  );
}
