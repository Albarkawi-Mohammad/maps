import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  Cross2Icon,
  HomeIcon,
  IdCardIcon,
  PlusIcon,
  DotsHorizontalIcon,
  GlobeIcon,
  CookieIcon,
  TimerIcon,
  BackpackIcon,
  ArchiveIcon,
  BookmarkFilledIcon,
  SewingPinFilledIcon,
  ReloadIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  CheckIcon
} from '@radix-ui/react-icons';
import type {
  FavoriteLocation,
  InspectedPlace,
  LocationCategoryType,
  SearchResultItem
} from '../../types/favorites';
import { getNearbyPois } from '../../services/samplePois';
import { classifyLocation, CATEGORY_DEFINITIONS } from '../../services/favoriteCategory';
import { timelineStorage } from '../../services/timelineStorage';
import { soundManager } from '../../spatial/soundEffects';
import { CategoryIcon } from '../Common/CategoryIcon';

export type SheetDetent = 'peek' | 'half' | 'full';

export interface AppleMapsBottomSheetProps {
  favorites: FavoriteLocation[];
  onSelectPlace: (place: InspectedPlace) => void;
  onOpenTimeline: () => void;
  currentVehiclePosition: [number, number];
  isPlaceSelected?: boolean;
  onAddFavorite?: (
    name: string,
    address: string,
    coordinate: [number, number],
    category?: LocationCategoryType,
    emoji?: string
  ) => void;
}

const CATEGORY_CHIPS: Array<{
  id: LocationCategoryType | 'all';
  label: string;
  IconComponent: React.ComponentType<{ width?: number; height?: number; className?: string }>;
}> = [
  { id: 'all', label: 'All Places', IconComponent: GlobeIcon },
  { id: 'food', label: 'Dining', IconComponent: CookieIcon },
  { id: 'coffee', label: 'Cafés', IconComponent: TimerIcon },
  { id: 'water', label: 'Waterfront', IconComponent: BackpackIcon },
  { id: 'shop', label: 'Shops', IconComponent: ArchiveIcon },
  { id: 'other', label: 'Saved', IconComponent: BookmarkFilledIcon }
];

// Apple WWDC Designing Fluid Interfaces Constants & Physics
const PEEK_HEIGHT = 146;

function rubberBand(distance: number, dimension: number, constant = 0.55): number {
  return (distance * dimension * constant) / (dimension + constant * Math.abs(distance));
}

function projectMomentum(velocityPxPerSec: number, decelerationRate = 0.996): number {
  return ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

function computeDetents() {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const fullH = Math.min(vh - 44, Math.round(vh * 0.92));
  const halfH = Math.min(500, Math.round(vh * 0.50));
  const peekH = PEEK_HEIGHT;

  return {
    fullH,
    halfH,
    peekH,
    fullY: 0,
    halfY: Math.max(0, fullH - halfH),
    peekY: Math.max(0, fullH - peekH)
  };
}

function computeDetentY(d: SheetDetent): number {
  const { fullY, halfY, peekY } = computeDetents();
  switch (d) {
    case 'full':
      return fullY;
    case 'half':
      return halfY;
    case 'peek':
    default:
      return peekY;
  }
}

function computeDistanceFromVehicle(
  coord: [number, number],
  vehiclePos: [number, number]
): { distM: number; display: string } {
  const dLng =
    (coord[0] - vehiclePos[0]) * 111.32 * Math.cos((vehiclePos[1] * Math.PI) / 180);
  const dLat = (coord[1] - vehiclePos[1]) * 110.54;
  const directKm = Math.max(0.05, Math.hypot(dLng, dLat) * 1.25);
  const distM = Math.round(directKm * 1000);
  const display = distM > 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`;
  return { distM, display };
}

export const AppleMapsBottomSheet: React.FC<AppleMapsBottomSheetProps> = ({
  favorites,
  onSelectPlace,
  onOpenTimeline,
  currentVehiclePosition,
  isPlaceSelected = false,
  onAddFavorite
}) => {
  const [detent, setDetent] = useState<SheetDetent>('peek');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LocationCategoryType | 'all'>('all');
  const [liveSearchResults, setLiveSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  // Inline Add Custom Place state
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceAddress, setNewPlaceAddress] = useState('');
  const [newPlacePresetCat, setNewPlacePresetCat] = useState<LocationCategoryType | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Gesture tracking & physics state
  const isDraggingRef = useRef(false);
  const startClientYRef = useRef(0);
  const startSheetYRef = useRef(0);
  const currentVisualYRef = useRef(0);
  const pointerHistoryRef = useRef<Array<{ y: number; time: number }>>([]);
  const isTapCandidateRef = useRef(false);
  const dragStartTimeRef = useRef(0);

  const readVisualTranslateY = (el: HTMLElement): number => {
    const style = window.getComputedStyle(el);
    const matrixStr = style.transform || style.webkitTransform;
    if (!matrixStr || matrixStr === 'none') return computeDetentY(detent);
    try {
      const matrix = new DOMMatrixReadOnly(matrixStr);
      return matrix.m42;
    } catch {
      const match = matrixStr.match(/matrix.*\((.+)\)/);
      if (match) {
        const parts = match[1].split(', ');
        return parseFloat(parts[5] || parts[13] || '0');
      }
      return computeDetentY(detent);
    }
  };

  const animateToDetent = (targetDetent: SheetDetent) => {
    setDetent(targetDetent);
    if (!sheetRef.current) return;

    const targetY = computeDetentY(targetDetent);
    currentVisualYRef.current = targetY;

    // Apple WWDC fluid spring transition
    sheetRef.current.style.transition = 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)';
    sheetRef.current.style.transform = `translate3d(0, ${targetY}px, 0)`;
  };

  // Sync detent state with style on mount or state change
  useEffect(() => {
    if (isDraggingRef.current || !sheetRef.current) return;
    const targetY = computeDetentY(detent);
    currentVisualYRef.current = targetY;
    sheetRef.current.style.transition = 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)';
    sheetRef.current.style.transform = `translate3d(0, ${targetY}px, 0)`;
  }, [detent]);

  // Window resize handler to recalculate resting positions
  useEffect(() => {
    const handleResize = () => {
      if (isDraggingRef.current || !sheetRef.current) return;
      const targetY = computeDetentY(detent);
      currentVisualYRef.current = targetY;
      sheetRef.current.style.transition = 'none';
      sheetRef.current.style.transform = `translate3d(0, ${targetY}px, 0)`;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [detent]);

  // Fluid Direct Manipulation Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetRef.current) return;
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.closest('.ios-search-clear-btn') ||
      target.closest('.ios-profile-avatar-badge') ||
      target.closest('.ios-mic-icon')
    ) {
      return;
    }

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors on synthetic events
    }

    const currentY = readVisualTranslateY(sheetRef.current);
    currentVisualYRef.current = currentY;
    startSheetYRef.current = currentY;
    startClientYRef.current = e.clientY;
    dragStartTimeRef.current = performance.now();
    isDraggingRef.current = true;
    isTapCandidateRef.current = true;

    sheetRef.current.style.transition = 'none';
    sheetRef.current.style.transform = `translate3d(0, ${currentY}px, 0)`;

    pointerHistoryRef.current = [{ y: e.clientY, time: performance.now() }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !sheetRef.current) return;

    const now = performance.now();
    pointerHistoryRef.current.push({ y: e.clientY, time: now });
    pointerHistoryRef.current = pointerHistoryRef.current.filter((sample) => now - sample.time < 120);

    const deltaY = e.clientY - startClientYRef.current;
    if (Math.abs(deltaY) > 5) {
      isTapCandidateRef.current = false;
    }

    const rawY = startSheetYRef.current + deltaY;
    const { fullY, peekY, fullH, peekH } = computeDetents();

    let clampedY = rawY;
    if (rawY < fullY) {
      clampedY = fullY + rubberBand(rawY - fullY, fullH, 0.55);
    } else if (rawY > peekY) {
      clampedY = peekY + rubberBand(rawY - peekY, peekH, 0.55);
    }

    currentVisualYRef.current = clampedY;
    sheetRef.current.style.transform = `translate3d(0, ${clampedY}px, 0)`;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !sheetRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors
    }

    const { fullY, halfY, peekY } = computeDetents();
    const history = pointerHistoryRef.current;
    const elapsed = performance.now() - dragStartTimeRef.current;

    // Quick tap on grabber toggles detents
    if (
      isTapCandidateRef.current &&
      elapsed < 260 &&
      (e.target as HTMLElement).closest('.ios-sheet-grabber-zone')
    ) {
      soundManager.playClickSound();
      const nextDetent: SheetDetent =
        detent === 'peek' ? 'half' : detent === 'half' ? 'full' : 'peek';
      animateToDetent(nextDetent);
      return;
    }

    // Compute velocity in px/second
    let velocityY = 0;
    if (history.length >= 2) {
      const oldest = history[0];
      const newest = history[history.length - 1];
      const dt = (newest.time - oldest.time) / 1000;
      if (dt > 0.01) {
        velocityY = (newest.y - oldest.y) / dt;
      }
    }

    // Apple momentum projection
    const projectedOffset = projectMomentum(velocityY, 0.996);
    const projectedY = currentVisualYRef.current + projectedOffset;

    let targetDetent: SheetDetent = 'peek';

    // Fast intentional flick gestures take priority
    if (velocityY < -600) {
      targetDetent = detent === 'peek' ? (velocityY < -1100 ? 'full' : 'half') : 'full';
    } else if (velocityY > 600) {
      targetDetent = detent === 'full' ? (velocityY > 1100 ? 'peek' : 'half') : 'peek';
    } else {
      const distFull = Math.abs(projectedY - fullY);
      const distHalf = Math.abs(projectedY - halfY);
      const distPeek = Math.abs(projectedY - peekY);

      if (distFull <= distHalf && distFull <= distPeek) {
        targetDetent = 'full';
      } else if (distHalf <= distFull && distHalf <= distPeek) {
        targetDetent = 'half';
      } else {
        targetDetent = 'peek';
      }
    }

    animateToDetent(targetDetent);
  };

  // Live online geocoding with Photon API when typing a real query
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const [lng, lat] = currentVehiclePosition;
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          trimmed
        )}&lat=${lat}&lon=${lng}&limit=8`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const mapped: SearchResultItem[] = data.features.map((f: any, idx: number) => {
              const p = f.properties || {};
              const name = p.name || p.street || 'Place';
              const street = p.street ? `${p.street} ${p.housenumber || ''}` : '';
              const city = p.city || p.town || p.village || '';
              const address =
                [street.trim(), city.trim(), p.country].filter(Boolean).join(', ') || name;
              const coords: [number, number] = f.geometry?.coordinates || [lng, lat];
              const classified = classifyLocation(
                name,
                address,
                p.osm_value || p.osm_key || p.type || ''
              );
              return {
                id: `online-${p.osm_id || idx}`,
                name,
                address,
                coordinate: coords,
                predictedCategory: classified.category,
                predictedEmoji: classified.emoji,
                categoryLabel: classified.categoryLabel
              };
            });
            setLiveSearchResults(mapped);
          }
        }
      } catch (err) {
        console.warn('Live online search warning:', err);
      } finally {
        if (!cancelled) {
          setIsSearchingOnline(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, currentVehiclePosition]);

  // Nearby POIs clustered around the user's live position
  const baseNearbyList = useMemo(() => {
    return getNearbyPois(currentVehiclePosition);
  }, [currentVehiclePosition]);

  // Filter POIs based on search query, live online results, and category chips
  const filteredPlaces = useMemo(() => {
    let combined = [...baseNearbyList];

    if (searchQuery.trim().length >= 2 && liveSearchResults.length > 0) {
      combined = [...liveSearchResults, ...combined];
    }

    if (selectedCategory !== 'all') {
      combined = combined.filter((p) => p.predictedCategory === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      combined = combined.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.categoryLabel.toLowerCase().includes(q)
      );
    }

    return combined
      .map((p) => {
        const { distM, display } = computeDistanceFromVehicle(
          p.coordinate,
          currentVehiclePosition
        );
        return {
          ...p,
          distanceMeters: distM,
          distanceDisplay: display
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [searchQuery, selectedCategory, baseNearbyList, liveSearchResults, currentVehiclePosition]);

  // Real Recent Places derived from Timeline History & Favorites
  const recentPlaces = useMemo(() => {
    const timelineDays = timelineStorage.getAllDays();
    const visitedStops: Array<{
      id: string;
      name: string;
      address: string;
      category: LocationCategoryType;
      coordinate: [number, number];
    }> = [];

    if (timelineDays.length > 0) {
      for (const day of timelineDays) {
        for (const stop of day.stops) {
          if (!visitedStops.some((s) => s.name === stop.name)) {
            visitedStops.push({
              id: stop.id,
              name: stop.name,
              address: stop.address,
              category: stop.category,
              coordinate: stop.coordinate
            });
          }
          if (visitedStops.length >= 4) break;
        }
        if (visitedStops.length >= 4) break;
      }
    }

    for (const fav of favorites) {
      if (!visitedStops.some((s) => s.name === fav.name)) {
        visitedStops.push({
          id: fav.id,
          name: fav.name,
          address: fav.address,
          category: fav.category,
          coordinate: fav.coordinate
        });
      }
      if (visitedStops.length >= 5) break;
    }

    return visitedStops;
  }, [favorites]);

  // Home & Work quick locations from favorites
  const homeLocation = favorites.find((f) => f.category === 'home');
  const workLocation = favorites.find((f) => f.category === 'work');

  const handleSearchFocus = () => {
    if (detent === 'peek') {
      animateToDetent('half');
    }
  };

  const handleVoiceDictation = () => {
    soundManager.playClickSound();
    if (detent === 'peek') {
      animateToDetent('half');
    }
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.lang = 'de-DE';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        setIsListeningVoice(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            setSearchQuery(transcript);
          }
          setIsListeningVoice(false);
        };
        recognition.onerror = () => {
          setIsListeningVoice(false);
          searchInputRef.current?.focus();
        };
        recognition.onend = () => {
          setIsListeningVoice(false);
        };
        recognition.start();
        return;
      } catch {
        setIsListeningVoice(false);
      }
    }
    searchInputRef.current?.focus();
  };

  const openAddPlaceForm = (presetCategory: LocationCategoryType | null = null, defaultName = '') => {
    soundManager.playClickSound();
    setNewPlacePresetCat(presetCategory);
    setNewPlaceName(defaultName);
    setNewPlaceAddress('');
    setIsAddingPlace(true);
    if (detent === 'peek') {
      animateToDetent('half');
    }
  };

  const handleSaveNewPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName.trim() || !onAddFavorite) return;
    const addr = newPlaceAddress.trim() || 'Münster Area';
    const classified = classifyLocation(newPlaceName, addr);
    const finalCat = newPlacePresetCat || classified.category;
    const offsetCoord: [number, number] = [
      Number((currentVehiclePosition[0] + (Math.random() - 0.5) * 0.004).toFixed(5)),
      Number((currentVehiclePosition[1] + (Math.random() - 0.5) * 0.004).toFixed(5))
    ];
    onAddFavorite(newPlaceName.trim(), addr, offsetCoord, finalCat, classified.emoji);
    setIsAddingPlace(false);
    setNewPlaceName('');
    setNewPlaceAddress('');
    setNewPlacePresetCat(null);
  };

  const inspectItem = (
    id: string,
    name: string,
    address: string,
    coordinate: [number, number],
    category: LocationCategoryType
  ) => {
    soundManager.playClickSound();
    const { distM } = computeDistanceFromVehicle(coordinate, currentVehiclePosition);
    onSelectPlace({
      id,
      name,
      address,
      coordinate,
      category,
      categoryLabel: CATEGORY_DEFINITIONS[category]?.label || category.toUpperCase(),
      distanceMeters: distM,
      hours: 'Open until 22:00',
      ratingPercent: 98,
      ratingCount: 36
    });
  };

  // If place details is open, hide this sheet (after all hooks!)
  if (isPlaceSelected) {
    return null;
  }

  return (
    <div
      ref={sheetRef}
      className={`ios-apple-bottom-sheet detent-${detent}`}
      style={{
        transform: `translate3d(0, ${computeDetentY(detent)}px, 0)`
      }}
    >
      {/* 
        1. Fixed Top Header Zone: Grabber, Search Pill, and Category Chips.
        Supports 1:1 Direct Manipulation with Apple Fluid Physics & Rubber Banding!
      */}
      <div
        className="ios-sheet-header-zone"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Grabber Handle */}
        <div
          className="ios-sheet-grabber-zone"
          title="Drag or Tap to Expand / Collapse"
        >
          <div className="ios-sheet-grabber-pill" />
        </div>

        {/* Search Bar Pill */}
        <div className="ios-search-input-pill">
          <MagnifyingGlassIcon width={19} height={19} className="ios-search-lens-icon" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (detent === 'peek') animateToDetent('half');
            }}
            onFocus={handleSearchFocus}
            placeholder={
              isListeningVoice ? 'Listening for destination...' : 'Search places or addresses...'
            }
            className="ios-search-native-input"
          />
          {isSearchingOnline && (
            <ReloadIcon width={16} height={16} className="ios-search-spinner-icon" />
          )}
          {searchQuery ? (
            <button
              className="ios-search-clear-btn"
              onClick={() => {
                setSearchQuery('');
                setLiveSearchResults([]);
              }}
              aria-label="Clear Search"
            >
              <Cross2Icon width={15} height={15} />
            </button>
          ) : (
            <div className="ios-search-action-icons">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isListeningVoice ? '#ff3b30' : 'currentColor'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ios-mic-icon"
                onClick={handleVoiceDictation}
                style={{ cursor: 'pointer' }}
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              <div
                className="ios-profile-avatar-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playClickSound();
                  onOpenTimeline();
                }}
                title="Your Timeline & Profile History"
              >
                <span>TR</span>
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Category Exploration Chips Bar */}
        <div className="ios-category-chips-row">
          {CATEGORY_CHIPS.map((chip) => {
            const isSelected = selectedCategory === chip.id;
            const Icon = chip.IconComponent;
            return (
              <button
                key={chip.id}
                className={`ios-category-chip-btn ${isSelected ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playClickSound();
                  setSelectedCategory(chip.id);
                  if (detent === 'peek') animateToDetent('half');
                }}
              >
                <span
                  className="chip-icon-wrapper"
                  style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px' }}
                >
                  <Icon width={14} height={14} />
                </span>
                <span className="chip-label">{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 
        2. Scrollable Sheet Content (Revealed in Half & Full Detents)
        Contains Quick Places, Inline Add Form, Timeline Highlight, Recent Stops, and POI Directory.
      */}
      <div className="ios-sheet-scrollable-body">
        {/* 1. Quick Places Row: Home, Work, + Add */}
        {!searchQuery.trim() && (
          <div className="ios-sheet-section places-section">
            <div className="ios-section-title-row">
              <span className="ios-section-title">Places</span>
              <span className="ios-section-chevron">›</span>
            </div>
            <div className="ios-places-actions-row">
              {/* Home Action */}
              <div
                className="ios-place-action-item"
                onClick={() => {
                  if (homeLocation) {
                    inspectItem(
                      homeLocation.id,
                      homeLocation.name,
                      homeLocation.address,
                      homeLocation.coordinate,
                      'home'
                    );
                  } else {
                    openAddPlaceForm('home', 'My Home');
                  }
                }}
              >
                <div className="ios-place-circle-btn blue-filled">
                  <HomeIcon width={22} height={22} color="#ffffff" />
                </div>
                <div className="ios-place-label">Home</div>
                <div className="ios-place-sublink">{homeLocation ? 'View' : 'Add'}</div>
              </div>

              {/* Work Action */}
              <div
                className="ios-place-action-item"
                onClick={() => {
                  if (workLocation) {
                    inspectItem(
                      workLocation.id,
                      workLocation.name,
                      workLocation.address,
                      workLocation.coordinate,
                      'work'
                    );
                  } else {
                    openAddPlaceForm('work', 'Office / Work');
                  }
                }}
              >
                <div className="ios-place-circle-btn blue-filled">
                  <IdCardIcon width={22} height={22} color="#ffffff" />
                </div>
                <div className="ios-place-label">Work</div>
                <div className="ios-place-sublink">{workLocation ? 'View' : 'Add'}</div>
              </div>

              {/* Add Custom Place */}
              <div
                className="ios-place-action-item"
                onClick={() => openAddPlaceForm(null, '')}
              >
                <div className="ios-place-circle-btn light-blue-tint">
                  <PlusIcon width={22} height={22} color="#007aff" />
                </div>
                <div className="ios-place-label">Add</div>
                <div className="ios-place-sublink">Save</div>
              </div>
            </div>

            {/* Inline Add Favorite Place Drawer */}
            {isAddingPlace && (
              <form
                onSubmit={handleSaveNewPlace}
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.88)',
                  border: '1px solid rgba(0, 122, 255, 0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1c1c1e'
                  }}
                >
                  <span>
                    {newPlacePresetCat === 'home'
                      ? 'Save Home Location'
                      : newPlacePresetCat === 'work'
                      ? 'Save Work Location'
                      : 'Add New Favorite Place'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingPlace(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#8e8e93',
                      padding: '2px'
                    }}
                  >
                    <Cross2Icon width={15} height={15} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Place name (e.g. Café Arte, My Home)"
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(60,60,67,0.18)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Street or neighborhood (optional)"
                  value={newPlaceAddress}
                  onChange={(e) => setNewPlaceAddress(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(60,60,67,0.18)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newPlaceName.trim()}
                  style={{
                    marginTop: '2px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: newPlaceName.trim() ? '#007aff' : 'rgba(60,60,67,0.2)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: newPlaceName.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckIcon width={16} height={16} />
                  <span>Save to Places</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* 2. Contextual Trip History & Recommendations Banner */}
        {!searchQuery.trim() && (
          <div className="ios-sheet-section siri-suggestions-section">
            <div className="ios-section-title-row">
              <span className="ios-section-title">Recent Trips & Highlights</span>
              <MagicWandIcon width={16} height={16} color="#007aff" />
            </div>
            <div
              className="ios-siri-card"
              onClick={() => {
                soundManager.playClickSound();
                onOpenTimeline();
              }}
            >
              <div className="ios-siri-icon-blue">
                <PaperPlaneIcon width={20} height={20} color="#ffffff" />
              </div>
              <div className="ios-siri-text-col">
                <div className="ios-siri-card-title">Explore Your Recorded Trips</div>
                <div className="ios-siri-card-subtitle">
                  100% private on-device location history & visited stops
                </div>
              </div>
              <button
                className="ios-siri-more-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playClickSound();
                  onOpenTimeline();
                }}
                aria-label="Open Trip Timeline"
              >
                <DotsHorizontalIcon width={18} height={18} color="#8e8e93" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Recents & Visited Places */}
        {!searchQuery.trim() && recentPlaces.length > 0 && (
          <div className="ios-sheet-section recents-section">
            <div className="ios-section-title-row">
              <span className="ios-section-title">Recent Places</span>
              <span className="ios-section-chevron">›</span>
            </div>
            <div className="ios-recents-card-container">
              {recentPlaces.map((item, idx) => {
                const { display } = computeDistanceFromVehicle(
                  item.coordinate,
                  currentVehiclePosition
                );
                const catDef = CATEGORY_DEFINITIONS[item.category] || CATEGORY_DEFINITIONS.other;
                return (
                  <div
                    key={item.id}
                    className={`ios-recent-item-row ${idx > 0 ? 'has-divider' : ''}`}
                    onClick={() =>
                      inspectItem(item.id, item.name, item.address, item.coordinate, item.category)
                    }
                  >
                    <div
                      className="ios-item-icon-circle"
                      style={{
                        background: catDef.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%'
                      }}
                    >
                      <CategoryIcon category={item.category} size={16} color="#ffffff" />
                    </div>
                    <div className="ios-item-text-col">
                      <div className="ios-item-title">{item.name}</div>
                      <div className="ios-item-subtitle">
                        {display} • {item.address}
                      </div>
                    </div>
                    <button
                      className="ios-item-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        inspectItem(
                          item.id,
                          item.name,
                          item.address,
                          item.coordinate,
                          item.category
                        );
                      }}
                      aria-label={`Inspect ${item.name}`}
                    >
                      <DotsHorizontalIcon width={18} height={18} color="#8e8e93" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Filtered Search Results / Directory of Places */}
        <div className="ios-sheet-section directory-section">
          <div className="ios-section-title-row">
            <span className="ios-section-title">
              {searchQuery.trim()
                ? `Search Results (${filteredPlaces.length})`
                : selectedCategory === 'all'
                ? 'Popular Nearby Places'
                : `${CATEGORY_CHIPS.find((c) => c.id === selectedCategory)?.label}`}
            </span>
            <span className="ios-section-chevron">›</span>
          </div>

          <div className="ios-recents-card-container">
            {filteredPlaces.length === 0 ? (
              <div className="ios-empty-search-state">
                <SewingPinFilledIcon width={28} height={28} color="#8e8e93" />
                <p>No matching places found near your area.</p>
              </div>
            ) : (
              filteredPlaces.slice(0, 14).map((poi, idx) => {
                const catDef =
                  CATEGORY_DEFINITIONS[poi.predictedCategory] || CATEGORY_DEFINITIONS.other;
                return (
                  <div
                    key={poi.id}
                    className={`ios-recent-item-row ${idx > 0 ? 'has-divider' : ''}`}
                    onClick={() =>
                      inspectItem(
                        poi.id,
                        poi.name,
                        poi.address,
                        poi.coordinate,
                        poi.predictedCategory
                      )
                    }
                  >
                    <div
                      className="ios-item-icon-circle"
                      style={{
                        background: catDef.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%'
                      }}
                    >
                      <CategoryIcon category={poi.predictedCategory} size={16} color="#ffffff" />
                    </div>
                    <div className="ios-item-text-col">
                      <div className="ios-item-title">{poi.name}</div>
                      <div className="ios-item-subtitle">
                        {poi.distanceDisplay} • {poi.address}
                      </div>
                    </div>
                    <div className="ios-item-category-pill">
                      <span>{poi.categoryLabel}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
