// Types for Navigation, OSM lane geometry, and Safety Alerts

export type TurnDirection = 
  | 'sharp_left' 
  | 'left' 
  | 'slight_left' 
  | 'through' 
  | 'slight_right' 
  | 'right' 
  | 'sharp_right' 
  | 'u_turn'
  | 'reverse';

export interface LaneDescriptor {
  index: number;              // 0 = leftmost lane, N = rightmost lane
  direction: TurnDirection;   // primary lane turn designation
  secondaryDirection?: TurnDirection; // e.g. through;right
  isRecommended: boolean;    // Highlighted lane to take NOW
  isPermitted: boolean;      // Can take this lane for current turn, but suboptimal for next turn
  description: string;       // e.g. "Left turn only", "Through or Right"
}

export interface Maneuver {
  id: string;
  type: TurnDirection | 'depart' | 'arrive';
  instruction: string;
  subInstruction?: string;
  distanceToManeuverMeters: number;
  streetName: string;
  location: [number, number]; // [lng, lat]
  // OpenStreetMap lane metadata
  laneCount: number;
  turnLanes: string;         // Raw OSM tag, e.g., "left|through|through;right"
  recommendedLaneIndices: number[]; // Index of optimal lane(s)
}

export interface LookaheadGuidance {
  immediateManeuver: Maneuver;
  upcomingManeuver?: Maneuver;
  distanceBetweenTurnsMeters: number;
  isLookaheadActive: boolean;
  lanes: LaneDescriptor[];
  guidanceText: string;
  subText: string;
}

export interface RightOfWayAlert {
  active: boolean;
  distanceMeters: number;
  streetName: string;
  sideAngleDegrees: number; // ~90 deg for right
  urgency: 'low' | 'medium' | 'high';
  rule: 'RECHTS_VOR_LINKS' | 'GIVE_WAY' | 'STOP';
}

export interface SpeedZoneInfo {
  currentLimit: number | 'none'; // 'none' for unrestricted Autobahn
  upcomingLimit?: number | 'none';
  distanceToChangeMeters?: number;
  roadType: 'residential' | 'living_street' | 'primary' | 'secondary' | 'motorway';
  isAutobahn: boolean;
}

export interface NavigationState {
  currentPosition: [number, number];
  heading: number; // 0-360 degrees
  speedKmh: number;
  currentStepIndex: number;
  lookahead: LookaheadGuidance;
  rightOfWayAlert: RightOfWayAlert | null;
  speedZone: SpeedZoneInfo;
  isSimulating: boolean;
  isGpsActive: boolean;
  isAudioEnabled: boolean;
}
