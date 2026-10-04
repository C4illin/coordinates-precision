import * as maplibregl from "https://unpkg.com/maplibre-gl@^6.6.0/dist/maplibre-gl.mjs";

const EARTH_RADIUS = 6371008.8; // WGS84 mean radius in meters
const DEG_TO_RAD = Math.PI / 180;

const STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

const SCALE_DESCRIPTIONS = [
  {
    icon: "🌍",
    title: "Continent or Country",
    desc: "About 111 km across. Covers an entire country, state, or large geographic territory.",
  },
  {
    icon: "🏙️",
    title: "Metropolitan Area or Large City",
    desc: "About 11.1 km across. Differentiates neighboring cities or spans a large municipality.",
  },
  {
    icon: "🏘️",
    title: "Town or Village",
    desc: "About 1.1 km across. Identifies a neighborhood, small town, or municipal district.",
  },
  {
    icon: "🏫",
    title: "Neighborhood or Large Campus",
    desc: "About 111 m across. Identifies a university campus, agricultural field, or shopping center.",
  },
  {
    icon: "🏡",
    title: "Residential Parcel or Building",
    desc: "About 11.1 m across. Identifies an individual house, suburban parcel, or building footprint.",
  },
  {
    icon: "🚪",
    title: "Entrance Door or Individual Tree",
    desc: "About 1.11 m across. Identifies a parking space, doorway, or specific tree in a park.",
  },
  {
    icon: "📱",
    title: "Handheld GPS / Human Head",
    desc: "About 11.1 cm across. Standard accuracy limit for civilian handheld GPS and smartphones.",
  },
  {
    icon: "🔍",
    title: "Surveyor Benchmark / Fingertip",
    desc: "About 1.11 cm across. Commercial surveying equipment and high-precision geodesic baselines.",
  },
  {
    icon: "🔬",
    title: "Tectonic Drift / Pencil Tip",
    desc: "About 1.11 mm across. Used to measure continental plate movement and micro-faulting.",
  },
  {
    icon: "🧬",
    title: "Human Hair / Microscopic",
    desc: "About 111 µm across. Roughly the thickness of a strand of human hair.",
  },
  {
    icon: "🦠",
    title: "Cellular Scale / Red Blood Cell",
    desc: "About 11.1 µm across. Size of human red blood cells and microscopic dust particles.",
  },
  {
    icon: "🧪",
    title: "Bacterial Scale",
    desc: "About 1.11 µm across. Size of single-cell bacteria and fine aerosol droplets.",
  },
  {
    icon: "🧫",
    title: "Viral Scale / Extreme UV",
    desc: "About 111 nm across. Size of virus capsids and wavelength of extreme ultraviolet light.",
  },
  {
    icon: "⚛️",
    title: "Semiconductor Gate / DNA Helix",
    desc: "About 11.1 nm across. Width of DNA double helix and microchip transistor gates.",
  },
  {
    icon: "💎",
    title: "Molecular Scale (64-Bit Float Limit)",
    desc: "About 1.11 nm across. Size of a glucose molecule; physical limit of 64-bit float numbers.",
  },
];

// App State
const state = {
  showGraticule: true,
};

// UI Elements
const latInput = document.getElementById("latInput");
const lonInput = document.getElementById("lonInput");
const latInferredBadge = document.getElementById("latInferredBadge");
const lonInferredBadge = document.getElementById("lonInferredBadge");
const graticuleToggle = document.getElementById("graticuleToggle");
const gpsButton = document.getElementById("gpsButton");
const themeToggle = document.getElementById("themeToggle");

const scaleIcon = document.getElementById("scaleIcon");
const scaleTitle = document.getElementById("scaleTitle");
const scaleDesc = document.getElementById("scaleDesc");
const statHeight = document.getElementById("statHeight");
const statWidthMid = document.getElementById("statWidthMid");
const statRatio = document.getElementById("statRatio");
const statArea = document.getElementById("statArea");
const statWidthSouth = document.getElementById("statWidthSouth");
const statWidthNorth = document.getElementById("statWidthNorth");

// Detect initial theme
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
let currentTheme = prefersDark ? "dark" : "light";
document.documentElement.setAttribute("data-theme", currentTheme);

// Initialize MapLibre GL
const initialLat = Number.parseFloat(latInput.value) || 35.6;
const initialLon = Number.parseFloat(lonInput.value) || 139.7;

const map = new maplibregl.Map({
  container: "map",
  style: currentTheme === "dark" ? STYLES.dark : STYLES.light,
  center: [initialLon, initialLat],
  zoom: 11,
});

// Add Navigation and Globe controls
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
map.addControl(new maplibregl.GlobeControl(), "top-left");
map.addControl(new maplibregl.ScaleControl({ maxWidth: 140, unit: "metric" }), "bottom-left");

// Marker for target point with popup
const markerPopup = new maplibregl.Popup({ offset: 25 });
const pointMarker = new maplibregl.Marker({ color: "#ef4444" })
  .setLngLat([initialLon, initialLat])
  .setPopup(markerPopup)
  .addTo(map);

// Math and Coordinate Helpers
function cleanNumber(val, decimals = 16) {
  return Number(val.toFixed(Math.max(decimals, 0)));
}

/**
 * Counts decimal places from a coordinate string (e.g. "35.6" -> 1, "35.60" -> 2).
 */
function getDecimals(str) {
  const trimmed = str.trim();
  const dot = trimmed.indexOf(".");
  if (dot === -1) {
    return 0;
  }
  return trimmed.length - dot - 1;
}

function formatStepStr(val, decimals) {
  if (decimals <= 8) {
    return val.toFixed(decimals + 1);
  }
  return val.toExponential(1);
}

/**
 * Calculates min and max range for a single coordinate based on inferred precision.
 * e.g. val = 35.6 with decimals = 1: [35.55, 35.65]
 */
function calculateCoordRange(val, decimals) {
  const step = 10 ** -decimals;
  const half = step / 2;
  const min = cleanNumber(val - half, decimals + 2);
  const max = cleanNumber(val + half, decimals + 2);

  return { min, max, step, decimals };
}

/**
 * Inferred bounding box from the raw string inputs.
 */
function calculateInferredBox(latStr, lonStr) {
  const lat = Number.parseFloat(latStr) || 0;
  const lon = Number.parseFloat(lonStr) || 0;
  const latDec = Math.min(14, getDecimals(latStr));
  const lonDec = Math.min(14, getDecimals(lonStr));

  const latRange = calculateCoordRange(lat, latDec);
  const lonRange = calculateCoordRange(lon, lonDec);

  return {
    lat,
    lon,
    latDec,
    lonDec,
    maxPrecision: Math.max(latDec, lonDec),
    minLat: Math.max(-89.9999, latRange.min),
    maxLat: Math.min(89.9999, latRange.max),
    minLon: Math.max(-180, lonRange.min),
    maxLon: Math.min(180, lonRange.max),
    latStep: latRange.step,
    lonStep: lonRange.step,
  };
}

/**
 * Densifies coordinates along parallels of latitude so lines curve naturally on 3D globe.
 */
function createCurvedBoxFeature(box, properties = {}, samples = 48) {
  const coordinates = [];

  // South edge: from minLon to maxLon along constant minLat
  for (let i = 0; i <= samples; i++) {
    const lon = box.minLon + (i / samples) * (box.maxLon - box.minLon);
    coordinates.push([lon, box.minLat]);
  }

  // East edge: from minLat to maxLat along constant maxLon (meridian)
  for (let i = 1; i <= Math.floor(samples / 2); i++) {
    const lat = box.minLat + (i / Math.floor(samples / 2)) * (box.maxLat - box.minLat);
    coordinates.push([box.maxLon, lat]);
  }

  // North edge: from maxLon to minLon along constant maxLat
  for (let i = 1; i <= samples; i++) {
    const lon = box.maxLon - (i / samples) * (box.maxLon - box.minLon);
    coordinates.push([lon, box.maxLat]);
  }

  // West edge: from maxLat to minLat along constant minLon (meridian)
  for (let i = 1; i <= Math.floor(samples / 2); i++) {
    const lat = box.maxLat - (i / Math.floor(samples / 2)) * (box.maxLat - box.minLat);
    coordinates.push([box.minLon, lat]);
  }

  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}

function createGraticuleFeature(lat, lon) {
  // Full parallel of latitude circling the globe
  const parallelPoints = [];
  for (let i = -180; i <= 180; i += 2) {
    parallelPoints.push([i, lat]);
  }

  // Full meridian line pole-to-pole
  const meridianPoints = [];
  for (let i = -89.5; i <= 89.5; i += 2) {
    meridianPoints.push([lon, i]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { type: "parallel", label: `Parallel ${lat.toFixed(4)}°` },
        geometry: {
          type: "LineString",
          coordinates: parallelPoints,
        },
      },
      {
        type: "Feature",
        properties: { type: "meridian", label: `Meridian ${lon.toFixed(4)}°` },
        geometry: {
          type: "LineString",
          coordinates: meridianPoints,
        },
      },
    ],
  };
}

function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} km`;
  }
  if (meters >= 1) {
    return `${meters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m`;
  }
  if (meters >= 0.01) {
    return `${(meters * 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} cm`;
  }
  if (meters >= 0.001) {
    return `${(meters * 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} mm`;
  }
  if (meters >= 1e-6) {
    return `${(meters * 1e6).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} µm`;
  }
  return `${(meters * 1e9).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} nm`;
}

function formatArea(sqMeters) {
  if (sqMeters >= 1_000_000) {
    return `${(sqMeters / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} km²`;
  }
  if (sqMeters >= 1) {
    return `${sqMeters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m²`;
  }
  if (sqMeters >= 0.0001) {
    return `${(sqMeters * 10_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm²`;
  }
  if (sqMeters >= 1e-6) {
    return `${(sqMeters * 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} mm²`;
  }
  return `${(sqMeters * 1e12).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} µm²`;
}

function calculateMetrics(box) {
  const dLatRad = (box.maxLat - box.minLat) * DEG_TO_RAD;
  const dLonRad = (box.maxLon - box.minLon) * DEG_TO_RAD;

  const heightM = dLatRad * EARTH_RADIUS;
  const midLat = (box.minLat + box.maxLat) / 2;
  const midLatRad = midLat * DEG_TO_RAD;

  const widthMidM = dLonRad * EARTH_RADIUS * Math.cos(midLatRad);
  const widthSouthM = dLonRad * EARTH_RADIUS * Math.cos(box.minLat * DEG_TO_RAD);
  const widthNorthM = dLonRad * EARTH_RADIUS * Math.cos(box.maxLat * DEG_TO_RAD);

  // Exact spherical quadrilateral surface area formula
  const areaM2 =
    EARTH_RADIUS ** 2 *
    dLonRad *
    Math.abs(Math.sin(box.maxLat * DEG_TO_RAD) - Math.sin(box.minLat * DEG_TO_RAD));

  const cosLat = Math.cos(midLatRad);

  return {
    heightM,
    widthMidM,
    widthSouthM,
    widthNorthM,
    areaM2,
    ratio: Math.abs(cosLat),
  };
}

// Update Map & Visuals
function updateVisualization(shouldFitBounds = false) {
  const currentBox = calculateInferredBox(latInput.value, lonInput.value);
  const metrics = calculateMetrics(currentBox);

  // Update Inferred Badges
  const latHalf = currentBox.latStep / 2;
  const lonHalf = currentBox.lonStep / 2;
  latInferredBadge.textContent = `${currentBox.latDec} dec (±${formatStepStr(latHalf, currentBox.latDec)}°)`;
  lonInferredBadge.textContent = `${currentBox.lonDec} dec (±${formatStepStr(lonHalf, currentBox.lonDec)}°)`;

  // Update Scale Info
  const scaleIndex = Math.min(SCALE_DESCRIPTIONS.length - 1, currentBox.maxPrecision);
  const scaleInfo = SCALE_DESCRIPTIONS[scaleIndex];
  scaleIcon.textContent = scaleInfo.icon;
  scaleTitle.textContent = scaleInfo.title;
  scaleDesc.textContent = scaleInfo.desc;

  // Update Stats Table
  statHeight.textContent = formatDistance(metrics.heightM);
  statWidthMid.textContent = formatDistance(metrics.widthMidM);
  statRatio.textContent = metrics.ratio.toFixed(3);
  statArea.textContent = formatArea(metrics.areaM2);
  statWidthSouth.textContent = formatDistance(metrics.widthSouthM);
  statWidthNorth.textContent = formatDistance(metrics.widthNorthM);

  const markerDec = Math.max(8, currentBox.maxPrecision);

  // Update Marker Position and Popup
  pointMarker.setLngLat([currentBox.lon, currentBox.lat]);
  markerPopup.setHTML(`
    <div style="font-family: monospace; font-size: 0.82rem; line-height: 1.45;">
      <strong style="color: #2563eb;">📍 Exact Marker Location</strong><br/>
      Lat: <b>${currentBox.lat.toFixed(markerDec)}°</b><br/>
      Lon: <b>${currentBox.lon.toFixed(markerDec)}°</b>
      <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 0.76rem; color: #64748b;">
        Inferred bounds:<br/>
        Lat: [${currentBox.minLat.toFixed(currentBox.latDec + 1)}°, ${currentBox.maxLat.toFixed(currentBox.latDec + 1)}°]<br/>
        Lon: [${currentBox.minLon.toFixed(currentBox.lonDec + 1)}°, ${currentBox.maxLon.toFixed(currentBox.lonDec + 1)}°]
      </div>
    </div>
  `);

  if (!map.isStyleLoaded()) {
    return;
  }

  // 1. Single Active Precision Polygon
  const mainFeature = createCurvedBoxFeature(currentBox, {
    level: currentBox.maxPrecision,
  });

  const mainSource = map.getSource("precision-box");
  if (mainSource) {
    mainSource.setData({
      type: "FeatureCollection",
      features: [mainFeature],
    });
  }

  // 3. Full Graticule Parallel / Meridian Lines
  const graticuleSource = map.getSource("graticule-lines");
  if (graticuleSource) {
    graticuleSource.setData(
      state.showGraticule
        ? createGraticuleFeature(currentBox.lat, currentBox.lon)
        : { type: "FeatureCollection", features: [] },
    );
  }

  // Optional: Auto fit view to current box
  if (shouldFitBounds) {
    fitViewToBox(currentBox);
  }
}

function fitViewToBox(box = null) {
  const targetBox = box || calculateInferredBox(latInput.value, lonInput.value);
  map.fitBounds(
    [
      [targetBox.minLon, targetBox.minLat],
      [targetBox.maxLon, targetBox.maxLat],
    ],
    {
      padding: 60,
      duration: 1500,
      maxZoom: 22,
    },
  );
}

function setupLayers() {
  // Set 3D globe projection
  map.setProjection({ type: "globe" });

  // Source for full parallel and meridian lines
  if (!map.getSource("graticule-lines")) {
    map.addSource("graticule-lines", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.addLayer({
      id: "graticule-lines-layer",
      type: "line",
      source: "graticule-lines",
      paint: {
        "line-color": ["match", ["get", "type"], "parallel", "#38bdf8", "#818cf8"],
        "line-width": 1.5,
        "line-dasharray": [4, 4],
        "line-opacity": 0.8,
      },
    });
  }

  // Source for active precision box
  if (!map.getSource("precision-box")) {
    map.addSource("precision-box", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.addLayer({
      id: "precision-box-fill",
      type: "fill",
      source: "precision-box",
      paint: {
        "fill-color": "#2563eb",
        "fill-opacity": 0.22,
      },
    });

    map.addLayer({
      id: "precision-box-line",
      type: "line",
      source: "precision-box",
      paint: {
        "line-color": "#2563eb",
        "line-width": 2.5,
      },
    });
  }

  updateVisualization(false);
}

// Map event listeners
map.on("style.load", setupLayers);

map.on("click", (e) => {
  const currentBox = calculateInferredBox(latInput.value, lonInput.value);
  const p = Math.max(1, currentBox.maxPrecision);
  latInput.value = e.lngLat.lat.toFixed(p);
  lonInput.value = e.lngLat.lng.toFixed(p);
  updateVisualization(false);
});

// UI Event Handlers
// Real-time input handling for typed coordinates
function handleCoordInput() {
  updateVisualization(false);
}

latInput.addEventListener("input", handleCoordInput);
lonInput.addEventListener("input", handleCoordInput);

// Handle pasting "lat, lon" or "lat lon" into either input
function handlePaste(e) {
  const clipText = e.clipboardData?.getData("text") || "";
  if (clipText.includes(",") || clipText.includes(" ") || clipText.includes("\t")) {
    const parts = clipText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const p1 = Number.parseFloat(parts[0]);
      const p2 = Number.parseFloat(parts[1]);
      if (!Number.isNaN(p1) && !Number.isNaN(p2)) {
        e.preventDefault();
        latInput.value = parts[0];
        lonInput.value = parts[1];
        updateVisualization(true);
      }
    }
  }
}

latInput.addEventListener("paste", handlePaste);
lonInput.addEventListener("paste", handlePaste);

graticuleToggle.addEventListener("change", (e) => {
  state.showGraticule = e.target.checked;
  updateVisualization(false);
});

// GPS Position
gpsButton.addEventListener("click", () => {
  gpsButton.disabled = true;
  gpsButton.textContent = "Locating...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      latInput.value = String(pos.coords.latitude);
      lonInput.value = String(pos.coords.longitude);
      gpsButton.textContent = "📍 Use GPS";
      gpsButton.disabled = false;
      updateVisualization(true);
    },
    (err) => {
      console.warn("Geolocation failed:", err);
      gpsButton.textContent = "GPS Unavailable";
      gpsButton.disabled = false;
      setTimeout(() => {
        gpsButton.textContent = "📍 Use GPS";
      }, 3000);
    },
    { enableHighAccuracy: true, timeout: 8000 },
  );
});

// Theme switcher
themeToggle.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  map.setStyle(currentTheme === "dark" ? STYLES.dark : STYLES.light);
});
