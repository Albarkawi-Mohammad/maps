import type { LaneDescriptor, Maneuver, LookaheadGuidance, TurnDirection } from '../types/navigation';

/**
 * Parses raw OSM turn:lanes tag into individual lane directions.
 * E.g., "left;through|through|right" -> [
 *   { direction: 'left', secondaryDirection: 'through' },
 *   { direction: 'through' },
 *   { direction: 'right' }
 * ]
 */
export function parseOsmTurnLanes(turnLanesTag: string, totalLanesCount = 1): Array<{ direction: TurnDirection; secondary?: TurnDirection }> {
  if (!turnLanesTag || turnLanesTag.trim() === '') {
    // Fallback if tag is missing: generate default generic through lanes
    const count = Math.max(1, totalLanesCount);
    return Array.from({ length: count }, () => ({ direction: 'through' as TurnDirection }));
  }

  const rawLanes = turnLanesTag.split('|');
  return rawLanes.map((laneStr) => {
    const parts = laneStr.split(';').map(s => s.trim().toLowerCase());
    const primary = normalizeTurnDirection(parts[0]);
    const secondary = parts.length > 1 ? normalizeTurnDirection(parts[1]) : undefined;
    return { direction: primary, secondary };
  });
}

function normalizeTurnDirection(raw: string): TurnDirection {
  switch (raw) {
    case 'left':
    case 'sharp_left':
      return 'left';
    case 'slight_left':
      return 'slight_left';
    case 'right':
    case 'sharp_right':
      return 'right';
    case 'slight_right':
      return 'slight_right';
    case 'through':
    case 'none':
      return 'through';
    case 'u_turn':
    case 'reverse':
      return 'u_turn';
    default:
      return 'through';
  }
}

/**
 * Multi-Step Lookahead Evaluator
 * Evaluates immediate turn M1 and next turn M2.
 * Calculates optimal lane to take BEFORE entering M1.
 */
export function evaluateMultiStepLanes(
  immediate: Maneuver,
  upcoming?: Maneuver,
  isHighway = false
): LookaheadGuidance {
  const parsedLanes = parseOsmTurnLanes(immediate.turnLanes, immediate.laneCount);
  const lookaheadThreshold = isHighway ? 850 : 280; // Distance in meters to trigger lookahead
  
  const hasLookahead = !!(
    upcoming && 
    upcoming.distanceToManeuverMeters > 0 &&
    upcoming.distanceToManeuverMeters <= lookaheadThreshold
  );

  const distanceBetweenTurns = upcoming ? upcoming.distanceToManeuverMeters : 0;

  // Find candidate lanes matching the immediate maneuver
  const immediateTargetType = immediate.type;
  const candidateIndices: number[] = [];

  parsedLanes.forEach((lane, idx) => {
    if (laneMatchesManeuver(lane.direction, immediateTargetType) || 
        (lane.secondary && laneMatchesManeuver(lane.secondary, immediateTargetType))) {
      candidateIndices.push(idx);
    }
  });

  // If no exact match found, allow all lanes as permitted fallback
  const validCandidates = candidateIndices.length > 0 ? candidateIndices : parsedLanes.map((_, i) => i);

  // Determine the BEST lane index based on subsequent maneuver
  let optimalLaneIndex = validCandidates[0]; // default to first match

  let guidanceText = immediate.instruction;
  let subText = `In ${Math.round(immediate.distanceToManeuverMeters)}m`;

  if (hasLookahead && upcoming && validCandidates.length > 1) {
    // If upcoming turn is RIGHT, we prefer the rightmost valid candidate
    if (upcoming.type === 'right' || upcoming.type === 'slight_right' || upcoming.type === 'sharp_right') {
      optimalLaneIndex = validCandidates[validCandidates.length - 1];
      subText = `Then in ${Math.round(distanceBetweenTurns)}m: Turn Right. Keep in rightmost turn lane.`;
    } 
    // If upcoming turn is LEFT, we prefer the leftmost valid candidate
    else if (upcoming.type === 'left' || upcoming.type === 'slight_left' || upcoming.type === 'sharp_left') {
      optimalLaneIndex = validCandidates[0];
      subText = `Then in ${Math.round(distanceBetweenTurns)}m: Turn Left. Keep in leftmost turn lane.`;
    }
    // If upcoming is through, take middle or rightmost
    else {
      optimalLaneIndex = validCandidates[Math.floor(validCandidates.length / 2)];
      subText = `Then continue onto ${upcoming.streetName}`;
    }
  } else if (upcoming && hasLookahead) {
    subText = `Then in ${Math.round(distanceBetweenTurns)}m: ${upcoming.instruction}`;
  }

  // Build complete LaneDescriptor list
  const lanes: LaneDescriptor[] = parsedLanes.map((lane, idx) => {
    const isRecommended = idx === optimalLaneIndex;
    const isPermitted = validCandidates.includes(idx);

    let desc = `${capitalize(lane.direction)}`;
    if (lane.secondary) desc += ` / ${capitalize(lane.secondary)}`;
    if (isRecommended) desc += ' (Best Lane)';

    return {
      index: idx,
      direction: lane.direction,
      secondaryDirection: lane.secondary,
      isRecommended,
      isPermitted,
      description: desc
    };
  });

  return {
    immediateManeuver: immediate,
    upcomingManeuver: upcoming,
    distanceBetweenTurnsMeters: distanceBetweenTurns,
    isLookaheadActive: hasLookahead,
    lanes,
    guidanceText,
    subText
  };
}

function laneMatchesManeuver(laneDir: TurnDirection, maneuverDir: string): boolean {
  if (laneDir === maneuverDir) return true;
  if ((laneDir === 'left' || laneDir === 'slight_left') && (maneuverDir === 'left' || maneuverDir === 'slight_left')) return true;
  if ((laneDir === 'right' || laneDir === 'slight_right') && (maneuverDir === 'right' || maneuverDir === 'slight_right')) return true;
  return false;
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
