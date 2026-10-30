import type { RightOfWayAlert } from '../types/navigation';

export interface IntersectingRoad {
  id: string;
  name: string;
  location: [number, number]; // [lng, lat] of the junction node
  bearingFromVehicleRoute: number; // 0 to 360 relative to vehicle heading
  hasPrioritySign: boolean; // true if driver has priority
  hasTrafficLight: boolean; // true if regulated by signal
  isRightHandEntry: boolean; // incoming road enters from driver's right side
}

/**
 * Calculates relative angle between vehicle heading and incoming road segment.
 * Angle in degrees: 0 = straight ahead, 90 = directly right, 270 = directly left.
 */
export function calculateRelativeAngle(vehicleHeading: number, roadBearing: number): number {
  let diff = (roadBearing - vehicleHeading) % 360;
  if (diff < 0) diff += 360;
  return diff;
}

/**
 * Calculates geographic distance in meters between two [lng, lat] coordinates (Haversine formula)
 */
export function calculateDistanceMeters(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371e3; // Earth radius in meters
  const lat1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[1] * Math.PI) / 180;
  const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Evaluates whether an upcoming intersection requires Rechts-vor-Links yield warning.
 */
export function evaluateRightOfWay(
  vehicleCoord: [number, number],
  vehicleSpeedKmh: number,
  roadType: string,
  incomingRoad?: IntersectingRoad
): RightOfWayAlert | null {
  // Only applies in residential / living streets / zones <= 30 km/h
  const isResidentialZone = roadType === 'residential' || roadType === 'living_street' || roadType === 'zone30';
  if (!isResidentialZone || !incomingRoad) return null;

  // If there's an explicit traffic light or priority road sign, right-of-way does not apply
  if (incomingRoad.hasTrafficLight || incomingRoad.hasPrioritySign) {
    return null;
  }

  // Check if incoming road is entering from the right (angle between 35 and 125 degrees)
  const angle = incomingRoad.bearingFromVehicleRoute;
  const isFromRight = incomingRoad.isRightHandEntry || (angle >= 35 && angle <= 125);

  if (!isFromRight) return null;

  // Calculate actual physical distance between car and incoming junction
  const distanceMeters = calculateDistanceMeters(vehicleCoord, incomingRoad.location);

  // Warning active window: 5m to 85m ahead
  if (distanceMeters < 5 || distanceMeters > 85) return null;

  let urgency: 'low' | 'medium' | 'high' = 'low';
  if (distanceMeters <= 30 || (vehicleSpeedKmh > 25 && distanceMeters <= 42)) {
    urgency = 'high';
  } else if (distanceMeters <= 60) {
    urgency = 'medium';
  }

  return {
    active: true,
    distanceMeters: Math.round(distanceMeters),
    streetName: incomingRoad.name || 'Seitenstraße',
    sideAngleDegrees: Math.round(angle),
    urgency,
    rule: 'RECHTS_VOR_LINKS'
  };
}
