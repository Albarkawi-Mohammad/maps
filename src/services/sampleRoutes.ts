import type { Maneuver, SpeedZoneInfo } from '../types/navigation';
import type { IntersectingRoad } from '../spatial/rightOfWay';

export interface RouteWaypoint {
  coordinate: [number, number]; // [lng, lat]
  speedKmh: number;
  heading: number;
  stepIndex: number;
  distanceToNextMeters: number;
  speedZone: SpeedZoneInfo;
  incomingRoad?: IntersectingRoad;
}

export interface NavigationRoute {
  id: string;
  name: string;
  destination: string;
  initialCenter: [number, number];
  initialHeading: number;
  steps: Maneuver[];
  waypoints: RouteWaypoint[];
}

/**
 * Continuous real-world driving route:
 * Starts in residential 30 zone (Rechts-vor-Links automatically triggers),
 * transitions to urban multi-lane arterial B1 (Multi-Step Lane Guidance automatically triggers),
 * and continues onto Autobahn A1 (Autobahn speed signs automatically trigger).
 */
export const UNIFIED_ROUTE: NavigationRoute = {
  id: 'dortmund-route',
  name: 'Drive to Autobahn A1',
  destination: 'Autobahn A1 / Kamen',
  initialCenter: [7.6210, 51.9680],
  initialHeading: 355,
  steps: [
    // Step 0: Residential Zone 30
    {
      id: 'step-0',
      type: 'through',
      instruction: 'Continue straight on Studtstraße',
      subInstruction: 'Zone 30 — Yield to Right',
      distanceToManeuverMeters: 380,
      streetName: 'Studtstraße',
      location: [7.6205, 51.9715],
      laneCount: 1,
      turnLanes: 'through',
      recommendedLaneIndices: [0]
    },
    // Step 1: Approaching major intersection on Ruhrallee (Multi-Lane Guidance)
    {
      id: 'step-1',
      type: 'left',
      instruction: 'Turn Left onto B1 / Rheinlanddamm',
      subInstruction: 'Prepare for immediate Right turn in 140m',
      distanceToManeuverMeters: 220,
      streetName: 'Ruhrallee',
      location: [7.4665, 51.5055],
      laneCount: 4,
      turnLanes: 'left|left|through|through;right', // 2 left lanes!
      recommendedLaneIndices: [1] // Outer left lane #2 is recommended!
    },
    // Step 2: Immediate Right turn after B1
    {
      id: 'step-2',
      type: 'right',
      instruction: 'Turn Right onto Markgrafenstraße',
      distanceToManeuverMeters: 140,
      streetName: 'Markgrafenstraße',
      location: [7.4690, 51.5061],
      laneCount: 3,
      turnLanes: 'through|through|right',
      recommendedLaneIndices: [2]
    },
    // Step 3: Highway connector towards Autobahn A1
    {
      id: 'step-3',
      type: 'through',
      instruction: 'Merge onto Autobahn A1',
      subInstruction: 'Richtgeschwindigkeit — Free Flow',
      distanceToManeuverMeters: 900,
      streetName: 'A1 Richtung Bremen',
      location: [7.6590, 51.5990],
      laneCount: 3,
      turnLanes: 'through|through|through',
      recommendedLaneIndices: [1]
    }
  ],
  waypoints: [
    // === SEGMENT 1: RESIDENTIAL 30 ZONE (Rechts vor Links triggers automatically) ===
    {
      coordinate: [7.6210, 51.9680],
      speedKmh: 28,
      heading: 355,
      stepIndex: 0,
      distanceToNextMeters: 380,
      speedZone: { currentLimit: 30, roadType: 'residential', isAutobahn: false }
    },
    {
      coordinate: [7.6209, 51.9685],
      speedKmh: 29,
      heading: 355,
      stepIndex: 0,
      distanceToNextMeters: 330,
      speedZone: { currentLimit: 30, roadType: 'residential', isAutobahn: false }
    },
    // Approaching Gartenweg (Right-hand side-street 55m away -> RECHTS VOR LINKS triggers)
    {
      coordinate: [7.6208, 51.9690],
      speedKmh: 27,
      heading: 355,
      stepIndex: 0,
      distanceToNextMeters: 280,
      speedZone: { currentLimit: 30, roadType: 'residential', isAutobahn: false },
      incomingRoad: {
        id: 'cross-1',
        name: 'Gartenweg',
        location: [7.6207, 51.9695],
        bearingFromVehicleRoute: 88,
        hasPrioritySign: false,
        hasTrafficLight: false,
        isRightHandEntry: true
      }
    },
    // 30m away from Gartenweg (Urgent yield warning)
    {
      coordinate: [7.62075, 51.9692],
      speedKmh: 22,
      heading: 355,
      stepIndex: 0,
      distanceToNextMeters: 250,
      speedZone: { currentLimit: 30, roadType: 'residential', isAutobahn: false },
      incomingRoad: {
        id: 'cross-1',
        name: 'Gartenweg',
        location: [7.6207, 51.9695],
        bearingFromVehicleRoute: 88,
        hasPrioritySign: false,
        hasTrafficLight: false,
        isRightHandEntry: true
      }
    },
    // Crossing junction
    {
      coordinate: [7.6207, 51.9695],
      speedKmh: 20,
      heading: 355,
      stepIndex: 0,
      distanceToNextMeters: 220,
      speedZone: { currentLimit: 30, roadType: 'residential', isAutobahn: false }
    },
    {
      coordinate: [7.6205, 51.9710],
      speedKmh: 30,
      heading: 355,
      stepIndex: 0,
      distanceToNextMeters: 60,
      speedZone: { currentLimit: 30, roadType: 'residential', isAutobahn: false }
    },

    // === SEGMENT 2: CITY ARTERIAL (Multi-Step Lane Guidance triggers automatically) ===
    {
      coordinate: [7.4658, 51.5032],
      speedKmh: 48,
      heading: 10,
      stepIndex: 1,
      distanceToNextMeters: 220,
      speedZone: { currentLimit: 50, roadType: 'primary', isAutobahn: false }
    },
    {
      coordinate: [7.4660, 51.5038],
      speedKmh: 45,
      heading: 10,
      stepIndex: 1,
      distanceToNextMeters: 170,
      speedZone: { currentLimit: 50, roadType: 'primary', isAutobahn: false }
    },
    {
      coordinate: [7.4662, 51.5044],
      speedKmh: 38,
      heading: 12,
      stepIndex: 1,
      distanceToNextMeters: 110,
      speedZone: { currentLimit: 50, roadType: 'primary', isAutobahn: false }
    },
    {
      coordinate: [7.4664, 51.5050],
      speedKmh: 28,
      heading: 14,
      stepIndex: 1,
      distanceToNextMeters: 50,
      speedZone: { currentLimit: 50, roadType: 'primary', isAutobahn: false }
    },
    {
      coordinate: [7.4665, 51.5055],
      speedKmh: 22,
      heading: 50,
      stepIndex: 1,
      distanceToNextMeters: 15,
      speedZone: { currentLimit: 50, roadType: 'primary', isAutobahn: false }
    },

    // === SEGMENT 3: IMMEDIATE RIGHT TURN (140m after left turn) ===
    {
      coordinate: [7.4670, 51.5057],
      speedKmh: 36,
      heading: 85,
      stepIndex: 2,
      distanceToNextMeters: 125,
      speedZone: { currentLimit: 50, roadType: 'primary', isAutobahn: false }
    },
    {
      coordinate: [7.4680, 51.5059],
      speedKmh: 32,
      heading: 88,
      stepIndex: 2,
      distanceToNextMeters: 45,
      speedZone: { currentLimit: 50, roadType: 'primary', isAutobahn: false }
    },
    {
      coordinate: [7.4690, 51.5061],
      speedKmh: 20,
      heading: 140,
      stepIndex: 2,
      distanceToNextMeters: 5,
      speedZone: { currentLimit: 50, roadType: 'primary', isAutobahn: false }
    },

    // === SEGMENT 4: AUTOBAHN A1 (Speed transition to Unrestricted) ===
    {
      coordinate: [7.6520, 51.5840],
      speedKmh: 110,
      heading: 25,
      stepIndex: 3,
      distanceToNextMeters: 900,
      speedZone: {
        currentLimit: 120,
        upcomingLimit: 'none',
        distanceToChangeMeters: 400,
        roadType: 'motorway',
        isAutobahn: true
      }
    },
    {
      coordinate: [7.6550, 51.5900],
      speedKmh: 138,
      heading: 25,
      stepIndex: 3,
      distanceToNextMeters: 600,
      speedZone: {
        currentLimit: 'none', // Zeichen 282: Freie Fahrt!
        roadType: 'motorway',
        isAutobahn: true
      }
    },
    {
      coordinate: [7.6580, 51.5960],
      speedKmh: 145,
      heading: 25,
      stepIndex: 3,
      distanceToNextMeters: 250,
      speedZone: {
        currentLimit: 'none',
        roadType: 'motorway',
        isAutobahn: true
      }
    }
  ]
};
