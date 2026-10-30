import React, { useState, useEffect } from 'react';
import { SunIcon } from '@radix-ui/react-icons';
import { Wifi } from 'lucide-react';

export interface AppleStatusBarProps {
  temperature?: number;
  onWeatherClick?: () => void;
}

export const AppleStatusBar: React.FC<AppleStatusBarProps> = ({
  temperature = 16,
  onWeatherClick
}) => {
  const [currentTime, setCurrentTime] = useState<string>('9:41');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ios-status-bar-container">
      {/* Top System Status Row */}
      <div className="ios-status-bar-row">
        <div className="ios-status-time">{currentTime}</div>
        <div className="ios-status-icons">
          {/* 4-bar cellular signal */}
          <div className="ios-cellular-signal" title="5G Full Signal">
            <span className="signal-bar bar-1" />
            <span className="signal-bar bar-2" />
            <span className="signal-bar bar-3" />
            <span className="signal-bar bar-4" />
          </div>
          <Wifi size={15} strokeWidth={2.6} className="ios-wifi-icon" />
          {/* iOS Battery Capsule */}
          <div className="ios-battery-pill" title="Battery 100%">
            <div className="ios-battery-level" />
            <div className="ios-battery-terminal" />
          </div>
        </div>
      </div>

      {/* Floating Translucent Weather Capsule */}
      <div className="ios-weather-pill" onClick={onWeatherClick} title="Current Weather & Temperature">
        <span className="weather-symbol" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <SunIcon width={14} height={14} color="#eab308" />
        </span>
        <span className="weather-temp">{temperature}°</span>
      </div>
    </div>
  );
};
