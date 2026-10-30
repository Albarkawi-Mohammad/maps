export interface GpsPositionData {
  coordinate: [number, number]; // [lng, lat]
  heading: number; // degrees 0-360
  speedKmh: number;
  accuracy: number;
  timestamp: number;
}

export type GpsCallback = (data: GpsPositionData) => void;
export type GpsErrorCallback = (error: GeolocationPositionError) => void;

class GpsService {
  private watchId: number | null = null;
  private lastPosition: GpsPositionData | null = null;

  public startTracking(onUpdate: GpsCallback, onError?: GpsErrorCallback): boolean {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported on this device');
      return false;
    }

    // Stop any existing watch
    this.stopTracking();

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    };

    // First attempt quick current position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const data = this.processCoords(pos);
        this.lastPosition = data;
        onUpdate(data);
      },
      (err) => {
        console.warn('Initial GPS fetch error:', err);
        if (onError) onError(err);
      },
      options
    );

    // Continuous real GPS watch
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const data = this.processCoords(pos);
        this.lastPosition = data;
        onUpdate(data);
      },
      (err) => {
        console.warn('GPS continuous tracking error:', err);
        if (onError) onError(err);
      },
      options
    );

    return true;
  }

  public stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private processCoords(pos: GeolocationPosition): GpsPositionData {
    const { longitude, latitude, heading, speed, accuracy } = pos.coords;
    const now = pos.timestamp || Date.now();

    let computedHeading = heading ?? 0;
    let computedSpeedKmh = speed !== null && speed >= 0 ? Math.round(speed * 3.6) : 0;

    // If device doesn't report heading or speed directly, compute from delta
    if (this.lastPosition) {
      const dt = (now - this.lastPosition.timestamp) / 1000; // in seconds
      if (dt > 0.5) {
        const distMeters = this.calculateDistanceMeters(
          this.lastPosition.coordinate,
          [longitude, latitude]
        );

        // Compute speed if hardware didn't provide it
        if (speed === null || isNaN(speed)) {
          const speedMs = distMeters / dt;
          computedSpeedKmh = Math.round(speedMs * 3.6);
        }

        // Compute bearing/heading if vehicle moved more than 2 meters
        if (distMeters >= 2 && (heading === null || isNaN(heading))) {
          computedHeading = this.calculateBearing(
            this.lastPosition.coordinate,
            [longitude, latitude]
          );
        } else if (heading === null || isNaN(heading)) {
          computedHeading = this.lastPosition.heading;
        }
      }
    }

    return {
      coordinate: [longitude, latitude],
      heading: computedHeading,
      speedKmh: Math.max(0, computedSpeedKmh),
      accuracy: accuracy || 10,
      timestamp: now
    };
  }

  private calculateDistanceMeters(p1: [number, number], p2: [number, number]): number {
    const R = 6371000;
    const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
    const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1[1] * Math.PI) / 180) *
        Math.cos((p2[1] * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBearing(start: [number, number], end: [number, number]): number {
    const lat1 = (start[1] * Math.PI) / 180;
    const lat2 = (end[1] * Math.PI) / 180;
    const dLng = ((end[0] - start[0]) * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }
}

export const gpsService = new GpsService();
