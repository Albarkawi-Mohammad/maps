import type { FavoriteLocation, LocationCategoryType } from '../types/favorites';
import { classifyLocation } from './favoriteCategory';

const STORAGE_KEY = 'apple_maps_favorites_v1';

const INITIAL_FAVORITES: FavoriteLocation[] = [
  {
    id: 'fav-1',
    name: 'Pizzeria Trattoria Trevi',
    address: 'Bült 2, 48143 Münster',
    coordinate: [7.6291, 51.9625],
    category: 'food',
    emoji: '🍕',
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: 'fav-2',
    name: 'Café Extrablatt Münster',
    address: 'Salzstraße 11, 48143 Münster',
    coordinate: [7.6300, 51.9615],
    category: 'coffee',
    emoji: '☕',
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 'fav-3',
    name: 'Aasee Ufer Beach & Promenade',
    address: 'Bismarckallee 47, 48151 Münster',
    coordinate: [7.6150, 51.9520],
    category: 'water',
    emoji: '🌊',
    createdAt: Date.now() - 86400000
  },
  {
    id: 'fav-4',
    name: 'Home',
    address: 'Studtstraße 42, 48149 Münster',
    coordinate: [7.6200, 51.9760],
    category: 'home',
    emoji: '🏠',
    createdAt: Date.now() - 86400000 * 5
  },
  {
    id: 'fav-5',
    name: 'Historic City Hall',
    address: 'Prinzipalmarkt 10, 48143 Münster',
    coordinate: [7.6279, 51.9616],
    category: 'other',
    emoji: '⭐', // Uncategorized place defaults to Star
    createdAt: Date.now() - 86400000 * 4
  }
];

export const favoritesStorage = {
  getFavorites(): FavoriteLocation[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FAVORITES));
        return INITIAL_FAVORITES;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_FAVORITES;
    }
  },

  addFavorite(
    name: string,
    address: string,
    coordinate: [number, number],
    forcedCategory?: LocationCategoryType,
    forcedEmoji?: string
  ): FavoriteLocation {
    const favorites = this.getFavorites();

    // Check if place already exists
    const existingIndex = favorites.findIndex(
      (f) =>
        f.name.toLowerCase() === name.toLowerCase() ||
        (Math.abs(f.coordinate[0] - coordinate[0]) < 0.0001 &&
          Math.abs(f.coordinate[1] - coordinate[1]) < 0.0001)
    );

    const classified = classifyLocation(name, address);
    const category = forcedCategory || classified.category;
    const emoji = forcedEmoji || classified.emoji;

    if (existingIndex >= 0) {
      // Update existing
      const updatedItem: FavoriteLocation = {
        ...favorites[existingIndex],
        name,
        address,
        coordinate,
        category,
        emoji
      };
      favorites[existingIndex] = updatedItem;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      return updatedItem;
    }

    const newItem: FavoriteLocation = {
      id: `fav-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      address,
      coordinate,
      category,
      emoji,
      createdAt: Date.now()
    };

    const updated = [newItem, ...favorites];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newItem;
  },

  removeFavorite(id: string): FavoriteLocation[] {
    const favorites = this.getFavorites();
    const filtered = favorites.filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  },

  isFavorite(name: string, coordinate?: [number, number]): boolean {
    const favorites = this.getFavorites();
    return favorites.some((f) => {
      if (f.name.toLowerCase() === name.toLowerCase()) return true;
      if (
        coordinate &&
        Math.abs(f.coordinate[0] - coordinate[0]) < 0.0001 &&
        Math.abs(f.coordinate[1] - coordinate[1]) < 0.0001
      ) {
        return true;
      }
      return false;
    });
  }
};
