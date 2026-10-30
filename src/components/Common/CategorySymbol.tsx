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

export default CategorySymbol;
