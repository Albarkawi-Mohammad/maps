import React from 'react';
import { soundManager } from '../../spatial/soundEffects';
import {
  Cross2Icon,
  MagnifyingGlassIcon,
  PaperPlaneIcon,
  MobileIcon,
  PlayIcon,
  PauseIcon
} from '@radix-ui/react-icons';

export interface AppleMapsBottomBarProps {
  hasActiveRoute: boolean;
  etaTime: string;
  remainingMinutes: number;
  remainingKm: number;
  destinationName?: string;
  onEndRoute: () => void;
  onOpenSearch?: () => void;
  hasWakeLock?: boolean;
  gpsAccuracy?: number;
  isSimulating?: boolean;
  onToggleSimulate?: () => void;
}

export const AppleMapsBottomBar: React.FC<AppleMapsBottomBarProps> = ({
  hasActiveRoute,
  etaTime,
  remainingMinutes,
  remainingKm,
  destinationName,
  onEndRoute,
  onOpenSearch,
  hasWakeLock = false,
  gpsAccuracy = 5,
  isSimulating = false,
  onToggleSimulate
}) => {
  return (
    <div className="apple-bottom-dock">
      <div className="apple-nav-sheet">
        {hasActiveRoute ? (
          <React.Fragment>
            <button
              className="apple-end-btn"
              onClick={() => {
                soundManager.playClickSound();
                onEndRoute();
              }}
              title="End Navigation Route"
            >
              <Cross2Icon width={20} height={20} />
            </button>
            <div className="apple-eta-content">
              <div className="apple-eta-time">
                <span>{etaTime}</span>
                <span className="apple-arrival-label">arrival</span>
              </div>
              <div className="apple-eta-stats">
                <span className="apple-minutes">{remainingMinutes} min</span>
                <span className="apple-dot">•</span>
                <span className="apple-distance">{remainingKm.toFixed(1)} km</span>
                {destinationName && (
                  <React.Fragment>
                    <span className="apple-dot">•</span>
                    <span className="apple-dest-name-inline">{destinationName}</span>
                  </React.Fragment>
                )}
              </div>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <button
              className="apple-search-trigger-btn"
              onClick={onOpenSearch}
              title="Search place or favorite"
            >
              <MagnifyingGlassIcon width={18} height={18} />
              <span>Where to?</span>
            </button>
            <div className="apple-free-drive-content">
              <div className="free-drive-title">
                <PaperPlaneIcon width={15} height={15} color="#007aff" />
                <span>Drive Mode • Live GPS</span>
              </div>
              <div className="free-drive-sub">Tracking real car speed & Rechts vor Links</div>
            </div>
          </React.Fragment>
        )}

        <div className="apple-dock-right-actions">
          {hasActiveRoute && onToggleSimulate && (
            <button
              className={`apple-simulate-drive-btn ${isSimulating ? 'is-simulating' : ''}`}
              onClick={() => {
                soundManager.playClickSound();
                onToggleSimulate();
              }}
              title={isSimulating ? 'Pause Driving Simulation' : 'Simulate Drive along Route'}
            >
              {isSimulating ? (
                <PauseIcon width={14} height={14} color="#ffffff" />
              ) : (
                <PlayIcon width={14} height={14} color="#ffffff" />
              )}
              <span>{isSimulating ? 'Pause' : 'Simulate'}</span>
            </button>
          )}

          <div
            className="apple-live-gps-pill"
            title={`Real iPhone Hardware GPS active (accuracy: ±${Math.round(gpsAccuracy)}m)`}
          >
            <span className="live-gps-dot" />
            <span>Live GPS</span>
          </div>
          {hasWakeLock && (
            <div className="apple-screen-awake-tag" title="Screen kept awake for car dashboard">
              <MobileIcon width={14} height={14} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
