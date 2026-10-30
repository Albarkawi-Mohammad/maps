import React from 'react';
import type { LaneDescriptor, TurnDirection } from '../../types/navigation';
import { soundManager } from '../../spatial/soundEffects';
import {
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export interface LaneGuidanceBarProps {
  lanes: LaneDescriptor[];
  isLookaheadActive: boolean;
  subText: string;
}

function renderLaneArrow(dir: TurnDirection, size = 24) {
  switch (dir) {
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

export const LaneGuidanceBar: React.FC<LaneGuidanceBarProps> = ({
  lanes,
  isLookaheadActive,
  subText
}) => {
  if (!lanes || lanes.length === 0) return null;

  const handleClick = () => {
    soundManager.playClickSound();
  };

  return (
    <div className="lane-guidance-container">
      <div className="lane-bar-header">
        <div className="lane-status-badge">
          <span className="live-radar-dot" />
          <span>{isLookaheadActive ? 'PREDICTIVE LANE GUIDANCE' : 'ACTIVE LANES'}</span>
        </div>
        {isLookaheadActive && (
          <span className="lookahead-badge">
            <Sparkles size={11} className="sparkle-icon" />
            <span>2-Step Anticipation</span>
          </span>
        )}
      </div>

      <div className="lanes-road-surface">
        {lanes.map((lane, idx) => {
          const isRec = lane.isRecommended;
          const isPerm = lane.isPermitted;
          const statusClass = isRec
            ? 'lane-recommended'
            : isPerm
            ? 'lane-permitted'
            : 'lane-restricted';

          return (
            <React.Fragment key={idx}>
              {idx > 0 && <div className="lane-road-divider" />}
              <div
                className={`lane-box ${statusClass}`}
                title={lane.description}
                onClick={handleClick}
              >
                {isRec && (
                  <div className="best-lane-badge">
                    <span>BEST</span>
                  </div>
                )}
                <div className="lane-arrow-icon">
                  {renderLaneArrow(lane.direction, isRec ? 26 : 22)}
                  {lane.secondaryDirection && (
                    <span className="secondary-arrow">
                      {renderLaneArrow(lane.secondaryDirection, 18)}
                    </span>
                  )}
                </div>
                <div className="lane-number">Lane {idx + 1}</div>
                {isRec && <div className="lane-glow-bar" />}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {subText && (
        <div className="lane-subtext-banner">
          <div className="pulse-beacon" />
          <span className="subtext-content">{subText}</span>
        </div>
      )}
    </div>
  );
};
