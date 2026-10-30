import type { LocationCategoryType } from './favorites';

export interface TimelineStop {
  id: string;
  name: string;
  address: string;
  city: string;
  category: LocationCategoryType;
  emoji: string;
  coordinate: [number, number]; // [lng, lat]
  arrivalTime: number; // timestamp ms
  departureTime: number; // timestamp ms
  durationMinutes: number;
}

export interface TimelineTrip {
  id: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  startPlace: string;
  endPlace: string;
  startCity: string;
  endCity: string;
  path: Array<[number, number]>; // [lng, lat][]
}

export interface TimelineDay {
  dateKey: string; // YYYY-MM-DD
  dateDisplay: string; // e.g. "Today, Oct 25" or "Yesterday, Oct 24"
  trips: TimelineTrip[];
  stops: TimelineStop[];
  totalDistanceKm: number;
  totalDriveMinutes: number;
  citiesVisited: string[];
}

export interface TimelineSettings {
  isEnabled: boolean; // Opt-in tracking toggle
  autoDetectStops: boolean;
  privacyNoticeAcknowledged: boolean;
  recordIntervalSeconds: number;
}

export interface TimelineSummaryStats {
  totalKmAllTime: number;
  totalTripsCount: number;
  totalStopsCount: number;
  totalCitiesCount: number;
  citiesList: string[];
}
