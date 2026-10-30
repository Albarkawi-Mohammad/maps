import type { LocationCategoryType } from '../types/favorites';
import { classifyLocation } from './favoriteCategory';
import { SAMPLE_POIS } from './samplePois';

export interface ReverseGeocodeResult {
  name: string;
  address: string;
  category: LocationCategoryType;
  categoryLabel: string;
  amenityType?: string;
  osmId?: string | number;
}

// In-memory cache to avoid redundant network requests when tapping the same area
const geocodeCache = new Map<string, ReverseGeocodeResult>();

/**
 * Resolves full place details from latitude and longitude.
 * 1. Checks memory cache
 * 2. Checks nearest local sample POI (within ~40m)
 * 3. Queries OSM Nominatim with 3.5s timeout
 * 4. Falls back to clean street address or coordinates
 */
export async function reverseGeocodeCoordinate(
  coord: [number, number] // [lng, lat]
): Promise<ReverseGeocodeResult> {
  const [lng, lat] = coord;
  const cacheKey = `${lng.toFixed(5)},${lat.toFixed(5)}`;

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Check if clicking directly near a known pre-cataloged POI (within ~40m)
  for (const poi of SAMPLE_POIS) {
    const dLng = (poi.coordinate[0] - lng) * 111320 * Math.cos((lat * Math.PI) / 180);
    const dLat = (poi.coordinate[1] - lat) * 110540;
    const distMeters = Math.hypot(dLng, dLat);

    if (distMeters < 40) {
      const res: ReverseGeocodeResult = {
        name: poi.name,
        address: poi.address,
        category: poi.predictedCategory,
        categoryLabel: poi.categoryLabel,
        amenityType: poi.predictedCategory
      };
      geocodeCache.set(cacheKey, res);
      return res;
    }
  }

  // Query Komoot Photon reverse geocoder (CORS-friendly, OpenStreetMap-backed, ultra-fast)
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`;
    const response = await fetch(photonUrl, {
      signal: AbortSignal.timeout(3000),
      headers: {
        Accept: 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const props = data.features[0].properties || {};
        const specificName = props.name || '';
        const street = props.street || '';
        const housenumber = props.housenumber ? ` ${props.housenumber}` : '';
        const postcode = props.postcode ? `${props.postcode} ` : '';
        const city = props.city || props.town || props.village || 'Münster';

        const roadAddress = street
          ? `${street}${housenumber}, ${postcode}${city}`
          : `${city}`;

        const primaryTitle = specificName.trim()
          ? specificName.trim()
          : street
          ? `${street}${housenumber}`
          : `Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;

        const amenityType = props.osm_value || props.osm_key || props.type || 'place';
        const classified = classifyLocation(primaryTitle, roadAddress, `${amenityType} ${props.type || ''}`);

        const result: ReverseGeocodeResult = {
          name: primaryTitle,
          address: roadAddress,
          category: classified.category,
          categoryLabel: classified.categoryLabel,
          amenityType,
          osmId: props.osm_id
        };

        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Photon reverse geocode lookup failed, attempting fallback:', err);
  }

  // Secondary fallback: OSM Nominatim
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lon=${lng}&lat=${lat}&zoom=18&addressdetails=1`;
    const response = await fetch(nominatimUrl, {
      signal: AbortSignal.timeout(3000),
      headers: {
        Accept: 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const specificName =
        data.name ||
        addr.amenity ||
        addr.shop ||
        addr.building ||
        addr.tourism ||
        addr.restaurant ||
        '';

      const street = addr.road || addr.pedestrian || addr.footway || '';
      const housenumber = addr.house_number ? ` ${addr.house_number}` : '';
      const postcode = addr.postcode ? `${addr.postcode} ` : '';
      const city = addr.city || addr.town || addr.village || 'Münster';

      const roadAddress = street ? `${street}${housenumber}, ${postcode}${city}` : `${city}`;
      const primaryTitle = specificName.trim()
        ? specificName.trim()
        : street
        ? `${street}${housenumber}`
        : `Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;

      const amenityType = data.type || data.class || addr.amenity || addr.shop || 'place';
      const classified = classifyLocation(primaryTitle, roadAddress, amenityType);

      const result: ReverseGeocodeResult = {
        name: primaryTitle,
        address: roadAddress,
        category: classified.category,
        categoryLabel: classified.categoryLabel,
        amenityType,
        osmId: data.osm_id
      };

      geocodeCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // ignore secondary failure
  }

  // Graceful offline fallback
  const fallbackTitle = `Location at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  const fallbackResult: ReverseGeocodeResult = {
    name: fallbackTitle,
    address: 'Selected Road Point, Münster',
    category: 'other',
    categoryLabel: 'Saved Star',
    amenityType: 'coordinate'
  };

  geocodeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}
