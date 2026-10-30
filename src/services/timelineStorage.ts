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

// Seed realistic, rich timeline history for the user's region (Ahlen / Münster / Westphalia)
function generateSeedDays(): TimelineDay[] {
  const now = new Date();
  const todayKey = now.toISOString().split('T')[0];

  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  const twoDaysAgo = new Date(now.getTime() - 86400000 * 2);
  const twoDaysAgoKey = twoDaysAgo.toISOString().split('T')[0];

  return [
    // Today: Trip from Ahlen to Münster with café and dining stops
    {
      dateKey: todayKey,
      dateDisplay: 'Today',
      totalDistanceKm: 38.4,
      totalDriveMinutes: 48,
      citiesVisited: ['Ahlen', 'Münster'],
      stops: [
        {
          id: 'stop-today-1',
          name: 'Home',
          address: 'Südstraße 14, Ahlen',
          city: 'Ahlen',
          category: 'home',
          emoji: '🏠',
          coordinate: [7.8920, 51.7610],
          arrivalTime: new Date().setHours(8, 0, 0, 0),
          departureTime: new Date().setHours(11, 30, 0, 0),
          durationMinutes: 210
        },
        {
          id: 'stop-today-2',
          name: 'Pizzeria Trattoria Trevi',
          address: 'Bült 2, 48143 Münster',
          city: 'Münster',
          category: 'food',
          emoji: '🍕',
          coordinate: [7.6291, 51.9625],
          arrivalTime: new Date().setHours(12, 15, 0, 0),
          departureTime: new Date().setHours(13, 0, 0, 0),
          durationMinutes: 45
        },
        {
          id: 'stop-today-3',
          name: 'Café Extrablatt Münster',
          address: 'Salzstraße 11, 48143 Münster',
          city: 'Münster',
          category: 'coffee',
          emoji: '☕',
          coordinate: [7.6300, 51.9615],
          arrivalTime: new Date().setHours(13, 10, 0, 0),
          departureTime: new Date().setHours(13, 50, 0, 0),
          durationMinutes: 40
        }
      ],
      trips: [
        {
          id: 'trip-today-1',
          startTime: new Date().setHours(11, 30, 0, 0),
          endTime: new Date().setHours(12, 15, 0, 0),
          durationMinutes: 45,
          distanceKm: 35.8,
          avgSpeedKmh: 68,
          maxSpeedKmh: 118,
          startPlace: 'Südstraße, Ahlen',
          endPlace: 'Bült 2, Münster',
          startCity: 'Ahlen',
          endCity: 'Münster',
          path: [
            [7.8920, 51.7610],
            [7.8750, 51.7700],
            [7.8200, 51.8100],
            [7.7400, 51.8900],
            [7.6500, 51.9400],
            [7.6291, 51.9625]
          ]
        },
        {
          id: 'trip-today-2',
          startTime: new Date().setHours(13, 0, 0, 0),
          endTime: new Date().setHours(13, 10, 0, 0),
          durationMinutes: 10,
          distanceKm: 2.6,
          avgSpeedKmh: 24,
          maxSpeedKmh: 42,
          startPlace: 'Bült 2, Münster',
          endPlace: 'Salzstraße 11, Münster',
          startCity: 'Münster',
          endCity: 'Münster',
          path: [
            [7.6291, 51.9625],
            [7.6280, 51.9620],
            [7.6300, 51.9615]
          ]
        }
      ]
    },

    // Yesterday: Scenic trip to Aasee Lake and Park
    {
      dateKey: yesterdayKey,
      dateDisplay: 'Yesterday',
      totalDistanceKm: 16.2,
      totalDriveMinutes: 28,
      citiesVisited: ['Münster'],
      stops: [
        {
          id: 'stop-yest-1',
          name: 'Aasee Ufer Beach & Promenade',
          address: 'Bismarckallee 47, Münster',
          city: 'Münster',
          category: 'water',
          emoji: '🌊',
          coordinate: [7.6150, 51.9520],
          arrivalTime: new Date(yesterday.getTime()).setHours(15, 0, 0, 0),
          departureTime: new Date(yesterday.getTime()).setHours(16, 30, 0, 0),
          durationMinutes: 90
        },
        {
          id: 'stop-yest-2',
          name: 'Historic City Hall',
          address: 'Prinzipalmarkt 10, Münster',
          city: 'Münster',
          category: 'other',
          emoji: '⭐',
          coordinate: [7.6279, 51.9616],
          arrivalTime: new Date(yesterday.getTime()).setHours(17, 0, 0, 0),
          departureTime: new Date(yesterday.getTime()).setHours(18, 0, 0, 0),
          durationMinutes: 60
        }
      ],
      trips: [
        {
          id: 'trip-yest-1',
          startTime: new Date(yesterday.getTime()).setHours(14, 30, 0, 0),
          endTime: new Date(yesterday.getTime()).setHours(15, 0, 0, 0),
          durationMinutes: 30,
          distanceKm: 12.5,
          avgSpeedKmh: 35,
          maxSpeedKmh: 54,
          startPlace: 'Prinzipalmarkt',
          endPlace: 'Aasee Ufer Beach',
          startCity: 'Münster',
          endCity: 'Münster',
          path: [
            [7.6279, 51.9616],
            [7.6210, 51.9580],
            [7.6150, 51.9520]
          ]
        }
      ]
    },

    // 2 Days Ago: Trip to Dortmund Tech Hub
    {
      dateKey: twoDaysAgoKey,
      dateDisplay: 'Oct 23',
      totalDistanceKm: 52.0,
      totalDriveMinutes: 44,
      citiesVisited: ['Ahlen', 'Hamm', 'Dortmund'],
      stops: [
        {
          id: 'stop-prev-1',
          name: 'Tech Campus & Office',
          address: 'Emil-Figge-Straße, Dortmund',
          city: 'Dortmund',
          category: 'work',
          emoji: '💼',
          coordinate: [7.4120, 51.4920],
          arrivalTime: new Date(twoDaysAgo.getTime()).setHours(9, 30, 0, 0),
          departureTime: new Date(twoDaysAgo.getTime()).setHours(16, 0, 0, 0),
          durationMinutes: 390
        }
      ],
      trips: [
        {
          id: 'trip-prev-1',
          startTime: new Date(twoDaysAgo.getTime()).setHours(8, 45, 0, 0),
          endTime: new Date(twoDaysAgo.getTime()).setHours(9, 30, 0, 0),
          durationMinutes: 45,
          distanceKm: 52.0,
          avgSpeedKmh: 82,
          maxSpeedKmh: 135,
          startPlace: 'Ahlen City',
          endPlace: 'Dortmund Tech Campus',
          startCity: 'Ahlen',
          endCity: 'Dortmund',
          path: [
            [7.8920, 51.7610],
            [7.8100, 51.6800],
            [7.6200, 51.5800],
            [7.4120, 51.4920]
          ]
        }
      ]
    }
  ];
}

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
