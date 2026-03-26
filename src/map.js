import * as d3 from 'd3';
import { getColor } from './modes.js';

// Pre-project lon/lat → Mercator x/y so geoIdentity renders with correct aspect ratio
// and avoids D3's spherical winding issues.
function toMercator(lon, lat) {
  const x = lon * Math.PI / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  return [x, y];
}

function projectGeo(geo) {
  for (const f of geo.features) {
    const g = f.geometry;
    if (g.type === 'Polygon') {
      g.coordinates = g.coordinates.map(ring =>
        ring.map(([lon, lat]) => toMercator(lon, lat))
      );
    } else if (g.type === 'MultiPolygon') {
      g.coordinates = g.coordinates.map(poly =>
        poly.map(ring => ring.map(([lon, lat]) => toMercator(lon, lat)))
      );
    }
  }
}

export function initMap(geo, onSelectArea, onClearSelection) {
  projectGeo(geo);

  const svg = d3.select('#map');
  const g = svg.append('g');
  const container = document.getElementById('map-container');
  const { width, height } = container.getBoundingClientRect();
  const projection = d3.geoIdentity().reflectY(true)
    .fitExtent([[20, 20], [width - 20, height - 20]], geo);
  const pathGen = d3.geoPath().projection(projection);

  svg.call(
    d3.zoom().scaleExtent([0.5, 20]).on('zoom', e => g.attr('transform', e.transform))
  );

  const areas = g.selectAll('.area')
    .data(geo.features)
    .enter().append('path')
    .attr('class', 'area')
    .attr('d', pathGen)
    .attr('fill', d => getColor(d.properties, 'score'))
    .on('click', (event, d) => {
      onSelectArea(d.properties.nimi);
      event.stopPropagation();
    });

  svg.on('click', () => {
    areas.attr('stroke', '#1a1a2e').attr('stroke-width', 0.4);
    document.getElementById('info-content').innerHTML =
      '<h2>Valitse äänestysalue</h2>' +
      '<p class="placeholder">Klikkaa kartalta aluetta nähdäksesi potentiaalipisteet, äänestystiedot, puoluejakauman ja top 10 ehdokkaat.</p>';
    document.querySelectorAll('.rank-item').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.a-alue-box').forEach(el => el.classList.remove('selected'));
    onClearSelection?.();
  });

  // Re-fit projection on window resize
  window.addEventListener('resize', () => {
    const { width: w, height: h } = container.getBoundingClientRect();
    projection.fitExtent([[20, 20], [w - 20, h - 20]], geo);
    areas.attr('d', pathGen);
  });

  return areas;
}

export function updateMapColors(areas, mode) {
  areas.transition().duration(350).attr('fill', d => getColor(d.properties, mode));
}

export function highlightArea(areas, name) {
  areas
    .attr('stroke', d => d.properties.nimi === name ? '#fff' : '#1a1a2e')
    .attr('stroke-width', d => d.properties.nimi === name ? 1.8 : 0.4);
}
