import React from 'react';
import type { LocationCategoryType } from '../../types/favorites';
import {
  HomeIcon,
  StarFilledIcon,
  SewingPinFilledIcon,
  BackpackIcon,
  ArchiveIcon,
  IdCardIcon,
  RocketIcon,
  GlobeIcon,
  HeartFilledIcon,
  TimerIcon,
  CookieIcon,
  MagnifyingGlassIcon,
  BookmarkFilledIcon
} from '@radix-ui/react-icons';

export interface CategoryIconProps {
  category: LocationCategoryType | 'drive' | 'pin' | 'saved' | 'all' | 'search' | string;
  size?: number;
  color?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 16,
  color = 'currentColor',
  className = ''
}) => {
  const style = { width: size, height: size, color };

  switch (category) {
    case 'food':
      return <CookieIcon style={style} className={className} />;
    case 'coffee':
      return <TimerIcon style={style} className={className} />;
    case 'water':
      return <BackpackIcon style={style} className={className} />;
    case 'home':
      return <HomeIcon style={style} className={className} />;
    case 'work':
      return <IdCardIcon style={style} className={className} />;
    case 'shop':
      return <ArchiveIcon style={style} className={className} />;
    case 'drive':
      return <RocketIcon style={style} className={className} />;
    case 'pin':
      return <SewingPinFilledIcon style={style} className={className} />;
    case 'saved':
      return <BookmarkFilledIcon style={style} className={className} />;
    case 'all':
      return <GlobeIcon style={style} className={className} />;
    case 'search':
      return <MagnifyingGlassIcon style={style} className={className} />;
    case 'heart':
      return <HeartFilledIcon style={style} className={className} />;
    case 'other':
    default:
      return <StarFilledIcon style={style} className={className} />;
  }
};

export default CategoryIcon;
