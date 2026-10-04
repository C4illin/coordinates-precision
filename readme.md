# Coordinate Precision Visualizer

An interactive 3D web visualizer that demonstrates how decimal degrees in GPS coordinates translate to real-world physical area, scale, and curvature on Earth.

Built with **[MapLibre GL JS](https://maplibre.org/)** (using its native 3D Globe projection) and **[Pico CSS v2](https://picocss.com/)**.

---

## Why Lines Follow Lat/Long and Curve

When coordinates are represented with $N$ decimal places, they define a bounding box (or cell) on the Earth's surface bounded by lines of latitude (parallels) and longitude (meridians).

1. **Parallels Curve Across the Globe:** Every line of constant latitude (other than the Equator) is a *small circle* centered on the Earth's rotational axis. On a 3D globe projection, these lines curve across the sphere.
2. **Longitudinal Convergence:** The linear distance of 1° of longitude shrinks with the cosine of the latitude:
   $$\text{Width} = \text{Height} \times \cos(\text{latitude})$$
   - At the **Equator (0°)**: The cell is a 1:1 square.
   - At **Stockholm (59.3°)**: The width is roughly **51%** of its height.
   - At **Svalbard (78.2°)**: The width is only **20%** of its height, forming a tight curved wedge.

---

## Features

- **Inferred Precision Box:** Precision is inferred directly from the coordinate strings (e.g. typing `35.6` with rounding renders a single uncertainty box from `35.55` to `35.65`, with the marker at `35.60000000`).
- **Curved Boundary Densification:** The bounding box edges are dynamically densified along lines of latitude to follow true spherical parallels.
- **Full Graticule Lines:** Option to project the full parallel of latitude circling the globe and meridian pole-to-pole.
- **Real-World Scope & Scale:** Human-scale descriptions from continent scale (0 decimals, ~111 km) down to millimeter tectonic drift (8 decimals, ~1.1 mm).
- **Interactive Controls:**
  - Click anywhere on the globe to inspect coordinates.
  - Geolocation (GPS) button to test your current real-world location.
  - Light and Dark mode support with matching vector styles.
  - Globe/Mercator toggle control.

---

## Quick Reference Table

| Decimals | Step Size | Height (Lat) | Width at Equator | Width at 60° Lat | Real-World Scale |
|:---:|:---:|:---:|:---:|:---:|:---|
| **0** | `1.0°` | ~111 km | ~111 km | ~55.6 km | Country or large region |
| **1** | `0.1°` | ~11.1 km | ~11.1 km | ~5.56 km | Large city or metro district |
| **2** | `0.01°` | ~1.11 km | ~1.11 km | ~556 m | Town or village |
| **3** | `0.001°` | ~111 m | ~111 m | ~55.6 m | University campus / agricultural field |
| **4** | `0.0001°` | ~11.1 m | ~11.1 m | ~5.56 m | Residential parcel / house footprint |
| **5** | `0.00001°` | ~1.11 m | ~1.11 m | ~55.6 cm | Entrance door / parking space / tree |
| **6** | `0.000001°` | ~11.1 cm | ~11.1 cm | ~5.56 cm | Civilian handheld GPS / human head |
| **7** | `0.0000001°` | ~1.11 cm | ~1.11 cm | ~5.56 mm | Surveying benchmark / fingertip |
| **8** | `0.00000001°` | ~1.11 mm | ~1.11 mm | ~0.56 mm | Tectonic plate drift / microscopic |

---

## Development

```bash
# Install dependencies
npm install

# Start local preview
npm run dev

# Check linting and format code
npm run lint
npm run fmt
```

## Deployment

The app is completely static and located in the `docs/` folder, ready for instant deployment to GitHub Pages or any static host.

---

## License

[MIT](LICENSE) © 2026 Emrik Östling
