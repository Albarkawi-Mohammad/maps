import React, { useEffect } from 'react';
import type { RightOfWayAlert as RightOfWayAlertType } from '../../types/navigation';
import { soundManager } from '../../spatial/soundEffects';
import { TriangleAlert, Compass } from 'lucide-react';

export interface RightOfWayAlertProps {
  alert: RightOfWayAlertType | null | undefined;
  audioEnabled?: boolean;
}

export const RightOfWayAlert: React.FC<RightOfWayAlertProps> = ({
  alert,
  audioEnabled = true
}) => {
  useEffect(() => {
    if (alert?.active && audioEnabled) {
      soundManager.playYieldAlert();
    }
  }, [alert, audioEnabled]);

  if (!alert || !alert.active) return null;

  const isHigh = alert.urgency === 'high';
  const progressPercent = Math.min(100, Math.max(10, (alert.distanceMeters / 75) * 100));

  return (
    <div className={`rvl-alert-container ${isHigh ? 'rvl-high-urgency' : 'rvl-medium-urgency'}`}>
      <div className="rvl-radar-visual">
        <div className="radar-core-circle">
          <TriangleAlert size={26} className="rvl-triangle-icon" />
        </div>
        <div className="radar-wave wave-1" />
        <div className="radar-wave wave-2" />
      </div>

      <div className="rvl-content">
        <div className="rvl-title-row">
          <div className="rvl-badge-group">
            <span className="rvl-badge">RIGHT-OF-WAY</span>
            <span className="rvl-legal-tag">StVO § 8</span>
          </div>
          <span className="rvl-distance-pill">
            <span className="distance-num">{alert.distanceMeters}</span>
            <span className="distance-unit">m</span>
          </span>
        </div>

        <div className="rvl-main-message">Yield Right-of-Way: Priority to Right</div>

        <div className="rvl-street-name">
          <Compass size={13} className="inline-compass" />
          <span>
            Incoming: <strong>{alert.streetName}</strong>
          </span>
        </div>

        <div className="rvl-progress-track">
          <div className="rvl-progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
};
