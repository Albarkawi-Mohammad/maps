export type LocationCategoryType = 'food' | 'coffee' | 'water' | 'home' | 'work' | 'shop' | 'other';

export interface InspectedPlace {
  id: string;
  name: string;
  address: string;
  coordinate: [number, number]; // [lng, lat]
  category: LocationCategoryType;
  categoryLabel: string;
  amenityType?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  isFavorite?: boolean;
  hours?: string;
  isClosedToday?: boolean;
  ratingPercent?: number;
  ratingCount?: number;
  phone?: string;
  website?: string;
  acceptsCards?: boolean;
  photos?: Array<{ title: string; url: string }>;
  iconEmoji?: string;
}

export interface CategoryInfo {
  type: LocationCategoryType;
  label: string;
  emoji: string;
  symbol: string;
  color: string;
  gradient: string;
}

export interface FavoriteLocation {
  id: string;
  name: string;
  address: string;
  coordinate: [number, number]; // [lng, lat]
  category: LocationCategoryType;
  emoji: string;
  symbol?: string;
  createdAt: number;
  notes?: string;
}

export interface SearchResultItem {
  id: string;
  name: string;
  address: string;
  coordinate: [number, number];
  predictedCategory: LocationCategoryType;
  predictedEmoji: string;
  predictedSymbol?: string;
  categoryLabel: string;
  distanceMeters?: number;
}
