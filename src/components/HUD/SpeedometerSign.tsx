import React from 'react';
import type { SpeedZoneInfo } from '../../types/navigation';
import { ChevronRight } from 'lucide-react';

export interface SpeedometerSignProps {
  currentSpeedKmh: number;
  speedZone: SpeedZoneInfo;
}

export const SpeedometerSign: React.FC<SpeedometerSignProps> = ({
  currentSpeedKmh,
  speedZone
}) => {
  const limitNumber = typeof speedZone.currentLimit === 'number' ? speedZone.currentLimit : 130;
  const isOver = typeof speedZone.currentLimit === 'number' && currentSpeedKmh > speedZone.currentLimit + 3;
  const gaugeMax = Math.max(180, limitNumber + 40);
  const strokeOffset = 157 * (1 - Math.min(1, Math.max(0, currentSpeedKmh / gaugeMax)));

  return (
    <div className="speedometer-widget">
      <div className={`digital-speed-gauge ${isOver ? 'speed-over-limit' : ''}`}>
        <svg className="speed-arc-svg" viewBox="0 0 100 60" width="80" height="48">
          <path
            d="M 15 50 A 35 35 0 0 1 85 50"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 15 50 A 35 35 0 0 1 85 50"
            fill="none"
            stroke={isOver ? '#ef4444' : '#10b981'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="157"
            strokeDashoffset={strokeOffset}
            className="speed-arc-fill"
          />
        </svg>
        <div className="speed-content-centered">
          <span className="speed-number">{Math.round(currentSpeedKmh)}</span>
          <span className="speed-unit">KM/H</span>
        </div>
      </div>

      <div className="german-sign-container">
        {speedZone.currentLimit === 'none' ? (
          <div className="autobahn-unrestricted-sign" title="Unrestricted Highway (End of Speed Limit)">
            <div className="diagonal-line line-1" />
            <div className="diagonal-line line-2" />
            <div className="diagonal-line line-3" />
            <div className="diagonal-line line-4" />
          </div>
        ) : (
          <div className={`german-speed-limit-sign ${isOver ? 'sign-pulse-danger' : ''}`}>
            <span>{speedZone.currentLimit}</span>
          </div>
        )}

        {speedZone.upcomingLimit !== undefined && speedZone.distanceToChangeMeters && (
          <div className="upcoming-speed-pill">
            <span className="upcoming-chevron" style={{ display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={11} strokeWidth={2.6} />
            </span>
            <span>
              {speedZone.upcomingLimit === 'none' ? 'No Limit' : `${speedZone.upcomingLimit} km/h`}
            </span>
            <span className="upcoming-dist">in {speedZone.distanceToChangeMeters}m</span>
          </div>
        )}
      </div>
    </div>
  );
};
