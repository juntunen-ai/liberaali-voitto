import * as d3 from 'd3';
import { getColor } from './modes.js';

export function initMap(geo, onSelectArea) {
  const svg = d3.select('#map');
  const g = svg.append('g');
  const container = document.getElementById('map-container');
  const { width, height } = container.getBoundingClientRect();
  // Use geoIdentity (Cartesian) to avoid D3 spherical winding issues with this GeoJSON.
  // reflectY flips latitude so north is up.
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
      '<p class="placeholder">Klikkaa kartalta aluetta nähdäksesi konversiopisteet, äänestystiedot, puoluejakauman ja top 5 ehdokkaat.</p>';
    document.querySelectorAll('.rank-item').forEach(el => el.classList.remove('selected'));
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
