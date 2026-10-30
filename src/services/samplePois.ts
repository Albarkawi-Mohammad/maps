import type { SearchResultItem } from '../types/favorites';
import { classifyLocation } from './favoriteCategory';

interface RawPoi {
  name: string;
  address: string;
  coordinate: [number, number]; // [lng, lat]
}

const RAW_POIS: RawPoi[] = [
  // Featured Bar from Design Mockup
  {
    name: 'Хулиган',
    address: 'Near Krasnoarmejska • Bar & Cocktails',
    coordinate: [7.6275, 51.9610]
  },
  // Food / Restaurants
  {
    name: 'Pizzeria Trattoria Trevi',
    address: 'Bült 2, 48143 Münster',
    coordinate: [7.6291, 51.9625]
  },
  {
    name: 'Hans im Glück Burgergrill',
    address: 'Salzstraße 24, 48143 Münster',
    coordinate: [7.6315, 51.9610]
  },
  {
    name: 'Ramen & Sushi Bar Tokyo',
    address: 'Königsstraße 45, 48143 Münster',
    coordinate: [7.6258, 51.9585]
  },
  {
    name: 'Brauhaus Pinkus Müller',
    address: 'Kreuzstraße 4, 48143 Münster',
    coordinate: [7.6234, 51.9652]
  },

  // Coffee & Cafés
  {
    name: 'Café Extrablatt Münster',
    address: 'Salzstraße 11, 48143 Münster',
    coordinate: [7.6300, 51.9615]
  },
  {
    name: 'Roestbar Kaffeerösterei & Espresso',
    address: 'Nordstraße 2, 48149 Münster',
    coordinate: [7.6205, 51.9702]
  },
  {
    name: 'Bäckerei & Café Krimphove',
    address: 'Michaelisplatz 1, 48143 Münster',
    coordinate: [7.6240, 51.9620]
  },

  // Beside the Sea, Water, Beach & Lake
  {
    name: 'Aasee Ufer Beach & Promenade',
    address: 'Bismarckallee 47, 48151 Münster',
    coordinate: [7.6150, 51.9520]
  },
  {
    name: 'Marina Hafen & Pier Bar',
    address: 'Hafenweg 18, 48155 Münster',
    coordinate: [7.6390, 51.9505]
  },
  {
    name: 'Dortmund-Ems-Kanal Strandbad',
    address: 'Kanalpromenade 12, 48155 Münster',
    coordinate: [7.6520, 51.9580]
  },

  // Work & Office
  {
    name: 'Tech Campus & Innovation Hub',
    address: 'Mendelstraße 11, 48149 Münster',
    coordinate: [7.6020, 51.9680]
  },

  // Shops, Markets & Retail
  {
    name: 'Rewe Supermarket City',
    address: 'Rothenburg 44, 48143 Münster',
    coordinate: [7.6261, 51.9608]
  },
  {
    name: 'Edeka Center Shopping Mall',
    address: 'Steinfurter Straße 100, 48149 Münster',
    coordinate: [7.6090, 51.9740]
  },
  {
    name: 'Buchhandlung Thalia Bookstore',
    address: 'Salzstraße 56, 48143 Münster',
    coordinate: [7.6320, 51.9608]
  },
  {
    name: 'Engel-Apotheke Pharmacy & Care',
    address: 'Prinzipalmarkt 40, 48143 Münster',
    coordinate: [7.6285, 51.9618]
  },

  // Default / Uncategorized (will be assigned a Star)
  {
    name: 'Historisches Rathaus Münster',
    address: 'Prinzipalmarkt 10, 48143 Münster',
    coordinate: [7.6279, 51.9616]
  },
  {
    name: 'St.-Paulus-Dom Kathedrale',
    address: 'Domplatz 28, 48143 Münster',
    coordinate: [7.6256, 51.9630]
  },
  {
    name: 'Botanischer Garten Pavillon',
    address: 'Schlossgarten 3, 48149 Münster',
    coordinate: [7.6105, 51.9642]
  }
];

/**
 * Pre-classified searchable POI catalog
 */
export const SAMPLE_POIS: SearchResultItem[] = RAW_POIS.map((poi, idx) => {
  const classified = classifyLocation(poi.name, poi.address);
  return {
    id: `poi-${idx + 1}`,
    name: poi.name,
    address: poi.address,
    coordinate: poi.coordinate,
    predictedCategory: classified.category,
    predictedEmoji: classified.emoji,
    categoryLabel: classified.categoryLabel
  };
});

export const SAMPLE_SEARCH_RESULTS: SearchResultItem[] = SAMPLE_POIS;

/**
 * Returns POIs near the given center coordinate.
 * If user is near Münster, returns the Münster catalog.
 * If user is anywhere else in the world, generates realistic local POIs around them.
 */
export function getNearbyPois(center: [number, number] = [7.6261, 51.9607]): SearchResultItem[] {
  const [lng, lat] = center;
  const dLng = (lng - 7.6261) * 111.32 * Math.cos((lat * Math.PI) / 180);
  const dLat = (lat - 51.9607) * 110.54;
  const distFromMuensterKm = Math.hypot(dLng, dLat);

  if (distFromMuensterKm < 25) {
    return SAMPLE_POIS;
  }

  // Generates realistic local POIs clustered around the user's location
  const localTemplates = [
    { name: 'Artisan Coffee & Espresso', offset: [0.0025, 0.0018], cat: 'coffee', emoji: '☕', label: 'Café & Bakery', addr: 'Main Street • 200m away' },
    { name: 'Trattoria Bella Napoli', offset: [-0.0032, 0.0022], cat: 'food', emoji: '🍕', label: 'Italian Restaurant', addr: 'Piazza del Centro • 350m' },
    { name: 'Central Fresh Supermarket', offset: [0.0018, -0.0028], cat: 'shop', emoji: '🛒', label: 'Grocery & Market', addr: 'Market Plaza • 400m' },
    { name: 'Waterfront Park & Promenade', offset: [-0.0045, -0.0035], cat: 'water', emoji: '🌊', label: 'Waterfront & Beach', addr: 'Harbor Promenade • 600m' },
    { name: 'Tech Co-Working & Office Hub', offset: [0.0050, 0.0030], cat: 'work', emoji: '💼', label: 'Offices & Business', addr: 'Innovation Boulevard • 750m' },
    { name: 'Historic Town Square & Monument', offset: [0.0010, 0.0040], cat: 'other', emoji: '⭐', label: 'Historic Landmark', addr: 'Old Town Square • 500m' },
    { name: 'Boutique Burger & Bistro', offset: [-0.0020, -0.0015], cat: 'food', emoji: '🍔', label: 'Burger & Craft Drinks', addr: 'Avenue Central • 280m' },
    { name: 'Green Garden Botanical Park', offset: [0.0062, -0.0040], cat: 'water', emoji: '🌳', label: 'Public Park & Nature', addr: 'Parkway West • 850m' }
  ];

  return localTemplates.map((t, idx) => {
    const poiCoord: [number, number] = [
      Number((lng + t.offset[0]).toFixed(6)),
      Number((lat + t.offset[1]).toFixed(6))
    ];
    return {
      id: `local-poi-${idx + 1}`,
      name: t.name,
      address: t.addr,
      coordinate: poiCoord,
      predictedCategory: t.cat as any,
      predictedEmoji: t.emoji,
      categoryLabel: t.label
    };
  });
}


