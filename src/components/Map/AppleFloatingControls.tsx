import React from 'react';
import {
  TargetIcon,
  GlobeIcon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
  InfoCircledIcon
} from '@radix-ui/react-icons';
import { soundManager } from '../../spatial/soundEffects';

export interface AppleFloatingControlsProps {
  onRecenter: () => void;
  onToggle3D: () => void;
  is3dView: boolean;
  onResetNorth?: () => void;
  heading?: number;
  isNavigating?: boolean;
  isRouteOverviewMode?: boolean;
  onToggleRouteOverview?: () => void;
  isAudioEnabled?: boolean;
  onToggleAudio?: () => void;
  onOpenGuide?: () => void;
}

export const AppleFloatingControls: React.FC<AppleFloatingControlsProps> = ({
  onRecenter,
  onToggle3D,
  is3dView,
  onResetNorth,
  heading = 0,
  isNavigating = false,
  isRouteOverviewMode = false,
  onToggleRouteOverview,
  isAudioEnabled = true,
  onToggleAudio,
  onOpenGuide
}) => {
  return (
    <div className="ios-floating-trailing-stack">
      {/* Compass Needle (Tap to orient North-Up) */}
      <button
        className="ios-stack-btn top-btn"
        onClick={() => {
          soundManager.playClickSound();
          if (onResetNorth) onResetNorth();
          else onRecenter();
        }}
        title="Orient North-Up"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          style={{ transform: `rotate(${-heading}deg)`, transition: 'transform 0.3s ease' }}
        >
          <polygon points="12,3 16,12 12,10 8,12" fill="#ff3b30" />
          <polygon points="12,21 16,12 12,10 8,12" fill="#8e8e93" />
        </svg>
      </button>

      <div className="ios-stack-divider" />

      {/* 3D / 2D Tilt Toggle */}
      <button
        className="ios-stack-btn"
        onClick={() => {
          soundManager.playClickSound();
          onToggle3D();
        }}
        title={is3dView ? 'Switch to 2D Top-Down' : 'Switch to 3D Driver Perspective'}
      >
        <span className="ios-3d-text-badge">{is3dView ? '2D' : '3D'}</span>
      </button>

      <div className="ios-stack-divider" />

      {/* Route Overview / Driving View Toggle during Navigation */}
      {isNavigating && onToggleRouteOverview && (
        <React.Fragment>
          <button
            className={`ios-stack-btn ${isRouteOverviewMode ? 'is-active-btn' : ''}`}
            onClick={() => {
              soundManager.playClickSound();
              onToggleRouteOverview();
            }}
            title={isRouteOverviewMode ? 'Resume 3D Driving Cockpit View' : 'View Full Route Overview'}
          >
            <GlobeIcon width={18} height={18} color={isRouteOverviewMode ? '#007aff' : '#1c1c1e'} />
          </button>
          <div className="ios-stack-divider" />
        </React.Fragment>
      )}

      {/* Audio Mute / Unmute Button */}
      {onToggleAudio && (
        <React.Fragment>
          <button
            className="ios-stack-btn"
            onClick={() => {
              soundManager.playClickSound();
              onToggleAudio();
            }}
            title={isAudioEnabled ? 'Mute Warning Audio' : 'Enable Warning Audio'}
          >
            {isAudioEnabled ? (
              <SpeakerLoudIcon width={17} height={17} color="#007aff" />
            ) : (
              <SpeakerOffIcon width={17} height={17} color="#8e8e93" />
            )}
          </button>
          <div className="ios-stack-divider" />
        </React.Fragment>
      )}

      {/* GPS & StVO Setup Guide Button */}
      {onOpenGuide && !isNavigating && (
        <React.Fragment>
          <button
            className="ios-stack-btn"
            onClick={() => {
              soundManager.playClickSound();
              onOpenGuide();
            }}
            title="Navigation & StVO § 8 System Guide"
          >
            <InfoCircledIcon width={17} height={17} color="#1c1c1e" />
          </button>
          <div className="ios-stack-divider" />
        </React.Fragment>
      )}

      {/* Re-center GPS Location Button */}
      <button
        className="ios-stack-btn bottom-btn"
        onClick={() => {
          soundManager.playClickSound();
          onRecenter();
        }}
        title="Re-center on Your Live GPS Location"
      >
        <TargetIcon
          width={18}
          height={18}
          color="#007aff"
          className="ios-blue-nav-arrow"
        />
      </button>
    </div>
  );
};
