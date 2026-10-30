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

/**
 * Returns raw Radix UI SVG string for MapLibre HTML marker elements.
 * 100% vector SVG, zero emojis, pixel-perfect Radix icons.
 */
export function getCategorySvgString(
  category: LocationCategoryType | string,
  size = 15,
  fillColor = '#ffffff'
): string {
  switch (category) {
    case 'home':
      return `<svg width="${size}" height="${size}" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.85355 0.646447C7.65829 0.451184 7.34171 0.451184 7.14645 0.646447L0.646447 7.14645C0.451184 7.34171 0.451184 7.65829 0.646447 7.85355C0.841709 8.04882 1.15829 8.04882 1.35355 7.85355L2 7.20711V13.5C2 13.7761 2.22386 14 2.5 14H6V9.5C6 9.22386 6.22386 9 6.5 9H8.5C8.77614 9 9 9.22386 9 9.5V14H12.5C12.7761 14 13 13.7761 13 13.5V7.20711L13.6464 7.85355C13.8417 8.04882 14.1583 8.04882 14.3536 7.85355C14.5488 7.65829 14.5488 7.34171 14.3536 7.14645L7.85355 0.646447ZM12 6.20711L7.5 1.70711L3 6.20711V13H5V9.5C5 8.67157 5.67157 8 6.5 8H8.5C9.32843 8 10 8.67157 10 9.5V13H12V6.20711Z" fill="${fillColor}" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

    case 'food':
      return `<svg width="${size}" height="${size}" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.0697 1.76746C12.4807 1.21947 11.4605 0.454311 11.0495 1.0023C10.6385 1.55028 11.6588 2.31544 12.0697 1.76746ZM8.39263 1.07811C7.15585 0.950602 5.7823 1.16348 4.58433 1.70937C3.38552 2.25563 2.32735 3.15309 1.78844 4.41832C1.37574 5.38724 1.01715 6.28113 1.00088 7.44354C0.984724 8.59844 1.30522 9.96898 2.13174 11.928C2.61142 13.0649 4.03963 13.5446 5.13895 13.8079C6.40836 14.1119 7.80857 14.1914 8.6644 14.0742C9.36515 13.9782 10.1448 13.8284 10.7987 13.297C11.8977 12.4039 12.9009 11.3955 13.4994 10.3393C14.104 9.27221 14.3256 8.09207 13.7216 6.95324C13.5628 6.65373 13.316 6.57734 13.0412 6.4923C12.9374 6.46016 12.8295 6.42678 12.7209 6.37966C11.6211 5.90234 10.9646 5.34963 10.9135 5.02876C10.8656 4.72808 10.9221 4.51463 10.9811 4.29181C11.0129 4.17199 11.0453 4.04947 11.0626 3.90922C11.0838 3.73737 11.0814 3.33319 10.6996 3.12761C10.4048 2.96888 10.2164 2.65843 10.0407 2.36904C9.99742 2.29775 9.95492 2.22773 9.9118 2.16158C9.62634 1.72367 9.20769 1.16213 8.39263 1.07811ZM4.99899 2.61935C3.96483 3.09058 3.12554 3.83097 2.70846 4.81018C2.29808 5.77368 2.01406 6.50873 2.00079 7.45753C1.98741 8.41385 2.25043 9.6368 3.0531 11.5393C3.39181 12.3421 4.62167 12.6557 5.37186 12.8354C6.5493 13.1174 7.822 13.1802 8.52868 13.0834C9.21271 12.9897 9.74568 12.8642 10.1681 12.5209C11.229 11.6587 12.121 10.7435 12.6293 9.84635C12.9349 9.30709 13.5141 7.7028 12.6292 7.3873C10.7539 6.71875 10.262 6.06669 9.99011 5.41268C9.80915 4.97744 9.82868 4.52282 9.95741 4.07885L9.95741 4.07884C9.97662 4.0126 9.99538 3.94791 10.0334 3.88882C9.81857 3.73676 9.6515 3.55195 9.51464 3.3715C9.42876 3.25828 9.3469 3.12099 9.26197 2.97856C9.01866 2.57052 8.75018 2.12027 8.29008 2.07283C7.22889 1.96343 6.03398 2.14772 4.99899 2.61935Z" fill="${fillColor}" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

    case 'coffee':
      return `<svg width="${size}" height="${size}" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.49998 0.849976C7.22383 0.849976 6.99998 1.07383 6.99998 1.34998V3.52234C6.99998 3.79848 7.22383 4.02234 7.49998 4.02234C7.77612 4.02234 7.99998 3.79848 7.99998 3.52234V1.8718C10.8862 2.12488 13.15 4.54806 13.15 7.49998C13.15 10.6204 10.6204 13.15 7.49998 13.15C4.37957 13.15 1.84998 10.6204 1.84998 7.49998C1.84998 6.10612 2.35407 4.83128 3.19049 3.8459C3.36919 3.63538 3.34339 3.31985 3.13286 3.14115C2.92234 2.96245 2.60681 2.98825 2.42811 3.19877C1.44405 4.35808 0.849976 5.86029 0.849976 7.49998C0.849976 11.1727 3.82728 14.15 7.49998 14.15C11.1727 14.15 14.15 11.1727 14.15 7.49998C14.15 3.82728 11.1727 0.849976 7.49998 0.849976ZM6.74049 8.08072L4.22363 4.57237C4.15231 4.47295 4.16346 4.33652 4.24998 4.25C4.33649 4.16348 4.47293 4.15233 4.57234 4.22365L8.08069 6.74051C8.56227 7.08599 8.61906 7.78091 8.19998 8.2C7.78089 8.61909 7.08597 8.56229 6.74049 8.08072Z" fill="${fillColor}" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

    case 'water':
      return `<svg width="${size}" height="${size}" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 1C5 0.447715 5.44772 0 6 0H9C9.55228 0 10 0.447715 10 1V2H14C14.5523 2 15 2.44772 15 3V6C15 6.8888 14.6131 7.68734 14 8.23608V11.5C14 12.3284 13.3284 13 12.5 13H2.5C1.67157 13 1 12.3284 1 11.5V8.2359C0.38697 7.68721 0 6.88883 0 6V3C0 2.44772 0.447716 2 1 2H5V1ZM9 1V2H6V1H9ZM1 3H5H5.5H9.5H10H14V6C14 6.654 13.6866 7.23467 13.1997 7.6004C12.8655 7.85144 12.4508 8 12 8H8V7.5C8 7.22386 7.77614 7 7.5 7C7.22386 7 7 7.22386 7 7.5V8H3C2.5493 8 2.1346 7.85133 1.80029 7.60022C1.31335 7.23446 1 6.65396 1 6V3ZM7 9H3C2.64961 9 2.31292 8.93972 2 8.82905V11.5C2 11.7761 2.22386 12 2.5 12H12.5C12.7761 12 13 11.7761 13 11.5V8.82915C12.6871 8.93978 12.3504 9 12 9H8V9.5C8 9.77614 7.77614 10 7.5 10C7.22386 10 7 9.77614 7 9.5V9Z" fill="${fillColor}" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

    case 'work':
      return `<svg width="${size}" height="${size}" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 11.0001V4.00006L1 4.00006L1 11.0001H14ZM15 4.00006V11.0001C15 11.5523 14.5523 12.0001 14 12.0001H1C0.447715 12.0001 0 11.5523 0 11.0001V4.00006C0 3.44778 0.447715 3.00006 1 3.00006H14C14.5523 3.00006 15 3.44778 15 4.00006ZM2 5.25C2 5.11193 2.11193 5 2.25 5H5.75C5.88807 5 6 5.11193 6 5.25V9.75C6 9.88807 5.88807 10 5.75 10H2.25C2.11193 10 2 9.88807 2 9.75V5.25ZM7.5 7C7.22386 7 7 7.22386 7 7.5C7 7.77614 7.22386 8 7.5 8H10.5C10.7761 8 11 7.77614 11 7.5C11 7.22386 10.7761 7 10.5 7H7.5ZM7 9.5C7 9.22386 7.22386 9 7.5 9H12.5C12.7761 9 13 9.22386 13 9.5C13 9.77614 12.7761 10 12.5 10H7.5C7.22386 10 7 9.77614 7 9.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5C7 5.77614 7.22386 6 7.5 6H11.5C11.7761 6 12 5.77614 12 5.5C12 5.22386 11.7761 5 11.5 5H7.5Z" fill="${fillColor}" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

    case 'shop':
      return `<svg width="${size}" height="${size}" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.30902 1C2.93025 1 2.58398 1.214 2.41459 1.55279L1.05279 4.27639C1.01807 4.34582 1 4.42238 1 4.5V13C1 13.5523 1.44772 14 2 14H13C13.5523 14 14 13.5523 14 13V4.5C14 4.42238 13.9819 4.34582 13.9472 4.27639L12.5854 1.55281C12.416 1.21403 12.0698 1.00003 11.691 1.00003L7.5 1.00001L3.30902 1ZM3.30902 2L7 2.00001V4H2.30902L3.30902 2ZM8 4V2.00002L11.691 2.00003L12.691 4H8ZM7.5 5H13V13H2V5H7.5ZM5.5 7C5.22386 7 5 7.22386 5 7.5C5 7.77614 5.22386 8 5.5 8H9.5C9.77614 8 10 7.77614 10 7.5C10 7.22386 9.77614 7 9.5 7H5.5Z" fill="${fillColor}" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

    case 'pin':
      return `<svg width="${size}" height="${size}" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3.5C10 4.70948 9.14112 5.71836 8 5.94999V13.5C8 13.7761 7.77614 14 7.5 14C7.22386 14 7 13.7761 7 13.5V5.94999C5.85888 5.71836 5 4.70948 5 3.5C5 2.11929 6.11929 1 7.5 1C8.88071 1 10 2.11929 10 3.5Z" fill="${fillColor}" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

    case 'saved':
      return `<svg width="${size}" height="${size}" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 2C3.22386 2 3 2.22386 3 2.5V13.5C3 13.6818 3.09864 13.8492 3.25762 13.9373C3.41659 14.0254 3.61087 14.0203 3.765 13.924L7.5 11.5896L11.235 13.924C11.3891 14.0203 11.5834 14.0254 11.7424 13.9373C11.9014 13.8492 12 13.6818 12 13.5V2.5C12 2.22386 11.7761 2 11.5 2H3.5Z" fill="${fillColor}" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

    case 'other':
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.22303 0.665992C7.32551 0.419604 7.67454 0.419604 7.77702 0.665992L9.41343 4.60039C9.45663 4.70426 9.55432 4.77523 9.66645 4.78422L13.914 5.12475C14.18 5.14607 14.2878 5.47802 14.0852 5.65162L10.849 8.42374C10.7636 8.49692 10.7263 8.61176 10.7524 8.72118L11.7411 12.866C11.803 13.1256 11.5206 13.3308 11.2929 13.1917L7.6564 10.9705C7.5604 10.9119 7.43965 10.9119 7.34365 10.9705L3.70718 13.1917C3.47945 13.3308 3.19708 13.1256 3.25899 12.866L4.24769 8.72118C4.2738 8.61176 4.23648 8.49692 4.15105 8.42374L0.914889 5.65162C0.712228 5.47802 0.820086 5.14607 1.08608 5.12475L5.3336 4.78422C5.44573 4.77523 5.54342 4.70426 5.58662 4.60039L7.22303 0.665992Z" fill="${fillColor}"></path></svg>`;
  }
}

export default CategoryIcon;
