import React, { useRef } from 'react';
import type { InspectedPlace } from '../../types/favorites';
import type { RouteResult } from '../../services/routingService';
import { soundManager } from '../../spatial/soundEffects';
import {
  Cross2Icon,
  ClockIcon,
  GlobeIcon,
  ExclamationTriangleIcon,
  RocketIcon
} from '@radix-ui/react-icons';

export type RoutePreference = 'fastest' | 'eco' | 'no_highways';

export interface RoutePreviewSheetProps {
  destination: InspectedPlace;
  userPosition: [number, number];
  routeResult: RouteResult | null;
  isLoading: boolean;
  preference: RoutePreference;
  onChangePreference: (pref: RoutePreference) => void;
  onStartNavigation: () => void;
  onCancel: () => void;
}

function rubberBand(distance: number, dimension: number, constant = 0.55): number {
  return (distance * dimension * constant) / (dimension + constant * Math.abs(distance));
}

export const RoutePreviewSheet: React.FC<RoutePreviewSheetProps> = ({
  destination,
  routeResult,
  isLoading,
  preference,
  onChangePreference,
  onStartNavigation,
  onCancel
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
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
    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !cardRef.current) return;
    const now = performance.now();
    pointerHistoryRef.current.push({ y: e.clientY, time: now });
    pointerHistoryRef.current = pointerHistoryRef.current.filter((sample) => now - sample.time < 120);

    const deltaY = e.clientY - startClientYRef.current;
    let clampedY = deltaY;
    if (deltaY < 0) {
      clampedY = rubberBand(deltaY, 260, 0.55);
    }
    cardRef.current.style.transform = `translate3d(0, ${clampedY}px, 0)`;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !cardRef.current) return;
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
      cardRef.current.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      cardRef.current.style.transform = 'translate3d(0, 100%, 0)';
      setTimeout(() => {
        onCancel();
      }, 250);
    } else {
      cardRef.current.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)';
      cardRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
  };

  // Compute ETA and distance
  let travelMinutes = 14;
  let distanceKm = 8.2;
  let arrivalTimeStr = '--:--';

  if (routeResult) {
    distanceKm = Math.max(0.1, Number((routeResult.distanceMeters / 1000).toFixed(1)));
    travelMinutes = Math.max(1, Math.round(routeResult.durationSeconds / 60));

    const arrivalDate = new Date(Date.now() + travelMinutes * 60000);
    const hrs = String(arrivalDate.getHours()).padStart(2, '0');
    const mins = String(arrivalDate.getMinutes()).padStart(2, '0');
    arrivalTimeStr = `${hrs}:${mins}`;
  }

  return (
    <div className="ios-route-preview-container">
      <div
        ref={cardRef}
        className="ios-route-preview-card"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Top Handle */}
        <div className="ios-sheet-grabber-zone" style={{ cursor: 'grab' }}>
          <div className="ios-sheet-grabber-pill" />
        </div>

        {/* Header Row: Origin ➔ Destination */}
        <div className="ios-route-header-row">
          <div className="ios-route-endpoints">
            <div className="ios-endpoint-dot origin-dot" title="Current Location" />
            <div className="ios-endpoint-text">
              <span className="endpoint-label">From: Current Location</span>
              <h3 className="endpoint-title">{destination.name}</h3>
              <p className="endpoint-subtitle">{destination.address}</p>
            </div>
          </div>
          <button
            className="ios-circle-icon-btn close-preview-btn"
            onClick={() => {
              soundManager.playClickSound();
              onCancel();
            }}
            title="Cancel Route"
          >
            <Cross2Icon width={18} height={18} color="#8e8e93" />
          </button>
        </div>

        {/* Primary Travel Time & Arrival Stats */}
        <div className="ios-route-stats-banner">
          {isLoading ? (
            <div className="ios-route-loading-state">
              <div className="ios-spinner" />
              <span>Calculating optimal driving route via OSRM...</span>
            </div>
          ) : (
            <div className="ios-route-metrics-row">
              <div className="metric-time-group">
                <span className="big-time-number">{travelMinutes}</span>
                <span className="big-time-unit">min</span>
              </div>
              <div className="metric-details-col">
                <div className="metric-arrival-row" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ClockIcon width={14} height={14} color="#007aff" />
                  <span className="arrival-text">Arrive by {arrivalTimeStr}</span>
                </div>
                <div className="metric-distance-text">
                  <span>{distanceKm} km</span> • <span>Fastest route with real traffic</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Route Preference Selector (Fastest, Eco, Avoid Highways) */}
        <div className="ios-route-preferences-chips">
          <button
            className={`ios-pref-chip ${preference === 'fastest' ? 'is-selected' : ''}`}
            onClick={() => {
              soundManager.playClickSound();
              onChangePreference('fastest');
            }}
          >
            <RocketIcon width={14} height={14} />
            <span>Fastest</span>
          </button>

          <button
            className={`ios-pref-chip ${preference === 'eco' ? 'is-selected' : ''}`}
            onClick={() => {
              soundManager.playClickSound();
              onChangePreference('eco');
            }}
          >
            <GlobeIcon width={14} height={14} />
            <span>Eco Friendly</span>
          </button>

          <button
            className={`ios-pref-chip ${preference === 'no_highways' ? 'is-selected' : ''}`}
            onClick={() => {
              soundManager.playClickSound();
              onChangePreference('no_highways');
            }}
          >
            <ExclamationTriangleIcon width={14} height={14} />
            <span>Avoid Highways</span>
          </button>
        </div>

        {/* Actions Row: Start Navigation & Cancel */}
        <div className="ios-route-actions-row">
          <button
            className="ios-route-start-btn"
            onClick={() => {
              soundManager.playLaneGuidanceChime();
              onStartNavigation();
            }}
            disabled={isLoading}
          >
            <RocketIcon width={20} height={20} color="#ffffff" />
            <span>Start Navigation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
