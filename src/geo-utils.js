// Point-in-polygon ray casting (WGS84 coordinates)
function pointInRing(point, ring) {
  let inside = false;
  const [px, py] = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point, geometry) {
  if (geometry.type === 'Polygon') {
    return pointInRing(point, geometry.coordinates[0]);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(poly => pointInRing(point, poly[0]));
  }
  return false;
}

function getExteriorRing(feature) {
  return feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates[0][0]
    : feature.geometry.coordinates[0];
}

function computeCentroid(feature) {
  const coords = getExteriorRing(feature);
  let sx = 0, sy = 0;
  for (const [x, y] of coords) { sx += x; sy += y; }
  return [sx / coords.length, sy / coords.length];
}

// Sample multiple points from a polygon (centroid + grid samples)
function samplePoints(feature) {
  const coords = getExteriorRing(feature);
  const centroid = computeCentroid(feature);
  const points = [centroid];

  // Add midpoints between centroid and some vertices
  const step = Math.max(1, Math.floor(coords.length / 8));
  for (let i = 0; i < coords.length; i += step) {
    points.push([
      (centroid[0] + coords[i][0]) / 2,
      (centroid[1] + coords[i][1]) / 2,
    ]);
  }
  return points;
}

function distSq(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

// Extract name keywords for fuzzy matching (≥4 chars, uppercased)
function nameKeywords(name) {
  return name.toUpperCase().replace(/[-–]/g, ' ').split(/\s+/).filter(w => w.length >= 4);
}

// Returns Map<postalCode, string[]> where string[] = voting district names
export function buildPostalDistrictMapping(geoFeatures, postiFeatures) {
  const map = new Map();
  const postiCentroids = [];
  for (const pf of postiFeatures) {
    map.set(pf.properties.Posno, []);
    postiCentroids.push({ code: pf.properties.Posno, centroid: computeCentroid(pf) });
  }

  // Track which postal area each district is assigned to
  const districtAssignment = new Map();

  for (const gf of geoFeatures) {
    let matched = false;

    // Try multiple sample points from the district
    const points = samplePoints(gf);
    for (const pt of points) {
      for (const pf of postiFeatures) {
        if (pointInPolygon(pt, pf.geometry)) {
          map.get(pf.properties.Posno).push(gf.properties.nimi);
          districtAssignment.set(gf.properties.nimi, pf.properties.Posno);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    // Fallback: find nearest postal area centroid
    if (!matched) {
      const centroid = computeCentroid(gf);
      let nearest = null, minD = Infinity;
      for (const pc of postiCentroids) {
        const d = distSq(centroid, pc.centroid);
        if (d < minD) { minD = d; nearest = pc.code; }
      }
      if (nearest) {
        map.get(nearest).push(gf.properties.nimi);
        districtAssignment.set(gf.properties.nimi, nearest);
      }
    }
  }

  // Phase 2: Fix empty postal areas using name matching
  // Use the longest keyword and filter by municipality to avoid false positives
  const kuntaMap = { Helsinki: '091', Espoo: '049', Vantaa: '092' };
  for (const pf of postiFeatures) {
    const code = pf.properties.Posno;
    if (map.get(code).length > 0) continue;

    const postiName = pf.properties.Nimi || pf.properties.Toimip || '';
    const keywords = nameKeywords(postiName);
    if (keywords.length === 0) continue;

    // Use the longest keyword for most specific matching
    const longest = keywords.sort((a, b) => b.length - a.length)[0];
    const postiKunta = kuntaMap[pf.properties.Kunta] || '';

    for (const gf of geoFeatures) {
      const dName = gf.properties.nimi;
      const dKunta = gf.properties.kuntanro || '';
      // Match keyword and same municipality
      if (dName.includes(longest) && (!postiKunta || !dKunta || postiKunta === dKunta)) {
        map.get(code).push(dName);
      }
    }
  }

  // Phase 3: For still-empty areas, try reverse point-in-polygon
  // Sample points from the postal area and find which voting districts contain them
  for (const pf of postiFeatures) {
    const code = pf.properties.Posno;
    if (map.get(code).length > 0) continue;

    const postiPoints = samplePoints(pf);
    const found = new Set();

    for (const pt of postiPoints) {
      for (const gf of geoFeatures) {
        if (pointInPolygon(pt, gf.geometry)) {
          found.add(gf.properties.nimi);
        }
      }
    }

    if (found.size > 0) {
      map.get(code).push(...found);
    }
  }

  // Phase 4: Last resort — assign nearest voting district for still-empty areas
  for (const pf of postiFeatures) {
    const code = pf.properties.Posno;
    if (map.get(code).length > 0) continue;

    const pc = computeCentroid(pf);
    let nearest = null, minD = Infinity;
    for (const gf of geoFeatures) {
      const d = distSq(computeCentroid(gf), pc);
      if (d < minD) { minD = d; nearest = gf.properties.nimi; }
    }
    // Only assign if reasonably close (< ~3km in WGS84 degrees)
    if (nearest && minD < 0.001) {
      map.get(code).push(nearest);
    }
  }

  return map;
}
