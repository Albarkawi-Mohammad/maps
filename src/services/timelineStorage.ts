import type {
  TimelineDay,
  TimelineTrip,
  TimelineSettings,
  TimelineSummaryStats
} from '../types/timeline';

const SETTINGS_KEY = 'apple_maps_timeline_settings_v1';
const DAYS_KEY = 'apple_maps_timeline_days_v1';

const DEFAULT_SETTINGS: TimelineSettings = {
  isEnabled: true,
  autoDetectStops: true,
  privacyNoticeAcknowledged: true,
  recordIntervalSeconds: 3
};

// Start with no location history.
function generateSeedDays(): TimelineDay[] { return []; }

class TimelineStorageService {
  public getSettings(): TimelineSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public updateSettings(partial: Partial<TimelineSettings>): TimelineSettings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  }

  public getAllDays(): TimelineDay[] {
    try {
      const stored = localStorage.getItem(DAYS_KEY);
      if (!stored) {
        const seed = generateSeedDays();
        localStorage.setItem(DAYS_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(stored);
    } catch {
      return generateSeedDays();
    }
  }

  public getDay(dateKey: string): TimelineDay | null {
    const days = this.getAllDays();
    return days.find((d) => d.dateKey === dateKey) || null;
  }

  public recordCompletedTrip(trip: Omit<TimelineTrip, 'id'>) {
    if (!this.getSettings().isEnabled) return;

    const days = this.getAllDays();
    const todayKey = new Date().toISOString().split('T')[0];

    const newTrip: TimelineTrip = {
      ...trip,
      id: `trip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };

    let dayIndex = days.findIndex((d) => d.dateKey === todayKey);
    if (dayIndex >= 0) {
      const day = days[dayIndex];
      day.trips.unshift(newTrip);
      day.totalDistanceKm = Math.round((day.totalDistanceKm + newTrip.distanceKm) * 10) / 10;
      day.totalDriveMinutes += newTrip.durationMinutes;
      if (!day.citiesVisited.includes(newTrip.startCity)) day.citiesVisited.push(newTrip.startCity);
      if (!day.citiesVisited.includes(newTrip.endCity)) day.citiesVisited.push(newTrip.endCity);
      days[dayIndex] = day;
    } else {
      const newDay: TimelineDay = {
        dateKey: todayKey,
        dateDisplay: 'Today',
        trips: [newTrip],
        stops: [],
        totalDistanceKm: newTrip.distanceKm,
        totalDriveMinutes: newTrip.durationMinutes,
        citiesVisited: [newTrip.startCity, newTrip.endCity].filter((v, i, a) => a.indexOf(v) === i)
      };
      days.unshift(newDay);
    }

    localStorage.setItem(DAYS_KEY, JSON.stringify(days));
  }

  public deleteTrip(dateKey: string, tripId: string): TimelineDay[] {
    const days = this.getAllDays();
    const day = days.find((d) => d.dateKey === dateKey);
    if (day) {
      day.trips = day.trips.filter((t) => t.id !== tripId);
      day.totalDistanceKm = day.trips.reduce((acc, t) => acc + t.distanceKm, 0);
      day.totalDriveMinutes = day.trips.reduce((acc, t) => acc + t.durationMinutes, 0);
      localStorage.setItem(DAYS_KEY, JSON.stringify(days));
    }
    return days;
  }

  public deleteStop(dateKey: string, stopId: string): TimelineDay[] {
    const days = this.getAllDays();
    const day = days.find((d) => d.dateKey === dateKey);
    if (day) {
      day.stops = day.stops.filter((s) => s.id !== stopId);
      localStorage.setItem(DAYS_KEY, JSON.stringify(days));
    }
    return days;
  }

  public clearDay(dateKey: string): TimelineDay[] {
    const days = this.getAllDays();
    const filtered = days.filter((d) => d.dateKey !== dateKey);
    localStorage.setItem(DAYS_KEY, JSON.stringify(filtered));
    return filtered;
  }

  public clearAllTimelineData() {
    localStorage.removeItem(DAYS_KEY);
  }

  public exportTimelineJson(): string {
    const data = {
      exportTimestamp: Date.now(),
      privacy: '100% On-Device Local Data. Never uploaded to cloud.',
      timelineDays: this.getAllDays()
    };
    return JSON.stringify(data, null, 2);
  }

  public getSummaryStats(): TimelineSummaryStats {
    const days = this.getAllDays();
    let totalKm = 0;
    let totalTrips = 0;
    let totalStops = 0;
    const citiesSet = new Set<string>();

    for (const d of days) {
      totalKm += d.totalDistanceKm;
      totalTrips += d.trips.length;
      totalStops += d.stops.length;
      for (const c of d.citiesVisited) {
        citiesSet.add(c);
      }
    }

    return {
      totalKmAllTime: Math.round(totalKm * 10) / 10,
      totalTripsCount: totalTrips,
      totalStopsCount: totalStops,
      totalCitiesCount: citiesSet.size,
      citiesList: Array.from(citiesSet)
    };
  }
}

export const timelineStorage = new TimelineStorageService();

