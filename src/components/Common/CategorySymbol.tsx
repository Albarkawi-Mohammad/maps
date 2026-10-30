import React from 'react';
import {
  Utensils,
  Coffee,
  Waves,
  Home,
  Briefcase,
  Star,
  Car,
  MapPin,
  ShoppingBag
} from 'lucide-react';
import type { LocationCategoryType } from '../../types/favorites';

interface Props {
  category: LocationCategoryType | 'drive' | 'pin';
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const CategorySymbol: React.FC<Props> = ({
  category,
  size = 18,
  color = 'currentColor',
  className = '',
  strokeWidth = 2.2
}) => {
  switch (category) {
    case 'food':
      return <Utensils size={size} color={color} className={className} strokeWidth={strokeWidth} />;
    case 'coffee':
      return <Coffee size={size} color={color} className={className} strokeWidth={strokeWidth} />;
    case 'water':
      return <Waves size={size} color={color} className={className} strokeWidth={strokeWidth} />;
    case 'home':
      return <Home size={size} color={color} className={className} strokeWidth={strokeWidth} />;
    case 'work':
      return <Briefcase size={size} color={color} className={className} strokeWidth={strokeWidth} />;
    case 'shop':
      return <ShoppingBag size={size} color={color} className={className} strokeWidth={strokeWidth} />;
    case 'drive':
      return <Car size={size} color={color} className={className} strokeWidth={strokeWidth} />;
    case 'pin':
      return <MapPin size={size} color={color} className={className} strokeWidth={strokeWidth} />;
    case 'other':
    default:
      return <Star size={size} color={color} className={className} strokeWidth={strokeWidth} />;
  }
};

/**
 * Generates raw SVG markup for MapLibre HTML markers (where React components cannot be mounted directly)
 */
export function getCategorySvgMarkup(category: LocationCategoryType | 'drive', size = 16, color = '#ffffff'): string {
  switch (category) {
    case 'food':
      return `
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path>
          <path d="M15 2v10"></path>
          <path d="M15 12v10"></path>
          <path d="M6 2v20"></path>
          <path d="M6 7h4a2 2 0 0 0 2-2V2"></path>
        </svg>
      `;
    case 'coffee':
      return `
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
          <line x1="6" x2="6" y1="2" y2="4"></line>
          <line x1="10" x2="10" y1="2" y2="4"></line>
          <line x1="14" x2="14" y1="2" y2="4"></line>
        </svg>
      `;
    case 'water':
      return `
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
          <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
          <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
        </svg>
      `;
    case 'home':
      return `
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      `;
    case 'work':
      return `
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      `;
    case 'shop':
      return `
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
          <path d="M3 6h18"></path>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
      `;
    case 'drive':
      return `
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.1 2 11.4V16c0 .6.4 1 1 1h2"></path>
          <circle cx="7" cy="17" r="2"></circle>
          <path d="M9 17h6"></path>
          <circle cx="17" cy="17" r="2"></circle>
        </svg>
      `;
    case 'other':
    default:
      return `
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      `;
  }
}
