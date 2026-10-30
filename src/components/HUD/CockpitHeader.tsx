import React from 'react';
import type { Maneuver } from '../../types/navigation';
import {
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  RotateCcw
} from 'lucide-react';

export interface CockpitHeaderProps {
  currentManeuver: Maneuver;
  upcomingManeuver?: Maneuver;
  isLookaheadActive?: boolean;
}

function renderTurnIcon(type: string, size = 32) {
  switch (type) {
    case 'left':
    case 'sharp_left':
    case 'slight_left':
      return <ArrowUpLeft size={size} strokeWidth={2.6} />;
    case 'right':
    case 'sharp_right':
    case 'slight_right':
      return <ArrowUpRight size={size} strokeWidth={2.6} />;
    case 'u_turn':
      return <RotateCcw size={size} strokeWidth={2.6} />;
    default:
      return <ArrowUp size={size} strokeWidth={2.6} />;
  }
}

export const CockpitHeader: React.FC<CockpitHeaderProps> = ({
  currentManeuver,
  upcomingManeuver,
  isLookaheadActive
}) => {
  return (
    <div className="cockpit-header-card">
      <div className="card-specular-highlight" />
      <div className="maneuver-primary-row">
        <div className="turn-icon-box">
          {renderTurnIcon(currentManeuver.type, 30)}
        </div>
        <div className="maneuver-details">
          <div className="distance-counter">
            <span className="meters-value">
              {Math.round(currentManeuver.distanceToManeuverMeters)}
            </span>
            <span className="meters-label">m</span>
          </div>
          <div className="instruction-text">{currentManeuver.instruction}</div>
          <div className="current-street-name">
            <span className="road-dot" />
            <span>{currentManeuver.streetName}</span>
          </div>
        </div>
      </div>

      {isLookaheadActive && upcomingManeuver && (
        <div className="subsequent-turn-pill">
          <div className="subsequent-badge">THEN</div>
          <div className="subsequent-icon">
            {renderTurnIcon(upcomingManeuver.type, 15)}
          </div>
          <div className="subsequent-text">
            In <strong>{Math.round(upcomingManeuver.distanceToManeuverMeters)}m</strong>: {upcomingManeuver.instruction}
          </div>
        </div>
      )}
    </div>
  );
};
