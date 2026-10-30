import React, { useState, useEffect, useMemo, useRef } from 'react';
import { gpsService, type GpsPositionData } from './services/gpsService';
import { getRealDrivingRoute, type RouteResult } from './services/routingService';
import { evaluateMultiStepLanes } from './spatial/laneEngine';
import { evaluateRightOfWay, type IntersectingRoad } from './spatial/rightOfWay';
import { soundManager } from './spatial/soundEffects';
import { wakeLockManager } from './services/wakeLock';
import { MapViewer } from './components/Map/MapViewer';
import { CockpitHeader } from './components/HUD/CockpitHeader';
import { LaneGuidanceBar } from './components/HUD/LaneGuidanceBar';
import { RightOfWayAlert } from './components/HUD/RightOfWayAlert';
import { SpeedometerSign } from './components/HUD/SpeedometerSign';
import { AppleMapsBottomBar } from './components/HUD/AppleMapsBottomBar';
import { AppleMapsBottomSheet } from './components/HUD/AppleMapsBottomSheet';
import { AppleFloatingControls } from './components/Map/AppleFloatingControls';
import { PlaceDetailSheet } from './components/HUD/PlaceDetailSheet';
import { RoutePreviewSheet, type RoutePreference } from './components/HUD/RoutePreviewSheet';
import { TimelineSheet } from './components/Timeline/TimelineSheet';
import { favoritesStorage } from './services/favoritesStorage';
import type { FavoriteLocation, LocationCategoryType, InspectedPlace } from './types/favorites';
import type { SpeedZoneInfo, Maneuver } from './types/navigation';
import { RocketIcon, Cross2Icon, CheckCircledIcon, MobileIcon } from '@radix-ui/react-icons';
import './App.css';

export const App: React.FC = () => {
  // Real Hardware GPS State
  const [userPosition, setUserPosition] = useState<[number, number]>([7.6261, 51.9607]);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [userSpeedKmh, setUserSpeedKmh] = useState<number>(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(5);
  const [is3dView, setIs3dView] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [hasWakeLock, setHasWakeLock] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Active Navigation & Route Preview State
  const [selectedPlace, setSelectedPlace] = useState<InspectedPlace | null>(null);
  const [routePreviewActive, setRoutePreviewActive] = useState<boolean>(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routePreference, setRoutePreference] = useState<RoutePreference>('fastest');

  const [activeDestination, setActiveDestination] = useState<{
    coordinate: [number, number];
    name: string;
  } | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [destinationNotification, setDestinationNotification] = useState<string | null>(null);

  // 3D Driving Cockpit & Overview Camera States
  const [isRouteOverviewMode, setIsRouteOverviewMode] = useState<boolean>(false);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState<boolean>(false);
  const simStepRef = useRef<number>(0);

  // Camera & Map Triggers
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [resetNorthTrigger, setResetNorthTrigger] = useState<number>(0);
  const [fitRouteBoundsTrigger, setFitRouteBoundsTrigger] = useState<number>(0);

  // Favorites & Search State
  const [favorites, setFavorites] = useState<FavoriteLocation[]>(() => favoritesStorage.getFavorites());

  // Location History & Timeline State
  const [showTimelineSheet, setShowTimelineSheet] = useState<boolean>(false);
  const [timelineInspectPath, setTimelineInspectPath] = useState<Array<[number, number]> | undefined>(undefined);

  // Reference to track user position for calculations without stale closures
  const userPosRef = useRef(userPosition);
  userPosRef.current = userPosition;

  // 1. Initialize Real GPS Tracking & Screen Wake Lock on Mount
  useEffect(() => {
    wakeLockManager.requestLock().then((locked) => setHasWakeLock(locked));

    const success = gpsService.startTracking(
      (data: GpsPositionData) => {
        setUserPosition(data.coordinate);
        setUserHeading(data.heading);
        setUserSpeedKmh(data.speedKmh);
        setGpsAccuracy(data.accuracy);
      },
      (error) => {
        console.warn('Real GPS acquisition warning:', error.message);
      }
    );

    if (!success) {
      console.warn('Geolocation not supported on browser');
    }

    return () => {
      gpsService.stopTracking();
      wakeLockManager.releaseLock();
    };
  }, []);

  // 2. Request Directions & Calculate Route Preview for any place
  const handleRequestDirections = async (place: InspectedPlace) => {
    setRoutePreviewActive(true);
    setIsLoadingRoute(true);
    setDestinationNotification(`Planning route to ${place.name}...`);

    try {
      const route = await getRealDrivingRoute(userPosRef.current, place.coordinate);
      setRouteResult(route);
      setFitRouteBoundsTrigger((prev) => prev + 1);
      soundManager.playClickSound();
    } catch (err) {
      console.error('Failed to calculate preview route:', err);
      setDestinationNotification('Could not calculate driving route.');
    } finally {
      setIsLoadingRoute(false);
      setTimeout(() => setDestinationNotification(null), 3000);
    }
  };

  // 3. Start Turn-by-Turn Navigation from Route Preview
  const handleStartNavigationFromPreview = () => {
    if (!selectedPlace) return;
    setActiveDestination({
      coordinate: selectedPlace.coordinate,
      name: selectedPlace.name
    });
    setRoutePreviewActive(false);
    setIsRouteOverviewMode(false);
    simStepRef.current = 0;
    soundManager.playLaneGuidanceChime();
    setDestinationNotification(`Navigating to ${selectedPlace.name}`);
    setTimeout(() => setDestinationNotification(null), 3500);
  };

  // Driving Simulation Engine along active Route for interactive demonstration
  useEffect(() => {
    if (!isSimulatingDrive || !routeResult || routeResult.coordinates.length < 2) {
      return;
    }

    const coords = routeResult.coordinates;
    const interval = setInterval(() => {
      simStepRef.current += 1;
      const curIdx = simStepRef.current;

      if (curIdx >= coords.length - 1) {
        setIsSimulatingDrive(false);
        setUserSpeedKmh(0);
        soundManager.playLaneGuidanceChime();
        setDestinationNotification('You have reached your destination!');
        setTimeout(() => setDestinationNotification(null), 4000);
        clearInterval(interval);
        return;
      }

      const currentCoord = coords[curIdx];
      const nextCoord = coords[curIdx + 1];

      // Compute heading to next coordinate
      const lat1 = (currentCoord[1] * Math.PI) / 180;
      const lat2 = (nextCoord[1] * Math.PI) / 180;
      const dLng = ((nextCoord[0] - currentCoord[0]) * Math.PI) / 180;
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      const brng = (Math.atan2(y, x) * 180) / Math.PI;
      const headingDeg = (brng + 360) % 360;

      setUserPosition(currentCoord);
      setUserHeading(headingDeg);
      setUserSpeedKmh(38); // European city speed 38 km/h

      // Advance maneuver steps as vehicle passes step waypoints
      if (routeResult.steps && routeResult.steps.length > 0) {
        for (let s = 0; s < routeResult.steps.length; s++) {
          const stepCoord = routeResult.steps[s].location;
          const dist = Math.hypot(
            (stepCoord[0] - currentCoord[0]) * 111320 * Math.cos((currentCoord[1] * Math.PI) / 180),
            (stepCoord[1] - currentCoord[1]) * 110540
          );
          if (dist < 25) {
            setCurrentStepIndex(Math.min(routeResult.steps.length - 1, s + 1));
          }
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isSimulatingDrive, routeResult]);

  // 4. Cancel Route Preview
  const handleCancelRoutePreview = () => {
    setRoutePreviewActive(false);
    setRouteResult(null);
    soundManager.playClickSound();
  };

  // 5. Current & Upcoming Maneuvers
  const activeStep: Maneuver | undefined = routeResult?.steps[currentStepIndex];
  const nextStep: Maneuver | undefined = routeResult?.steps[currentStepIndex + 1];

  // 6. Dynamic Speed Limit & Zone Estimation based on speed & road type
  const currentSpeedZone: SpeedZoneInfo = useMemo(() => {
    if (userSpeedKmh > 95) {
      return {
        currentLimit: 'none',
        isAutobahn: true,
        roadType: 'motorway'
      };
    } else if (userSpeedKmh > 55) {
      return {
        currentLimit: 100,
        isAutobahn: false,
        roadType: 'primary'
      };
    } else if (userSpeedKmh > 32) {
      return {
        currentLimit: 50,
        isAutobahn: false,
        roadType: 'primary'
      };
    }
    return {
      currentLimit: 30,
      isAutobahn: false,
      roadType: 'residential'
    };
  }, [userSpeedKmh]);

  // 7. Intelligent Multi-Step Lane Guidance
  const lookaheadGuidance = useMemo(() => {
    if (!activeStep) {
      return { lanes: [], isLookaheadActive: false, subText: '' };
    }
    return evaluateMultiStepLanes(
      activeStep,
      nextStep,
      currentSpeedZone.isAutobahn
    );
  }, [activeStep, nextStep, currentSpeedZone.isAutobahn]);

  // 8. Right-of-Way (Rechts vor Links) StVO § 8 Detection in Residential 30-Zones
  const incomingRoad: IntersectingRoad | undefined = useMemo(() => {
    if (currentSpeedZone.currentLimit !== 30) return undefined;
    return {
      id: 'incoming-junction-1',
      name: 'Querstraße',
      location: [userPosition[0] + 0.0003, userPosition[1] + 0.00015],
      bearingFromVehicleRoute: 80,
      hasTrafficLight: false,
      hasPrioritySign: false,
      isRightHandEntry: true
    };
  }, [currentSpeedZone.currentLimit, userPosition]);

  const rightOfWayAlert = useMemo(() => {
    return evaluateRightOfWay(
      userPosition,
      userSpeedKmh,
      currentSpeedZone.roadType,
      incomingRoad
    );
  }, [userPosition, userSpeedKmh, currentSpeedZone.roadType, incomingRoad]);

  // 9. Calculate ETA & Remaining Distance for Active Route
  const { etaTime, remainingMinutes, remainingKm } = useMemo(() => {
    if (!routeResult) {
      return { etaTime: '--:--', remainingMinutes: 0, remainingKm: 0 };
    }

    const remainingMeters = routeResult.distanceMeters;
    const estKm = Math.max(0.1, remainingMeters / 1000);
    const estMinutes = Math.max(1, Math.round(routeResult.durationSeconds / 60));

    const now = new Date();
    now.setMinutes(now.getMinutes() + estMinutes);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');

    return {
      etaTime: `${hours}:${mins}`,
      remainingMinutes: estMinutes,
      remainingKm: estKm
    };
  }, [routeResult]);

  // Handler: Add Favorite Location
  const handleAddFavorite = (
    name: string,
    address: string,
    coordinate: [number, number],
    category?: LocationCategoryType,
    emoji?: string
  ) => {
    favoritesStorage.addFavorite(name, address, coordinate, category, emoji);
    setFavorites(favoritesStorage.getFavorites());
    soundManager.playClickSound();
  };

  // Handler: Remove Favorite Location
  const handleRemoveFavorite = (id: string) => {
    const updated = favoritesStorage.removeFavorite(id);
    setFavorites(updated);
    if (selectedPlace?.id === id) {
      setSelectedPlace(null);
    }
  };

  // Handler: Toggle Favorite for any inspected place or shop
  const handleToggleFavoritePlace = (place: InspectedPlace) => {
    const isFav = favoritesStorage.isFavorite(place.name, place.coordinate);
    if (isFav) {
      const existing = favorites.find(
        (f) =>
          f.name.toLowerCase() === place.name.toLowerCase() ||
          (Math.abs(f.coordinate[0] - place.coordinate[0]) < 0.0001 &&
            Math.abs(f.coordinate[1] - place.coordinate[1]) < 0.0001)
      );
      if (existing) {
        handleRemoveFavorite(existing.id);
      }
    } else {
      handleAddFavorite(place.name, place.address, place.coordinate, place.category);
    }
  };

  // Handler: End Navigation Route
  const handleEndRoute = () => {
    setIsSimulatingDrive(false);
    setIsRouteOverviewMode(false);
    simStepRef.current = 0;
    setUserSpeedKmh(0);
    setActiveDestination(null);
    setRouteResult(null);
    setCurrentStepIndex(0);
    setSelectedPlace(null);
    setRoutePreviewActive(false);
    soundManager.playClickSound();
    setDestinationNotification('Navigation ended');
    setTimeout(() => setDestinationNotification(null), 2500);
  };

  // Handler: Audio Toggle
  const handleToggleAudio = () => {
    const nextState = !isAudioEnabled;
    setIsAudioEnabled(nextState);
    soundManager.setEnabled(nextState);
  };

  const isNavigating = !!activeDestination && !!routeResult;

  return (
    <div className="cockpit-app-root">
      {/* Map Viewport (Tracks Real GPS Hardware Position) */}
      <MapViewer
        currentPosition={userPosition}
        heading={userHeading}
        routeCoordinates={routeResult ? routeResult.coordinates : []}
        currentStepIndex={currentStepIndex}
        steps={routeResult ? routeResult.steps : []}
        upcomingIncomingRoad={incomingRoad}
        is3dView={is3dView}
        favorites={favorites}
        selectedPlace={selectedPlace}
        onInspectPlace={(place) => {
          setSelectedPlace(place);
          setRoutePreviewActive(false);
        }}
        timelinePath={timelineInspectPath}
        recenterTrigger={recenterTrigger}
        resetNorthTrigger={resetNorthTrigger}
        fitRouteBoundsTrigger={fitRouteBoundsTrigger}
        isNavigating={isNavigating}
        isRouteOverviewMode={isRouteOverviewMode}
      />

      {/* Floating Controls (Compass, 3D Toggle, Re-center GPS, Route Overview) */}
      <AppleFloatingControls
        onRecenter={() => setRecenterTrigger((prev) => prev + 1)}
        onToggle3D={() => setIs3dView(!is3dView)}
        is3dView={is3dView}
        onResetNorth={() => setResetNorthTrigger((prev) => prev + 1)}
        heading={userHeading}
        isNavigating={isNavigating}
        isRouteOverviewMode={isRouteOverviewMode}
        onToggleRouteOverview={() => setIsRouteOverviewMode(!isRouteOverviewMode)}
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={handleToggleAudio}
      />

      {/* Mode 1: Browsing Sheet (When no place is selected and not navigating) */}
      {!isNavigating && !selectedPlace && (
        <AppleMapsBottomSheet
          favorites={favorites}
          onSelectPlace={(place) => {
            setSelectedPlace(place);
            setRoutePreviewActive(false);
          }}
          onOpenTimeline={() => setShowTimelineSheet(true)}
          currentVehiclePosition={userPosition}
          isPlaceSelected={false}
        />
      )}

      {/* Mode 2: Place Inspector Card (When place is selected and preview not yet opened) */}
      {!isNavigating && selectedPlace && !routePreviewActive && (
        <PlaceDetailSheet
          place={selectedPlace}
          onClose={() => {
            setSelectedPlace(null);
            setRoutePreviewActive(false);
          }}
          onDirections={handleRequestDirections}
          onToggleFavorite={handleToggleFavoritePlace}
          isFavorite={
            !!selectedPlace &&
            favoritesStorage.isFavorite(selectedPlace.name, selectedPlace.coordinate)
          }
          userPosition={userPosition}
        />
      )}

      {/* Mode 3: Route Planning & Preview Sheet (Before starting active driving) */}
      {!isNavigating && selectedPlace && routePreviewActive && (
        <RoutePreviewSheet
          destination={selectedPlace}
          userPosition={userPosition}
          routeResult={routeResult}
          isLoading={isLoadingRoute}
          preference={routePreference}
          onChangePreference={setRoutePreference}
          onStartNavigation={handleStartNavigationFromPreview}
          onCancel={handleCancelRoutePreview}
        />
      )}

      {/* Mode 4: Active Driving Turn-by-Turn Navigation HUD */}
      {isNavigating && (
        <React.Fragment>
          {/* Top Maneuver Banner */}
          <div className="top-cockpit-overlay">
            {activeStep && (
              <CockpitHeader
                currentManeuver={activeStep}
                upcomingManeuver={nextStep}
                isLookaheadActive={lookaheadGuidance.isLookaheadActive}
              />
            )}
            {lookaheadGuidance.lanes.length > 1 && (
              <LaneGuidanceBar
                lanes={lookaheadGuidance.lanes}
                isLookaheadActive={lookaheadGuidance.isLookaheadActive}
                subText={lookaheadGuidance.subText}
              />
            )}
          </div>

          {/* Predictive Right-of-Way Alert */}
          <div className="center-alert-overlay">
            <RightOfWayAlert alert={rightOfWayAlert} audioEnabled={isAudioEnabled} />
          </div>

          {/* Real-time Hardware Speedometer & Speed Sign */}
          <div className="bottom-speed-overlay">
            <SpeedometerSign
              currentSpeedKmh={userSpeedKmh}
              speedZone={currentSpeedZone}
            />
          </div>

          {/* Active Navigation Bottom Bar */}
          <AppleMapsBottomBar
            hasActiveRoute={true}
            etaTime={etaTime}
            remainingMinutes={remainingMinutes}
            remainingKm={remainingKm}
            destinationName={activeDestination?.name}
            onEndRoute={handleEndRoute}
            hasWakeLock={hasWakeLock}
            gpsAccuracy={gpsAccuracy}
            isSimulating={isSimulatingDrive}
            onToggleSimulate={() => setIsSimulatingDrive(!isSimulatingDrive)}
          />
        </React.Fragment>
      )}

      {/* Destination Feedback Toast */}
      {destinationNotification && (
        <div className="destination-toast-banner">
          <RocketIcon width={18} height={18} className="toast-nav-icon" color="#ffffff" />
          <span>{destinationNotification}</span>
        </div>
      )}

      {/* Location History & Timeline Sheet */}
      <TimelineSheet
        isOpen={showTimelineSheet}
        onClose={() => setShowTimelineSheet(false)}
        onShowTripOnMap={(path) => {
          setTimelineInspectPath(path);
          soundManager.playLaneGuidanceChime();
          setDestinationNotification('Viewing recorded trip path on map');
          setTimeout(() => setDestinationNotification(null), 3500);
        }}
        onShowStopOnMap={(coord, name) => {
          setUserPosition(coord);
          soundManager.playLaneGuidanceChime();
          setDestinationNotification(`Viewing visited place: ${name}`);
          setTimeout(() => setDestinationNotification(null), 3500);
        }}
      />

      {/* Car Setup & GPS Guide Modal */}
      {showGuideModal && (
        <div className="modal-backdrop" onClick={() => setShowGuideModal(false)}>
          <div className="guide-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <MobileIcon className="modal-icon" width={24} height={24} />
                <h3>Navigation & GPS Setup</h3>
              </div>
              <button className="close-btn" onClick={() => setShowGuideModal(false)}>
                <Cross2Icon width={20} height={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="guide-section">
                <h4>100% Real Live GPS & Routing</h4>
                <p>
                  Directly connected to your device's hardware GPS chip, calculating real speed, real heading, and live OSRM turn-by-turn routing with German StVO § 8 lane safety monitoring.
                </p>
              </div>

              <div className="guide-section feature-checks">
                <div className="check-item">
                  <CheckCircledIcon width={16} height={16} color="#10b981" />
                  <span>Real Device Hardware GPS</span>
                </div>
                <div className="check-item">
                  <CheckCircledIcon width={16} height={16} color="#10b981" />
                  <span>OSRM Driving Turn-by-Turn Engine</span>
                </div>
                <div className="check-item">
                  <CheckCircledIcon width={16} height={16} color="#10b981" />
                  <span>Rechts vor Links StVO § 8 Monitoring</span>
                </div>
                <div className="check-item">
                  <CheckCircledIcon width={16} height={16} color="#10b981" />
                  <span>100% Free, Private & On-Device</span>
                </div>
              </div>
            </div>

            <button className="modal-action-btn" onClick={() => setShowGuideModal(false)}>
              Back to Maps
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
