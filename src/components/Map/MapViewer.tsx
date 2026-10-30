import React, { useEffect, useRef } from 'react';
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  LngLatBounds,
  type GeoJSONSource,
  type PointLike,
  type MapLayerMouseEvent
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FavoriteLocation, InspectedPlace } from '../../types/favorites';
import type { Maneuver } from '../../types/navigation';
import type { IntersectingRoad } from '../../spatial/rightOfWay';
import { CATEGORY_DEFINITIONS } from '../../services/favoriteCategory';
import { reverseGeocodeCoordinate } from '../../services/reverseGeocode';
import { getNearbyPois } from '../../services/samplePois';
import { getCategorySvgString } from '../Common/CategoryIcon';
import { TargetIcon } from '@radix-ui/react-icons';
import { soundManager } from '../../spatial/soundEffects';

/**
 * Computes the forward road bearing along the active route ahead of the vehicle
 * Ensures heading-up 3D navigation alignment even before moving or when stationary at signals.
 */
const computeForwardRouteBearing = (
  currentPos: [number, number],
  routeCoords: Array<[number, number]>,
  minLookaheadMeters: number = 25
): number => {
  if (!routeCoords || routeCoords.length < 2) return 0;

  let closestIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < routeCoords.length; i++) {
    const dLng = (routeCoords[i][0] - currentPos[0]) * 111320 * Math.cos((currentPos[1] * Math.PI) / 180);
    const dLat = (routeCoords[i][1] - currentPos[1]) * 110540;
    const d = Math.hypot(dLng, dLat);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }

  let targetIdx = Math.min(routeCoords.length - 1, closestIdx + 1);
  let accumulatedDist = 0;
  for (let i = closestIdx; i < routeCoords.length - 1; i++) {
    const dLng = (routeCoords[i + 1][0] - routeCoords[i][0]) * 111320 * Math.cos((routeCoords[i][1] * Math.PI) / 180);
    const dLat = (routeCoords[i + 1][1] - routeCoords[i][1]) * 110540;
    accumulatedDist += Math.hypot(dLng, dLat);
    if (accumulatedDist >= minLookaheadMeters) {
      targetIdx = i + 1;
      break;
    }
  }

  const targetCoord = routeCoords[targetIdx];
  const lat1 = (currentPos[1] * Math.PI) / 180;
  const lat2 = (targetCoord[1] * Math.PI) / 180;
  const dLng = ((targetCoord[0] - currentPos[0]) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

// Turn-by-Turn driving camera parameters (zoomed in closely to track lanes and maneuvers)
const DRIVING_ZOOM_LEVEL = 18.7;
const DRIVING_3D_PITCH = 62;

// Clean, watermarked-free Humanitarian OpenStreetMap (HOT) raster base style
const APPLE_MAPS_STYLE: any = {
  version: 8,
  name: 'AppleMapsClean',
  sources: {
    'clean-map-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>',
      maxzoom: 19
    }
  },
  layers: [
    {
      id: 'clean-map-tiles-layer',
      type: 'raster',
      source: 'clean-map-tiles',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

// Safe WebGL route layers installer (runs after style is confirmed loaded)
const setupRouteLayers = (map: MapLibreMap) => {
  try {
    if (!map.isStyleLoaded()) return;

    if (!map.getSource('route-line')) {
      map.addSource('route-line', {
        type: 'geojson',
        lineMetrics: true,
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
    }

    // 1. Soft radiant ambient glow
    if (!map.getLayer('route-glow')) {
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#007aff',
          'line-width': 22,
          'line-opacity': 0.38,
          'line-blur': 4
        }
      });
    }

    // 2. High-contrast dark navy outer casing
    if (!map.getLayer('route-casing')) {
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#003a8c',
          'line-width': 13,
          'line-opacity': 0.98
        }
      });
    }

    // 3. Apple electric blue solid core
    if (!map.getLayer('route-core')) {
      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#007aff',
          'line-width': 8
        }
      });
    }

    // 4. White center guidance stripe
    if (!map.getLayer('route-center-highlight')) {
      map.addLayer({
        id: 'route-center-highlight',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.6,
          'line-opacity': 0.92
        }
      });
    }

    // StVO § 8 Danger node layer
    if (!map.getSource('danger-nodes')) {
      map.addSource('danger-nodes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    if (!map.getLayer('danger-nodes-layer')) {
      map.addLayer({
        id: 'danger-nodes-layer',
        type: 'circle',
        source: 'danger-nodes',
        paint: {
          'circle-radius': 14,
          'circle-color': '#f59e0b',
          'circle-opacity': 0.5,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fbbf24'
        }
      });
    }
  } catch (err) {
    console.warn('setupRouteLayers error:', err);
  }
};

export interface MapViewerProps {
  currentPosition: [number, number];
  heading: number;
  routeCoordinates: Array<[number, number]>;
  currentStepIndex?: number;
  steps?: Maneuver[];
  upcomingIncomingRoad?: IntersectingRoad;
  is3dView?: boolean;
  favorites?: FavoriteLocation[];
  onSelectFavorite?: (fav: FavoriteLocation) => void;
  timelinePath?: Array<[number, number]>;
  selectedPlace?: InspectedPlace | null;
  onInspectPlace?: (place: InspectedPlace) => void;
  recenterTrigger?: number;
  resetNorthTrigger?: number;
  fitRouteBoundsTrigger?: number;
  isNavigating?: boolean;
  isRouteOverviewMode?: boolean;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  currentPosition,
  heading,
  routeCoordinates,
  upcomingIncomingRoad,
  is3dView = true,
  favorites = [],
  onSelectFavorite,
  timelinePath,
  selectedPlace,
  onInspectPlace,
  recenterTrigger,
  resetNorthTrigger,
  fitRouteBoundsTrigger,
  isNavigating = false,
  isRouteOverviewMode = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const vehicleMarkerRef = useRef<MapLibreMarker | null>(null);
  const favoriteMarkersRef = useRef<MapLibreMarker[]>([]);
  const poiMarkersRef = useRef<MapLibreMarker[]>([]);
  const originMarkerRef = useRef<MapLibreMarker | null>(null);
  const destMarkerRef = useRef<MapLibreMarker | null>(null);
  const selectedPlaceMarkerRef = useRef<MapLibreMarker | null>(null);

  // Turn-by-Turn Driving Follow State
  const [isFollowingDriver, setIsFollowingDriver] = React.useState<boolean>(true);
  const isNavigatingRef = useRef(isNavigating);
  isNavigatingRef.current = isNavigating;
  const isFollowingRef = useRef(isFollowingDriver);
  isFollowingRef.current = isFollowingDriver;

  // SVG Overlay elements for 100% guaranteed, rock-solid route line projection
  const svgOverlayRef = useRef<SVGSVGElement | null>(null);
  const svgPathGlowRef = useRef<SVGPathElement | null>(null);
  const svgPathCasingRef = useRef<SVGPathElement | null>(null);
  const svgPathCoreRef = useRef<SVGPathElement | null>(null);
  const svgPathStripeRef = useRef<SVGPathElement | null>(null);

  // Active path tracking ref
  const activeRoutePathRef = useRef<Array<[number, number]>>([]);

  const routeCoordsRef = useRef(routeCoordinates);
  routeCoordsRef.current = routeCoordinates;

  const onInspectPlaceRef = useRef(onInspectPlace);
  onInspectPlaceRef.current = onInspectPlace;

  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  // Real-time projection of route line coordinates to screen pixels
  const syncSvgRouteOverlay = () => {
    const map = mapRef.current;
    const path = activeRoutePathRef.current;

    if (!map || !path || path.length < 2) {
      if (svgPathCoreRef.current?.getAttribute('d')) {
        svgPathGlowRef.current?.setAttribute('d', '');
        svgPathCasingRef.current?.setAttribute('d', '');
        svgPathCoreRef.current?.setAttribute('d', '');
        svgPathStripeRef.current?.setAttribute('d', '');
      }
      return;
    }

    try {
      const len = path.length;
      let d = '';
      for (let i = 0; i < len; i++) {
        const pt = map.project(path[i]);
        d += (i === 0 ? 'M ' : ' L ') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
      }

      svgPathGlowRef.current?.setAttribute('d', d);
      svgPathCasingRef.current?.setAttribute('d', d);
      svgPathCoreRef.current?.setAttribute('d', d);
      svgPathStripeRef.current?.setAttribute('d', d);
    } catch {
      // Graceful fallback during rapid unmount / bounds shifts
    }
  };

  // Safe WebGL GeoJSON source update
  const syncWebGLRoute = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    setupRouteLayers(map);

    try {
      const source = map.getSource('route-line') as GeoJSONSource | undefined;
      if (source) {
        const path = activeRoutePathRef.current;
        const hasPath = path && path.length >= 2;
        source.setData({
          type: 'FeatureCollection',
          features: hasPath
            ? [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: path
                  }
                }
              ]
            : []
        });
        map.triggerRepaint();
      }
    } catch (err) {
      console.warn('syncWebGLRoute error:', err);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: APPLE_MAPS_STYLE,
      center: currentPosition,
      zoom: 16.5,
      maxZoom: 20,
      pitch: is3dView ? 52 : 0,
      bearing: heading,
      attributionControl: false
    });

    map.on('error', (e) => {
      console.warn('MapLibre GL warning:', e);
    });

    // Create high-precision SVG route overlay directly inside canvas container
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'maplibre-route-svg-overlay');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '5';
    svg.style.overflow = 'visible';

    const pathGlow = document.createElementNS(NS, 'path');
    pathGlow.setAttribute('fill', 'none');
    pathGlow.setAttribute('stroke', 'rgba(0, 122, 255, 0.42)');
    pathGlow.setAttribute('stroke-width', '24');
    pathGlow.setAttribute('stroke-linecap', 'round');
    pathGlow.setAttribute('stroke-linejoin', 'round');

    const pathCasing = document.createElementNS(NS, 'path');
    pathCasing.setAttribute('fill', 'none');
    pathCasing.setAttribute('stroke', '#003a8c');
    pathCasing.setAttribute('stroke-width', '14');
    pathCasing.setAttribute('stroke-linecap', 'round');
    pathCasing.setAttribute('stroke-linejoin', 'round');

    const pathCore = document.createElementNS(NS, 'path');
    pathCore.setAttribute('fill', 'none');
    pathCore.setAttribute('stroke', '#007aff');
    pathCore.setAttribute('stroke-width', '8.5');
    pathCore.setAttribute('stroke-linecap', 'round');
    pathCore.setAttribute('stroke-linejoin', 'round');

    const pathStripe = document.createElementNS(NS, 'path');
    pathStripe.setAttribute('fill', 'none');
    pathStripe.setAttribute('stroke', '#ffffff');
    pathStripe.setAttribute('stroke-width', '2.6');
    pathStripe.setAttribute('stroke-linecap', 'round');
    pathStripe.setAttribute('stroke-linejoin', 'round');
    pathStripe.setAttribute('stroke-opacity', '0.95');

    svg.appendChild(pathGlow);
    svg.appendChild(pathCasing);
    svg.appendChild(pathCore);
    svg.appendChild(pathStripe);

    map.getCanvasContainer().appendChild(svg);

    svgOverlayRef.current = svg;
    svgPathGlowRef.current = pathGlow;
    svgPathCasingRef.current = pathCasing;
    svgPathCoreRef.current = pathCore;
    svgPathStripeRef.current = pathStripe;

    // Synchronize SVG overlay with camera changes at 60fps
    map.on('render', syncSvgRouteOverlay);
    map.on('move', syncSvgRouteOverlay);
    map.on('zoom', syncSvgRouteOverlay);
    map.on('pitch', syncSvgRouteOverlay);
    map.on('rotate', syncSvgRouteOverlay);
    map.on('resize', syncSvgRouteOverlay);

    // Detect user manual panning to pause auto-following and reveal Re-center button
    const handleUserMapInteraction = () => {
      if (isNavigatingRef.current) {
        setIsFollowingDriver(false);
      }
    };
    map.on('dragstart', handleUserMapInteraction);
    map.on('touchstart', handleUserMapInteraction);
    map.on('rotatestart', handleUserMapInteraction);
    map.on('pitchstart', handleUserMapInteraction);

    // Setup WebGL route layers when style is ready
    const handleStyleReady = () => {
      setupRouteLayers(map);
      syncWebGLRoute();
    };

    map.on('style.load', handleStyleReady);
    map.on('load', handleStyleReady);

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      syncSvgRouteOverlay();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }
    const handleResize = () => {
      map.resize();
      syncSvgRouteOverlay();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Create iOS User Location Marker (Blue Dot with Vision Cone)
    const vehicleEl = document.createElement('div');
    vehicleEl.className = 'ios-user-marker';
    vehicleEl.innerHTML = `
      <div class="ios-user-vision-cone"></div>
      <div class="ios-user-pulse-halo"></div>
      <div class="ios-user-core-dot"></div>
    `;

    const vehicleMarker = new MapLibreMarker({
      element: vehicleEl,
      rotationAlignment: 'map'
    })
      .setLngLat(currentPosition)
      .addTo(map);

    vehicleMarkerRef.current = vehicleMarker;

    // Map Click Inspector
    map.on('click', async (e: MapLayerMouseEvent) => {
      const clickedLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const curFavs = favoritesRef.current || [];

      // Check if clicking near existing favorite
      const hitFav = curFavs.find((fav) => {
        const dLng =
          (fav.coordinate[0] - clickedLngLat[0]) *
          111320 *
          Math.cos((clickedLngLat[1] * Math.PI) / 180);
        const dLat = (fav.coordinate[1] - clickedLngLat[1]) * 110540;
        return Math.hypot(dLng, dLat) < 30;
      });

      if (hitFav) {
        onInspectPlaceRef.current?.({
          id: hitFav.id,
          name: hitFav.name,
          address: hitFav.address,
          coordinate: hitFav.coordinate,
          category: hitFav.category,
          categoryLabel: CATEGORY_DEFINITIONS[hitFav.category]?.label || 'Place',
          isFavorite: true
        });
        return;
      }

      // Check rendered map feature titles
      const bbox: [PointLike, PointLike] = [
        [e.point.x - 14, e.point.y - 14],
        [e.point.x + 14, e.point.y + 14]
      ];

      let featName = '';
      let featClass = '';

      try {
        const feats = map.queryRenderedFeatures(bbox);
        for (const feat of feats) {
          if (feat.properties && (feat.properties.name || feat.properties['name:en'])) {
            featName = feat.properties['name:en'] || feat.properties.name;
            featClass =
              feat.properties.class ||
              feat.properties.subclass ||
              feat.properties.category ||
              '';
            break;
          }
        }
      } catch {
        // Query features can fail gracefully on unready tiles
      }

      const geocodeRes = await reverseGeocodeCoordinate(clickedLngLat);
      const finalName = featName || geocodeRes.name;
      const isFav = curFavs.some((f) => f.name.toLowerCase() === finalName.toLowerCase());

      onInspectPlaceRef.current?.({
        id: `place-${Date.now()}`,
        name: finalName,
        address: geocodeRes.address,
        coordinate: clickedLngLat,
        category: geocodeRes.category,
        categoryLabel: geocodeRes.categoryLabel,
        amenityType: featClass || geocodeRes.amenityType,
        isFavorite: isFav
      });
    });

    mapRef.current = map;

    return () => {
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      if (svg.parentNode) {
        svg.parentNode.removeChild(svg);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      map.remove();
    };
  }, []);

  // Update Route / Timeline Path (dual-render: SVG overlay + WebGL + pins + camera)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const path = timelinePath && timelinePath.length > 0 ? timelinePath : routeCoordinates;
    activeRoutePathRef.current = path || [];

    // 1. Instantly update real-time SVG ribbon overlay
    syncSvgRouteOverlay();

    // 2. Safely update WebGL GeoJSON source
    if (map.isStyleLoaded()) {
      syncWebGLRoute();
    } else {
      map.once('style.load', syncWebGLRoute);
    }

    const hasPath = path && path.length >= 2;

    if (hasPath && (!timelinePath || timelinePath.length === 0)) {
      // 3. Origin Marker (Green Pulse Ring & Emerald Dot)
      const originCoord = path[0];
      if (originMarkerRef.current) {
        originMarkerRef.current.setLngLat(originCoord);
      } else {
        const originEl = document.createElement('div');
        originEl.className = 'route-origin-map-pin';
        originEl.title = 'Start Location';
        originEl.innerHTML = `
          <div class="origin-pin-pulse"></div>
          <div class="origin-pin-dot"></div>
        `;
        originMarkerRef.current = new MapLibreMarker({
          element: originEl,
          anchor: 'center'
        })
          .setLngLat(originCoord)
          .addTo(map);
      }

      // 4. Destination Marker (Crimson Badge with White Checkered Flag)
      const destCoord = path[path.length - 1];
      if (destMarkerRef.current) {
        destMarkerRef.current.setLngLat(destCoord);
      } else {
        const destEl = document.createElement('div');
        destEl.className = 'route-dest-map-pin';
        destEl.title = 'Destination';
        destEl.innerHTML = `
          <div class="dest-pin-pulse"></div>
          <div class="dest-pin-badge">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
          </div>
          <div class="dest-pin-tail"></div>
        `;
        destMarkerRef.current = new MapLibreMarker({
          element: destEl,
          anchor: 'bottom'
        })
          .setLngLat(destCoord)
          .addTo(map);
      }

      // 5. Smooth camera framing (Only during route preview, NOT during active driving!)
      if (!isNavigatingRef.current) {
        try {
          const bounds = new LngLatBounds(path[0], path[0]);
          for (const coord of path) {
            bounds.extend(coord);
          }
          map.fitBounds(bounds, {
            padding: { top: 110, bottom: 260, left: 60, right: 60 },
            duration: 800,
            maxZoom: 16.5
          });
        } catch (err) {
          console.warn('fitBounds error:', err);
        }
      }
    } else {
      // Clean up route markers when no route is active
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    }

    if (timelinePath && timelinePath.length > 1) {
      try {
        const bounds = new LngLatBounds(timelinePath[0], timelinePath[0]);
        for (const coord of timelinePath) {
          bounds.extend(coord);
        }
        map.fitBounds(bounds, { padding: 90, duration: 800 });
      } catch (err) {
        console.warn('timeline fitBounds error:', err);
      }
    }
  }, [routeCoordinates, timelinePath]);

  // Transition into 3D Driving Cockpit View when navigation begins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isNavigating) {
      setIsFollowingDriver(true);
      const forwardBearing =
        heading > 0
          ? heading
          : computeForwardRouteBearing(currentPosition, routeCoordsRef.current);

      map.flyTo({
        center: currentPosition,
        zoom: DRIVING_ZOOM_LEVEL,
        pitch: is3dView ? DRIVING_3D_PITCH : 0,
        bearing: forwardBearing,
        padding: { top: 210, bottom: 90, left: 0, right: 0 },
        duration: 1100
      });
    }
  }, [isNavigating]);

  // Route Overview Mode Toggle during Navigation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isNavigating) return;

    if (isRouteOverviewMode && routeCoordsRef.current && routeCoordsRef.current.length >= 2) {
      try {
        const bounds = new LngLatBounds(routeCoordsRef.current[0], routeCoordsRef.current[0]);
        for (const coord of routeCoordsRef.current) {
          bounds.extend(coord);
        }
        map.fitBounds(bounds, {
          padding: { top: 210, bottom: 130, left: 50, right: 50 },
          duration: 800
        });
      } catch (err) {
        console.warn('Route overview error:', err);
      }
    } else if (!isRouteOverviewMode) {
      setIsFollowingDriver(true);
      const forwardBearing =
        heading > 0
          ? heading
          : computeForwardRouteBearing(currentPosition, routeCoordsRef.current);

      map.flyTo({
        center: currentPosition,
        zoom: DRIVING_ZOOM_LEVEL,
        pitch: is3dView ? DRIVING_3D_PITCH : 0,
        bearing: forwardBearing,
        padding: { top: 210, bottom: 90, left: 0, right: 0 },
        duration: 900
      });
    }
  }, [isRouteOverviewMode]);

  // Update Vehicle Marker Position & Follow Driving Camera
  useEffect(() => {
    const map = mapRef.current;
    const marker = vehicleMarkerRef.current;
    if (!map || !marker) return;

    marker.setLngLat(currentPosition);
    marker.setRotation(heading);

    if (isNavigating) {
      // 3D Heading-Up Driving Navigation Camera
      if (isFollowingDriver && !isRouteOverviewMode) {
        const forwardBearing =
          heading > 0
            ? heading
            : computeForwardRouteBearing(currentPosition, routeCoordsRef.current);

        map.easeTo({
          center: currentPosition,
          zoom: DRIVING_ZOOM_LEVEL,
          pitch: is3dView ? DRIVING_3D_PITCH : 0,
          bearing: forwardBearing,
          padding: { top: 210, bottom: 90, left: 0, right: 0 },
          duration: 500,
          easing: (t) => t
        });
      }
    } else {
      // Free Browse Camera
      map.easeTo({
        center: currentPosition,
        bearing: heading,
        duration: 600,
        pitch: is3dView ? 52 : 0
      });
    }
  }, [currentPosition, heading, is3dView, isNavigating, isFollowingDriver, isRouteOverviewMode]);

  // Handle explicit recenter button click
  useEffect(() => {
    const map = mapRef.current;
    if (map && recenterTrigger && recenterTrigger > 0) {
      setIsFollowingDriver(true);
      const forwardBearing = isNavigating
        ? (heading > 0 ? heading : computeForwardRouteBearing(currentPosition, routeCoordsRef.current))
        : heading;

      map.flyTo({
        center: currentPosition,
        zoom: isNavigating ? DRIVING_ZOOM_LEVEL : 16.5,
        bearing: forwardBearing,
        pitch: is3dView ? (isNavigating ? DRIVING_3D_PITCH : 52) : 0,
        padding: isNavigating
          ? { top: 210, bottom: 90, left: 0, right: 0 }
          : { top: 0, bottom: 0, left: 0, right: 0 },
        duration: 750
      });
    }
  }, [recenterTrigger]);

  // Reset North (Orient map to 0° bearing)
  useEffect(() => {
    const map = mapRef.current;
    if (map && resetNorthTrigger && resetNorthTrigger > 0) {
      map.easeTo({ bearing: 0, duration: 600 });
    }
  }, [resetNorthTrigger]);

  // Fit camera bounds to route preview
  useEffect(() => {
    const map = mapRef.current;
    if (
      map &&
      fitRouteBoundsTrigger &&
      fitRouteBoundsTrigger > 0 &&
      routeCoordsRef.current &&
      routeCoordsRef.current.length >= 2
    ) {
      try {
        const bounds = new LngLatBounds(routeCoordsRef.current[0], routeCoordsRef.current[0]);
        for (const coord of routeCoordsRef.current) {
          bounds.extend(coord);
        }
        map.fitBounds(bounds, {
          padding: { top: 110, bottom: 270, left: 60, right: 60 },
          duration: 800,
          maxZoom: 16
        });
      } catch (err) {
        console.warn('fitRouteBoundsTrigger error:', err);
      }
    }
  }, [fitRouteBoundsTrigger]);

  // Render Interactive Catalog POIs on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = [];

    // Suppress background catalog POIs during active navigation to avoid obscuring the road
    if (isNavigating) {
      return;
    }

    const activePois = getNearbyPois(currentPosition);

    activePois.forEach((poi) => {
      // Skip if already in favorites or actively selected
      if (favoritesRef.current?.some((f) => f.name.toLowerCase() === poi.name.toLowerCase())) {
        return;
      }
      if (selectedPlace?.name.toLowerCase() === poi.name.toLowerCase()) {
        return;
      }

      const catDef = CATEGORY_DEFINITIONS[poi.predictedCategory] || CATEGORY_DEFINITIONS.other;
      const el = document.createElement('div');
      el.className = 'ios-map-catalog-poi';
      el.title = `${poi.name} • ${poi.categoryLabel}`;
      el.innerHTML = `
        <div class="catalog-poi-bubble" style="background: ${catDef.gradient}; border: 2.5px solid #ffffff; box-shadow: 0 3px 10px rgba(0,0,0,0.18); display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%;">
          ${getCategorySvgString(poi.predictedCategory, 15, '#ffffff')}
        </div>
        <div class="catalog-poi-label">${poi.name}</div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onInspectPlaceRef.current?.({
          id: poi.id,
          name: poi.name,
          address: poi.address,
          coordinate: poi.coordinate,
          category: poi.predictedCategory,
          categoryLabel: poi.categoryLabel
        });
      });

      const marker = new MapLibreMarker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat(poi.coordinate)
        .addTo(map);

      poiMarkersRef.current.push(marker);
    });

    return () => {
      poiMarkersRef.current.forEach((m) => m.remove());
      poiMarkersRef.current = [];
    };
  }, [favorites, selectedPlace, currentPosition, isNavigating]);

  // Update Right-of-Way Danger Node
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    try {
      const dangerSource = map.getSource('danger-nodes') as GeoJSONSource | undefined;
      if (dangerSource) {
        if (upcomingIncomingRoad) {
          dangerSource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { name: upcomingIncomingRoad.name },
                geometry: {
                  type: 'Point',
                  coordinates: upcomingIncomingRoad.location
                }
              }
            ]
          });
        } else {
          dangerSource.setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }
    } catch {
      // Graceful fallback
    }
  }, [upcomingIncomingRoad]);

  // Update Favorite Location Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    favoriteMarkersRef.current.forEach((m) => m.remove());
    favoriteMarkersRef.current = [];

    favorites.forEach((fav) => {
      const catDef = CATEGORY_DEFINITIONS[fav.category] || CATEGORY_DEFINITIONS.other;
      const pinEl = document.createElement('div');
      pinEl.className = 'apple-fav-map-pin';
      pinEl.title = `${fav.name} • ${catDef.label}`;
      pinEl.innerHTML = `
        <div class="fav-pin-pulse" style="border-color: ${catDef.color}"></div>
        <div class="fav-pin-body" style="background: ${catDef.gradient}; box-shadow: 0 4px 14px ${catDef.color}66">
          <div class="fav-pin-symbol" style="display: flex; align-items: center; justify-content: center;">
            ${getCategorySvgString(fav.category, 15, '#ffffff')}
          </div>
        </div>
        <div class="fav-pin-tail" style="border-top-color: ${catDef.color}"></div>
      `;

      pinEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
        map.easeTo({ center: fav.coordinate, zoom: 17, duration: 500 });
        if (onInspectPlaceRef.current) {
          onInspectPlaceRef.current({
            id: fav.id,
            name: fav.name,
            address: fav.address,
            coordinate: fav.coordinate,
            category: fav.category,
            categoryLabel: CATEGORY_DEFINITIONS[fav.category]?.label || 'Place',
            isFavorite: true
          });
        }
        if (onSelectFavorite) {
          onSelectFavorite(fav);
        }
      });

      const pinMarker = new MapLibreMarker({
        element: pinEl,
        anchor: 'bottom'
      })
        .setLngLat(fav.coordinate)
        .addTo(map);

      favoriteMarkersRef.current.push(pinMarker);
    });

    return () => {
      favoriteMarkersRef.current.forEach((m) => m.remove());
      favoriteMarkersRef.current = [];
    };
  }, [favorites, onSelectFavorite]);

  // Update Selected Place / POI Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedPlace) {
      if (selectedPlaceMarkerRef.current) {
        selectedPlaceMarkerRef.current.remove();
        selectedPlaceMarkerRef.current = null;
      }
      return;
    }

    const catDef = CATEGORY_DEFINITIONS[selectedPlace.category] || CATEGORY_DEFINITIONS.other;
    const poiEl = document.createElement('div');
    poiEl.className = 'ios-selected-pin-container';
    poiEl.innerHTML = `
      <div class="ios-selected-pin-bubble" style="background: ${catDef.gradient};">
        ${getCategorySvgString(selectedPlace.category, 22, '#ffffff')}
      </div>
      <div class="ios-selected-pin-label">${selectedPlace.name}</div>
    `;

    if (selectedPlaceMarkerRef.current) {
      selectedPlaceMarkerRef.current.remove();
    }

    const marker = new MapLibreMarker({
      element: poiEl,
      anchor: 'bottom'
    })
      .setLngLat(selectedPlace.coordinate)
      .addTo(map);

    selectedPlaceMarkerRef.current = marker;

    map.easeTo({
      center: selectedPlace.coordinate,
      duration: 600,
      zoom: Math.max(map.getZoom(), 16.5)
    });
  }, [selectedPlace]);

  return (
    <div className="map-viewer-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} className="map-viewport" />

      {/* Floating Re-center Pill Button during Active Navigation when user panned away */}
      {isNavigating && !isFollowingDriver && !isRouteOverviewMode && (
        <button
          className="ios-nav-recenter-pill-btn"
          onClick={() => {
            soundManager.playClickSound();
            setIsFollowingDriver(true);
            const map = mapRef.current;
            if (map) {
              const forwardBearing =
                heading > 0
                  ? heading
                  : computeForwardRouteBearing(currentPosition, routeCoordsRef.current);
              map.flyTo({
                center: currentPosition,
                zoom: DRIVING_ZOOM_LEVEL,
                pitch: is3dView ? DRIVING_3D_PITCH : 0,
                bearing: forwardBearing,
                padding: { top: 210, bottom: 90, left: 0, right: 0 },
                duration: 750
              });
            }
          }}
          title="Re-center Driving Camera"
        >
          <TargetIcon width={16} height={16} color="#ffffff" />
          <span>Re-center</span>
        </button>
      )}
    </div>
  );
};

export default MapViewer;
