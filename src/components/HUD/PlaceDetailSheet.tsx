import React, { useState, useRef } from 'react';
import type { InspectedPlace } from '../../types/favorites';
import { soundManager } from '../../spatial/soundEffects';
import {
  Share1Icon,
  Cross2Icon,
  RocketIcon,
  GlobeIcon,
  PlusIcon,
  StarFilledIcon,
  StarIcon,
  HeartFilledIcon,
  HeartIcon,
  DotsHorizontalIcon,
  CheckCircledIcon,
  SewingPinFilledIcon,
  MobileIcon,
  IdCardIcon
} from '@radix-ui/react-icons';

export interface PlaceDetailSheetProps {
  place: InspectedPlace | null;
  onClose: () => void;
  onDirections: (place: InspectedPlace) => void;
  onToggleFavorite: (place: InspectedPlace) => void;
  isFavorite: boolean;
  userPosition?: [number, number];
}

function rubberBand(distance: number, dimension: number, constant = 0.55): number {
  return (distance * dimension * constant) / (dimension + constant * Math.abs(distance));
}

export const PlaceDetailSheet: React.FC<PlaceDetailSheetProps> = ({
  place,
  onClose,
  onDirections,
  onToggleFavorite,
  isFavorite,
  userPosition
}) => {
  const [liked, setLiked] = useState(false);
  const [guideAdded, setGuideAdded] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startClientYRef = useRef(0);
  const pointerHistoryRef = useRef<Array<{ y: number; time: number }>>([]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = true;
    startClientYRef.current = e.clientY;
    pointerHistoryRef.current = [{ y: e.clientY, time: performance.now() }];
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !sheetRef.current) return;
    const now = performance.now();
    pointerHistoryRef.current.push({ y: e.clientY, time: now });
    pointerHistoryRef.current = pointerHistoryRef.current.filter((sample) => now - sample.time < 120);

    const deltaY = e.clientY - startClientYRef.current;
    let clampedY = deltaY;
    if (deltaY < 0) {
      clampedY = rubberBand(deltaY, 260, 0.55);
    }
    sheetRef.current.style.transform = `translate3d(0, ${clampedY}px, 0)`;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !sheetRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const history = pointerHistoryRef.current;
    let velocityY = 0;
    if (history.length >= 2) {
      const oldest = history[0];
      const newest = history[history.length - 1];
      const dt = (newest.time - oldest.time) / 1000;
      if (dt > 0.01) {
        velocityY = (newest.y - oldest.y) / dt;
      }
    }

    const currentDeltaY = e.clientY - startClientYRef.current;
    if (currentDeltaY > 110 || velocityY > 600) {
      sheetRef.current.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      sheetRef.current.style.transform = 'translate3d(0, 100%, 0)';
      setTimeout(() => {
        onClose();
      }, 250);
    } else {
      sheetRef.current.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)';
      sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
  };

  if (!place) return null;

  // Real distance and travel time calculation from user's GPS position
  let distanceDisplay = 'Nearby';
  let travelMinutes = 12;

  if (userPosition && place.coordinate) {
    const dLng = (place.coordinate[0] - userPosition[0]) * 111.32 * Math.cos((userPosition[1] * Math.PI) / 180);
    const dLat = (place.coordinate[1] - userPosition[1]) * 110.54;
    const directKm = Math.max(0.1, Math.hypot(dLng, dLat) * 1.3);
    const distM = Math.round(directKm * 1000);
    distanceDisplay = distM > 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`;
    travelMinutes = Math.max(1, Math.round((directKm / 42) * 60));
  } else if (place.distanceMeters) {
    distanceDisplay = place.distanceMeters > 1000 ? `${(place.distanceMeters / 1000).toFixed(1)} km` : `${place.distanceMeters} m`;
  }

  const isClosed = place.isClosedToday !== undefined ? place.isClosedToday : false;
  const hoursText = place.hours || (isClosed ? 'Closed Today' : 'Open until 22:00');
  const ratingText = place.ratingPercent ? `${place.ratingPercent}%` : '98%';
  const ratingsCount = place.ratingCount || 34;

  // Category-specific high-resolution photography
  const getCategoryPhotos = () => {
    if (place.photos && place.photos.length > 0) return place.photos;
    switch (place.category) {
      case 'coffee':
        return [
          { title: 'Espresso Bar', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80' },
          { title: 'Pastry & Seating', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80' }
        ];
      case 'water':
        return [
          { title: 'Waterfront Promenade', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
          { title: 'Pier & View', url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=600&q=80' }
        ];
      case 'home':
        return [
          { title: 'Residence', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' }
        ];
      case 'work':
        return [
          { title: 'Campus & Offices', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80' }
        ];
      case 'shop':
        return [
          { title: 'Storefront', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80' },
          { title: 'Aisles & Goods', url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80' }
        ];
      case 'food':
      default:
        return [
          { title: 'Dining Room', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80' },
          { title: 'Bar & Atmosphere', url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80' }
        ];
    }
  };

  const photos = getCategoryPhotos();

  const handleShare = () => {
    soundManager.playClickSound();
    if (navigator.share) {
      navigator.share({
        title: place.name,
        text: `${place.name} • ${place.address}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${place.name}, ${place.address}`);
    }
  };

  return (
    <div className="ios-place-detail-sheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="ios-place-detail-sheet"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Grabber Handle for fluid drag-to-dismiss */}
        <div className="ios-sheet-grabber-zone" style={{ cursor: 'grab', marginBottom: '4px' }}>
          <div className="ios-sheet-grabber-pill" />
        </div>

        {/* Top Header Bar */}
        <div className="ios-place-header-bar">
          <button className="ios-circle-icon-btn share-btn" onClick={handleShare} title="Share Place">
            <Share1Icon width={18} height={18} color="#007aff" />
          </button>

          <div className="ios-place-header-center">
            <h2 className="ios-place-header-title">{place.name}</h2>
            <div className="ios-place-header-subtitle">
              {place.categoryLabel || 'Popular Place'} • {distanceDisplay} away
            </div>
          </div>

          <button className="ios-circle-icon-btn close-btn" onClick={onClose} title="Close Place Card">
            <Cross2Icon width={18} height={18} color="#8e8e93" />
          </button>
        </div>

        {/* Primary Action Buttons Row (Directions, Call, Website) */}
        <div className="ios-place-action-buttons-row">
          <button
            className="ios-action-pill-btn primary-drive-pill"
            onClick={() => {
              soundManager.playClickSound();
              onDirections(place);
            }}
          >
            <RocketIcon width={18} height={18} color="#ffffff" />
            <span className="pill-bold-label">{travelMinutes} min</span>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>Route</span>
          </button>

          <button
            className="ios-action-pill-btn secondary-frosted-pill"
            onClick={() => {
              soundManager.playClickSound();
              if (place.phone) window.open(`tel:${place.phone}`);
            }}
          >
            <MobileIcon width={16} height={16} color="#007aff" />
            <span>Call</span>
          </button>

          <button
            className="ios-action-pill-btn secondary-frosted-pill"
            onClick={() => {
              soundManager.playClickSound();
              if (place.website) window.open(place.website, '_blank');
            }}
          >
            <GlobeIcon width={16} height={16} color="#007aff" />
            <span>Website</span>
          </button>
        </div>

        {/* Quick Info Summary Grid */}
        <div className="ios-place-info-summary-grid">
          <div className="ios-info-metric-col">
            <div className="metric-header-label">Hours</div>
            <div className={`metric-value-text ${isClosed ? 'status-closed-red' : 'status-open-green'}`}>
              {hoursText}
            </div>
          </div>

          <div className="ios-info-metric-col">
            <div className="metric-header-label">{ratingsCount} Reviews</div>
            <div className="metric-value-text rating-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircledIcon width={15} height={15} color="#007aff" />
              <span>{ratingText}</span>
            </div>
          </div>

          <div className="ios-info-metric-col">
            <div className="metric-header-label">Payment</div>
            <div className="metric-value-text card-value">
              <IdCardIcon width={17} height={17} color="#3c3c43" />
              <span className="contactless-symbol" title="Cards & Apple Pay Accepted">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3c3c43" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M4 10a8 8 0 0 1 8 8" />
                  <path d="M4 14a4 4 0 0 1 4 4" />
                </svg>
              </span>
            </div>
          </div>

          <div className="ios-info-metric-col">
            <div className="metric-header-label">Distance</div>
            <div className="metric-value-text distance-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SewingPinFilledIcon width={15} height={15} color="#007aff" />
              <span>{distanceDisplay}</span>
            </div>
          </div>
        </div>

        {/* Photos Row */}
        <div className="ios-place-photos-scroll-row">
          {photos.map((photo, idx) => (
            <div key={idx} className="ios-photo-card">
              <img src={photo.url} alt={photo.title} className="ios-photo-img" />
              <div className="ios-photo-label-overlay">
                <span>{photo.title}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Action Capsule at Bottom (+, ⭐, 👍, •••) */}
        <div className="ios-place-floating-bottom-capsule">
          <button
            className={`capsule-action-btn ${guideAdded ? 'is-active' : ''}`}
            onClick={() => {
              soundManager.playClickSound();
              setGuideAdded(!guideAdded);
            }}
            title={guideAdded ? 'Saved to Guide' : 'Add to Guide'}
          >
            <PlusIcon width={20} height={20} color={guideAdded ? '#007aff' : '#3c3c43'} />
          </button>

          <button
            className={`capsule-action-btn ${isFavorite ? 'is-favorite' : ''}`}
            onClick={() => {
              soundManager.playClickSound();
              onToggleFavorite(place);
            }}
            title={isFavorite ? 'Remove Favorite' : 'Save as Favorite'}
          >
            {isFavorite ? (
              <StarFilledIcon width={19} height={19} color="#ff9500" />
            ) : (
              <StarIcon width={19} height={19} color="#3c3c43" />
            )}
          </button>

          <button
            className={`capsule-action-btn ${liked ? 'is-active' : ''}`}
            onClick={() => {
              soundManager.playClickSound();
              setLiked(!liked);
            }}
            title="Like this place"
          >
            {liked ? (
              <HeartFilledIcon width={18} height={18} color="#ff2d55" />
            ) : (
              <HeartIcon width={18} height={18} color="#3c3c43" />
            )}
          </button>

          <button
            className="capsule-action-btn"
            onClick={handleShare}
            title="Share Place"
          >
            <DotsHorizontalIcon width={20} height={20} color="#3c3c43" />
          </button>
        </div>
      </div>
    </div>
  );
};
