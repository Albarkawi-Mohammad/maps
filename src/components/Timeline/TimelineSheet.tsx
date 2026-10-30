import React, { useState } from 'react';
import { timelineStorage } from '../../services/timelineStorage';
import { CATEGORY_DEFINITIONS } from '../../services/favoriteCategory';
import { CategoryIcon } from '../Common/CategoryIcon';
import { soundManager } from '../../spatial/soundEffects';
import {
  CounterClockwiseClockIcon,
  Cross2Icon,
  LockClosedIcon,
  CalendarIcon,
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PaperPlaneIcon,
  TrashIcon,
  RocketIcon,
  DownloadIcon,
  SewingPinFilledIcon
} from '@radix-ui/react-icons';

export interface TimelineSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onShowTripOnMap: (path: Array<[number, number]>) => void;
  onShowStopOnMap: (coordinate: [number, number], name: string) => void;
}

export const TimelineSheet: React.FC<TimelineSheetProps> = ({
  isOpen,
  onClose,
  onShowTripOnMap,
  onShowStopOnMap
}) => {
  const [days, setDays] = useState(() => timelineStorage.getAllDays());
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [settings, setSettings] = useState(() => timelineStorage.getSettings());
  const [activeTab, setActiveTab] = useState<'timeline' | 'insights'>('timeline');

  if (!isOpen) return null;

  const currentDay = days[selectedDayIdx] || days[0];
  const summary = timelineStorage.getSummaryStats();

  const handleToggleTracking = () => {
    soundManager.playClickSound();
    const updated = timelineStorage.updateSettings({ isEnabled: !settings.isEnabled });
    setSettings(updated);
  };

  const handleNextDay = () => {
    if (selectedDayIdx < days.length - 1) {
      soundManager.playClickSound();
      setSelectedDayIdx(selectedDayIdx + 1);
    }
  };

  const handlePrevDay = () => {
    if (selectedDayIdx > 0) {
      soundManager.playClickSound();
      setSelectedDayIdx(selectedDayIdx - 1);
    }
  };

  const handleDeleteStop = (id: string) => {
    soundManager.playClickSound();
    if (!currentDay) return;
    const updated = timelineStorage.deleteStop(currentDay.dateKey, id);
    setDays(updated);
  };

  const handleDeleteTrip = (id: string) => {
    soundManager.playClickSound();
    if (!currentDay) return;
    const updated = timelineStorage.deleteTrip(currentDay.dateKey, id);
    setDays(updated);
  };

  const handleExportJson = () => {
    soundManager.playClickSound();
    const jsonStr = timelineStorage.exportTimelineJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-timeline-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="apple-timeline-overlay" onClick={onClose}>
      <div className="apple-timeline-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="apple-sheet-grabber" />

        <div className="timeline-header-row">
          <div className="timeline-title-group">
            <div className="timeline-title-icon-badge">
              <CounterClockwiseClockIcon width={18} height={18} color="#38bdf8" />
            </div>
            <div>
              <h2 className="timeline-main-title">Your Timeline</h2>
              <div className="timeline-sub-title">Location History & Activity • 100% Private</div>
            </div>
          </div>
          <button className="timeline-close-btn" onClick={onClose}>
            <Cross2Icon width={18} height={18} />
          </button>
        </div>

        <div className="timeline-privacy-bar">
          <div className="privacy-info-col">
            <div className="privacy-badge">
              <LockClosedIcon width={13} height={13} color="#10b981" />
              <span>100% On-Device Storage</span>
            </div>
            <div className="privacy-description">
              Saves your visits and driving routes locally on your device. Zero external cloud tracking.
            </div>
          </div>
          <label className="apple-switch" title="Toggle Timeline Recording">
            <input
              type="checkbox"
              checked={settings.isEnabled}
              onChange={handleToggleTracking}
            />
            <span className="apple-switch-slider" />
          </label>
        </div>

        <div className="timeline-tab-switcher">
          <button
            className={`timeline-tab-btn ${activeTab === 'timeline' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <CalendarIcon width={15} height={15} />
            <span>Timeline Day View</span>
          </button>
          <button
            className={`timeline-tab-btn ${activeTab === 'insights' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            <BarChartIcon width={15} height={15} />
            <span>All-Time Insights</span>
          </button>
        </div>

        {activeTab === 'timeline' ? (
          <React.Fragment>
            <div className="timeline-date-nav">
              <button
                className="date-nav-arrow"
                onClick={handleNextDay}
                disabled={selectedDayIdx >= days.length - 1}
              >
                <ChevronLeftIcon width={20} height={20} />
              </button>
              <div className="date-nav-center">
                <span className="date-nav-display">{currentDay?.dateDisplay}</span>
                <span className="date-nav-key">{currentDay?.dateKey}</span>
              </div>
              <button
                className="date-nav-arrow"
                onClick={handlePrevDay}
                disabled={selectedDayIdx <= 0}
              >
                <ChevronRightIcon width={20} height={20} />
              </button>
            </div>

            {currentDay && (
              <div className="timeline-daily-stats-row">
                <div className="day-stat-chip">
                  <span className="stat-value">{currentDay.totalDistanceKm} km</span>
                  <span className="stat-label">Driven</span>
                </div>
                <div className="day-stat-chip">
                  <span className="stat-value">{currentDay.totalDriveMinutes} min</span>
                  <span className="stat-label">Drive Time</span>
                </div>
                <div className="day-stat-chip">
                  <span className="stat-value">{currentDay.stops.length}</span>
                  <span className="stat-label">Places Visited</span>
                </div>
                <div className="day-stat-chip">
                  <span className="stat-value">{currentDay.citiesVisited.join(', ')}</span>
                  <span className="stat-label">Cities</span>
                </div>
              </div>
            )}

            <div className="timeline-stream-scroll">
              {!currentDay || (currentDay.stops.length === 0 && currentDay.trips.length === 0) ? (
                <div className="timeline-empty-day">
                  <div className="empty-day-icon">
                    <SewingPinFilledIcon width={38} height={38} color="var(--text-muted)" />
                  </div>
                  <div className="empty-day-title">No Recorded Activity for this Day</div>
                  <div className="empty-day-sub">
                    Drive with AutoHUD active to record your trips and visited places hour-by-hour.
                  </div>
                </div>
              ) : (
                <div className="timeline-stream-container">
                  {currentDay.stops.map((stop) => {
                    const catDef = CATEGORY_DEFINITIONS[stop.category] || CATEGORY_DEFINITIONS.other;
                    return (
                      <div key={stop.id} className="timeline-event-card stop-card">
                        <div className="event-avatar-badge" style={{ background: catDef.gradient }}>
                          <CategoryIcon category={stop.category} size={20} color="#ffffff" />
                        </div>
                        <div className="event-content-col">
                          <div className="event-header-line">
                            <span
                              className="event-type-pill place-pill"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <CategoryIcon category={stop.category} size={12} color="currentColor" />
                              <span>Visited Place</span>
                            </span>
                            <span className="event-time-range">
                              {formatTime(stop.arrivalTime)} – {formatTime(stop.departureTime)}
                            </span>
                          </div>
                          <div className="event-title">{stop.name}</div>
                          <div className="event-sub">{stop.address}</div>
                          <div className="event-meta-row">
                            <span className="duration-tag">Stayed {stop.durationMinutes} min</span>
                            <span className="city-tag">{stop.city}</span>
                          </div>
                        </div>
                        <div className="event-actions-col">
                          <button
                            className="event-action-btn view-map-btn"
                            onClick={() => {
                              soundManager.playClickSound();
                              onShowStopOnMap(stop.coordinate, stop.name);
                              onClose();
                            }}
                            title="Show on Map"
                          >
                            <PaperPlaneIcon width={15} height={15} />
                          </button>
                          <button
                            className="event-action-btn delete-btn"
                            onClick={() => handleDeleteStop(stop.id)}
                            title="Delete this visit"
                          >
                            <TrashIcon width={14} height={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {currentDay.trips.map((trip) => (
                    <div key={trip.id} className="timeline-event-card trip-card">
                      <div className="event-avatar-badge trip-badge">
                        <RocketIcon width={20} height={20} color="#ffffff" />
                      </div>
                      <div className="event-content-col">
                        <div className="event-header-line">
                          <span
                            className="event-type-pill drive-pill"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <RocketIcon width={13} height={13} color="currentColor" />
                            <span>
                              Drive • {trip.startCity} ➔ {trip.endCity}
                            </span>
                          </span>
                          <span className="event-time-range">
                            {formatTime(trip.startTime)} – {formatTime(trip.endTime)}
                          </span>
                        </div>
                        <div className="event-title">
                          {trip.startPlace} ➔ {trip.endPlace}
                        </div>
                        <div className="event-meta-row">
                          <span className="duration-tag">{trip.distanceKm} km</span>
                          <span className="duration-tag">{trip.durationMinutes} min</span>
                          <span className="speed-tag">
                            Avg: {trip.avgSpeedKmh} km/h (Max: {trip.maxSpeedKmh})
                          </span>
                        </div>
                      </div>
                      <div className="event-actions-col">
                        <button
                          className="event-action-btn view-map-btn"
                          onClick={() => {
                            soundManager.playClickSound();
                            onShowTripOnMap(trip.path);
                            onClose();
                          }}
                          title="View Route Path on Map"
                        >
                          <PaperPlaneIcon width={15} height={15} />
                        </button>
                        <button
                          className="event-action-btn delete-btn"
                          onClick={() => handleDeleteTrip(trip.id)}
                          title="Delete this drive"
                        >
                          <TrashIcon width={14} height={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </React.Fragment>
        ) : (
          <div className="timeline-insights-scroll">
            <div className="insights-hero-banner">
              <div className="insights-big-stat">
                <span className="big-stat-number">{summary.totalKmAllTime}</span>
                <span className="big-stat-unit">km Total Driven</span>
              </div>
              <div className="insights-sub-text">
                All recorded locally on your device with complete privacy.
              </div>
            </div>

            <div className="insights-grid-row">
              <div className="insight-card">
                <div className="insight-number">{summary.totalCitiesCount}</div>
                <div className="insight-label">Cities Visited</div>
                <div className="insight-detail">{summary.citiesList.join(', ')}</div>
              </div>
              <div className="insight-card">
                <div className="insight-number">{summary.totalStopsCount}</div>
                <div className="insight-label">Places Explored</div>
                <div className="insight-detail">Food, Cafés, Waterside & Home</div>
              </div>
              <div className="insight-card">
                <div className="insight-number">{summary.totalTripsCount}</div>
                <div className="insight-label">Drives Completed</div>
                <div className="insight-detail">With real GPS tracking</div>
              </div>
            </div>

            <div className="timeline-export-box">
              <div className="export-title-row">
                <DownloadIcon width={18} height={18} color="#38bdf8" />
                <span>Export & Own Your Location History</span>
              </div>
              <p className="export-description">
                You own 100% of your data. Export your entire timeline as standard JSON format at any time.
              </p>
              <button className="timeline-export-btn" onClick={handleExportJson}>
                <DownloadIcon width={16} height={16} />
                <span>Export My Timeline (JSON)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
