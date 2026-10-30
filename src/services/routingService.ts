import type { Maneuver, TurnDirection } from '../types/navigation';

export interface RouteResult {
  coordinates: Array<[number, number]>;
  distanceMeters: number;
  durationSeconds: number;
  steps: Maneuver[];
}

/**
 * Fetches real driving route from OSRM (Free, open-source, no API key required)
 * Falls back to direct geodesic route if offline.
 */
export async function getRealDrivingRoute(
  start: [number, number], // [lng, lat]
  destination: [number, number] // [lng, lat]
): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Routing HTTP error: ${res.status}`);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No driving route found');
    }

    const primaryRoute = data.routes[0];
    const coords: Array<[number, number]> = primaryRoute.geometry.coordinates;

    // Parse OSRM steps into Maneuver objects
    const steps: Maneuver[] = [];
    if (primaryRoute.legs && primaryRoute.legs.length > 0) {
      for (const leg of primaryRoute.legs) {
        for (const step of leg.steps) {
          const type = mapOsrmModifierToTurn(step.maneuver.type, step.maneuver.modifier);
          steps.push({
            id: `step-${steps.length + 1}`,
            instruction: formatManeuverInstruction(step),
            type,
            distanceToManeuverMeters: step.distance,
            streetName: step.name || 'Unnamed Road',
            location: step.maneuver.location || coords[0] || [0, 0],
            laneCount: 2,
            turnLanes: 'through|through',
            recommendedLaneIndices: [0]
          });
        }
      }
    }

    if (steps.length === 0) {
      steps.push({
        id: 'step-1',
        instruction: 'Drive towards destination',
        type: 'through',
        distanceToManeuverMeters: primaryRoute.distance,
        streetName: 'Destination Route',
        location: coords[0] || [0, 0],
        laneCount: 2,
        turnLanes: 'through|through',
        recommendedLaneIndices: [0]
      });
    }

    return {
      coordinates: coords,
      distanceMeters: primaryRoute.distance,
      durationSeconds: primaryRoute.duration,
      steps
    };
  } catch (err) {
    console.warn('Real OSRM routing failed or device offline, generating direct route:', err);
    return generateOfflineDirectRoute(start, destination);
  }
}

/**
 * Map OSRM maneuver modifiers to our TurnDirection enum
 */
function mapOsrmModifierToTurn(type: string, modifier?: string): TurnDirection | 'depart' | 'arrive' {
  if (type === 'depart') return 'depart';
  if (type === 'arrive') return 'arrive';

  switch (modifier) {
    case 'sharp left':
      return 'sharp_left';
    case 'left':
      return 'left';
    case 'slight left':
      return 'slight_left';
    case 'sharp right':
      return 'sharp_right';
    case 'right':
      return 'right';
    case 'slight right':
      return 'slight_right';
    case 'uturn':
      return 'u_turn';
    default:
      return 'through';
  }
}

/**
 * Format readable Apple-style instruction text
 */
function formatManeuverInstruction(step: any): string {
  const name = step.name ? `onto ${step.name}` : '';
  const modifier = step.maneuver.modifier;
  const type = step.maneuver.type;

  if (type === 'arrive') return 'Arrive at destination';
  if (type === 'depart') return `Head ${step.maneuver.modifier || 'forward'} ${name}`.trim();
  if (type === 'roundabout') return `At the roundabout, take exit ${step.maneuver.exit || 1}`;

  if (modifier) {
    const formattedMod = modifier.charAt(0).toUpperCase() + modifier.slice(1);
    return `Turn ${formattedMod} ${name}`.trim();
  }

  return `Continue ${name}`.trim();
}

/**
 * Offline direct path generator if no internet connection available
 */
function generateOfflineDirectRoute(
  start: [number, number],
  dest: [number, number]
): RouteResult {
  const stepsCount = 10;
  const coords: Array<[number, number]> = [];

  for (let i = 0; i <= stepsCount; i++) {
    const ratio = i / stepsCount;
    const lng = start[0] + (dest[0] - start[0]) * ratio;
    const lat = start[1] + (dest[1] - start[1]) * ratio;
    coords.push([lng, lat]);
  }

  // Estimate distance using Haversine
  const dLat = ((dest[1] - start[1]) * Math.PI) / 180;
  const dLng = ((dest[0] - start[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((start[1] * Math.PI) / 180) *
      Math.cos((dest[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = 6371000 * c;
  const estSpeedMs = 13.8; // ~50 km/h average
  const durationSeconds = distanceMeters / estSpeedMs;

  return {
    coordinates: coords,
    distanceMeters,
    durationSeconds,
    steps: [
      {
        id: 'step-offline-1',
        instruction: 'Drive towards destination',
        type: 'through',
        distanceToManeuverMeters: distanceMeters,
        streetName: 'Direct Road Navigation',
        location: start,
        laneCount: 2,
        turnLanes: 'through|through',
        recommendedLaneIndices: [0]
      },
      {
        id: 'step-offline-2',
        instruction: 'Arrive at destination',
        type: 'arrive',
        distanceToManeuverMeters: 0,
        streetName: 'Destination',
        location: dest,
        laneCount: 1,
        turnLanes: 'through',
        recommendedLaneIndices: [0]
      }
    ]
  };
}
