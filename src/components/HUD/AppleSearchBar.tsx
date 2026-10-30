import React, { useState, useEffect, useMemo, useRef } from 'react';
import type {
  FavoriteLocation,
  LocationCategoryType,
  InspectedPlace,
  SearchResultItem
} from '../../types/favorites';
import { CATEGORY_DEFINITIONS, classifyLocation } from '../../services/favoriteCategory';
import { SAMPLE_SEARCH_RESULTS } from '../../services/samplePois';
import { CategoryIcon } from '../Common/CategoryIcon';
import { soundManager } from '../../spatial/soundEffects';
import {
  MagnifyingGlassIcon,
  HeartFilledIcon,
  HeartIcon,
  Cross2Icon,
  PlusIcon,
  RocketIcon,
  StarFilledIcon
} from '@radix-ui/react-icons';

export interface AppleSearchBarProps {
  favorites: FavoriteLocation[];
  onAddFavorite: (
    name: string,
    address: string,
    coordinate: [number, number],
    category?: LocationCategoryType,
    emoji?: string
  ) => void;
  onRemoveFavorite: (id: string) => void;
  onSelectDestination: (coordinate: [number, number], name: string) => void;
  currentVehiclePosition: [number, number];
  autoOpenTrigger?: number;
  onInspectPlace?: (place: InspectedPlace) => void;
}

export const AppleSearchBar: React.FC<AppleSearchBarProps> = ({
  favorites,
  onAddFavorite,
  onRemoveFavorite,
  onSelectDestination,
  currentVehiclePosition,
  autoOpenTrigger,
  onInspectPlace
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoOpenTrigger && autoOpenTrigger > 0) {
      setIsOpen(true);
    }
  }, [autoOpenTrigger]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleOpen = () => {
    soundManager.playClickSound();
    setIsOpen(true);
  };

  const handleClose = () => {
    soundManager.playClickSound();
    setIsOpen(false);
    setQuery('');
    setIsAddingCustom(false);
  };

  const filteredFavorites = useMemo(() => {
    return favorites.filter((fav) => {
      const matchCat = selectedCategory === 'all' || fav.category === selectedCategory;
      const matchQuery =
        query.trim() === '' ||
        fav.name.toLowerCase().includes(query.toLowerCase()) ||
        fav.address.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [favorites, selectedCategory, query]);

  const searchResults: SearchResultItem[] = useMemo(() => {
    if (!query.trim()) return [];
    return SAMPLE_SEARCH_RESULTS.filter((item: SearchResultItem) => {
      const matchCat = selectedCategory === 'all' || item.predictedCategory === selectedCategory;
      const matchQuery =
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.address.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [query, selectedCategory]);

  const isFavoritedName = (name: string) => {
    return favorites.some((f) => f.name.toLowerCase() === name.toLowerCase());
  };

  const handleToggleFavoriteResult = (item: SearchResultItem) => {
    soundManager.playClickSound();
    const existing = favorites.find((f) => f.name.toLowerCase() === item.name.toLowerCase());
    if (existing) {
      onRemoveFavorite(existing.id);
    } else {
      onAddFavorite(item.name, item.address, item.coordinate, item.predictedCategory, item.predictedEmoji);
    }
  };

  const handleSaveCustomFavorite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    soundManager.playClickSound();
    const addr = customAddress.trim() || 'Current Area, Münster';
    const classification = classifyLocation(customName, addr);
    onAddFavorite(customName.trim(), addr, currentVehiclePosition, classification.category, classification.emoji);
    setCustomName('');
    setCustomAddress('');
    setIsAddingCustom(false);
  };

  const customPreview = useMemo(() => {
    if (!customName.trim()) return null;
    return classifyLocation(customName, customAddress);
  }, [customName, customAddress]);

  return (
    <React.Fragment>
      <div className="apple-search-trigger-container">
        <button className="apple-search-pill" onClick={handleOpen} title="Search Places & Favorites">
          <MagnifyingGlassIcon width={17} height={17} className="apple-search-icon" />
          <span className="apple-search-placeholder">Search addresses, food, coffee...</span>
          <div className="apple-fav-counter-badge" title="Saved Favorites">
            <HeartFilledIcon width={13} height={13} color="#ef4444" />
            <span>{favorites.length}</span>
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="apple-search-overlay" onClick={handleClose}>
          <div className="apple-search-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="apple-sheet-grabber" />

            <div className="apple-sheet-input-row">
              <div className="apple-input-wrapper">
                <MagnifyingGlassIcon width={18} height={18} className="apple-input-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search restaurant, café, sea, home..."
                  className="apple-native-input"
                />
                {query && (
                  <button className="apple-clear-btn" onClick={() => setQuery('')}>
                    <Cross2Icon width={15} height={15} />
                  </button>
                )}
              </div>
              <button className="apple-cancel-btn" onClick={handleClose}>
                Done
              </button>
            </div>

            <div className="apple-category-chips-bar">
              <button
                className={`apple-chip ${selectedCategory === 'all' ? 'chip-active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                <span>All ({favorites.length})</span>
              </button>
              {(Object.keys(CATEGORY_DEFINITIONS) as LocationCategoryType[]).map((catKey) => {
                const catDef = CATEGORY_DEFINITIONS[catKey];
                const count = favorites.filter((f) => f.category === catKey).length;
                return (
                  <button
                    key={catKey}
                    className={`apple-chip ${selectedCategory === catKey ? 'chip-active' : ''}`}
                    onClick={() => setSelectedCategory(catKey)}
                  >
                    <span className="chip-symbol">
                      <CategoryIcon
                        category={catKey}
                        size={15}
                        color={selectedCategory === catKey ? '#ffffff' : catDef.color}
                      />
                    </span>
                    <span>{catDef.label.split(' ')[0]}</span>
                    {count > 0 && <span className="chip-count">{count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="apple-custom-add-section">
              {isAddingCustom ? (
                <form className="apple-custom-form" onSubmit={handleSaveCustomFavorite}>
                  <div className="custom-form-header">
                    <span>Add Custom Favorite Place</span>
                    <button
                      type="button"
                      className="form-close-btn"
                      onClick={() => setIsAddingCustom(false)}
                    >
                      <Cross2Icon width={14} height={14} />
                    </button>
                  </div>
                  <div className="custom-input-fields">
                    <input
                      type="text"
                      placeholder="e.g. Mama Trattoria, Seaside Pier, My Home"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="custom-text-input"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Address or area (optional)"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      className="custom-text-input"
                    />
                  </div>
                  {customPreview && (
                    <div className="smart-category-preview-pill">
                      <span className="preview-label">Classification:</span>
                      <span className="preview-badge" style={{ borderColor: customPreview.color }}>
                        <span className="badge-symbol">
                          <CategoryIcon
                            category={customPreview.category}
                            size={15}
                            color={customPreview.color}
                          />
                        </span>
                        <span className="badge-cat">{customPreview.categoryLabel}</span>
                      </span>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="save-custom-submit-btn"
                    disabled={!customName.trim()}
                  >
                    <StarFilledIcon width={16} height={16} color="#ffffff" />
                    <span>Save to Favorites</span>
                  </button>
                </form>
              ) : (
                <button
                  className="apple-quick-add-btn"
                  onClick={() => setIsAddingCustom(true)}
                >
                  <PlusIcon width={16} height={16} />
                  <span>Save New Custom Location</span>
                </button>
              )}
            </div>

            <div className="apple-sheet-content-scroll">
              {query.trim() && (
                <div className="apple-results-group">
                  <div className="results-group-title">
                    Search Results ({searchResults.length})
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="empty-results-hint">
                      <span>No matching places found. You can save "{query}" above!</span>
                    </div>
                  ) : (
                    searchResults.map((item: SearchResultItem) => {
                      const isFav = isFavoritedName(item.name);
                      return (
                        <div
                          key={item.id}
                          className="apple-place-row"
                          onClick={() => {
                            if (onInspectPlace) {
                              onInspectPlace({
                                id: item.id,
                                name: item.name,
                                address: item.address,
                                coordinate: item.coordinate,
                                category: item.predictedCategory,
                                categoryLabel: item.categoryLabel,
                                isFavorite: isFav
                              });
                            }
                            setIsOpen(false);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div
                            className="place-emoji-avatar"
                            style={{
                              background:
                                CATEGORY_DEFINITIONS[item.predictedCategory as LocationCategoryType]?.gradient ||
                                CATEGORY_DEFINITIONS.other.gradient
                            }}
                          >
                            <CategoryIcon
                              category={item.predictedCategory}
                              size={18}
                              color="#ffffff"
                            />
                          </div>
                          <div className="place-info-col">
                            <div className="place-title">{item.name}</div>
                            <div className="place-address">{item.address}</div>
                            <div
                              className="place-category-tag"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <CategoryIcon
                                category={item.predictedCategory}
                                size={12}
                                color="currentColor"
                              />
                              <span>{item.categoryLabel}</span>
                            </div>
                          </div>
                          <div
                            className="place-actions-col"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className={`action-icon-btn ${isFav ? 'btn-favorited' : ''}`}
                              onClick={() => handleToggleFavoriteResult(item)}
                              title={isFav ? 'Remove Favorite' : 'Save to Favorites'}
                            >
                              {isFav ? (
                                <HeartFilledIcon width={18} height={18} color="#ef4444" />
                              ) : (
                                <HeartIcon width={18} height={18} color="#94a3b8" />
                              )}
                            </button>
                            <button
                              className="action-navigate-btn"
                              onClick={() => {
                                soundManager.playClickSound();
                                onSelectDestination(item.coordinate, item.name);
                                setIsOpen(false);
                              }}
                              title="Set Destination & Navigate"
                            >
                              <RocketIcon width={15} height={15} />
                              <span>Go</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div className="apple-results-group">
                <div className="results-group-title">
                  <span>Saved Favorites ({filteredFavorites.length})</span>
                  {selectedCategory !== 'all' && (
                    <span className="filtered-tag">
                      • {CATEGORY_DEFINITIONS[selectedCategory as LocationCategoryType]?.label}
                    </span>
                  )}
                </div>

                {filteredFavorites.length === 0 ? (
                  <div className="empty-favorites-box">
                    <div className="empty-emoji">
                      <StarFilledIcon width={36} height={36} color="#eab308" />
                    </div>
                    <div className="empty-title">No Favorites in this Category</div>
                    <div className="empty-sub">
                      Search for a restaurant, café, waterside, or residence to add it!
                    </div>
                  </div>
                ) : (
                  filteredFavorites.map((fav) => (
                    <div
                      key={fav.id}
                      className="apple-place-row"
                      onClick={() => {
                        if (onInspectPlace) {
                          onInspectPlace({
                            id: fav.id,
                            name: fav.name,
                            address: fav.address,
                            coordinate: fav.coordinate,
                            category: fav.category,
                            categoryLabel: CATEGORY_DEFINITIONS[fav.category]?.label || 'Place',
                            isFavorite: true
                          });
                        }
                        setIsOpen(false);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div
                        className="place-emoji-avatar"
                        style={{
                          background:
                            CATEGORY_DEFINITIONS[fav.category]?.gradient ||
                            CATEGORY_DEFINITIONS.other.gradient
                        }}
                      >
                        <CategoryIcon category={fav.category} size={18} color="#ffffff" />
                      </div>
                      <div className="place-info-col">
                        <div className="place-title">{fav.name}</div>
                        <div className="place-address">{fav.address}</div>
                        <div
                          className="place-category-tag"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <CategoryIcon category={fav.category} size={12} color="currentColor" />
                          <span>{CATEGORY_DEFINITIONS[fav.category]?.label}</span>
                        </div>
                      </div>
                      <div
                        className="place-actions-col"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="action-icon-btn btn-favorited"
                          onClick={() => {
                            soundManager.playClickSound();
                            onRemoveFavorite(fav.id);
                          }}
                          title="Remove from Favorites"
                        >
                          <HeartFilledIcon width={18} height={18} color="#ef4444" />
                        </button>
                        <button
                          className="action-navigate-btn"
                          onClick={() => {
                            soundManager.playClickSound();
                            onSelectDestination(fav.coordinate, fav.name);
                            setIsOpen(false);
                          }}
                          title="Navigate to this place"
                        >
                          <RocketIcon width={15} height={15} />
                          <span>Go</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};
