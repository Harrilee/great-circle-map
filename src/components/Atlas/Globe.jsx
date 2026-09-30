import React, { useEffect, useRef, useState } from 'react';
import { Geodesic } from 'geographiclib';

const C = () => window.Cesium;
export function sampleRoute(route) {
  const points = [];
  route.slice(1).forEach((end, i) => {
    const start = route[i];
    const line = Geodesic.WGS84.InverseLine(start.lat, start.lng, end.lat, end.lng);
    const steps = Math.max(2, Math.ceil(line.s13 / 60000));
    for (let j = 0; j <= steps; j += 1) {
      const p = line.Position((line.s13 * j) / steps);
      points.push([p.lon2, p.lat2]);
    }
  });
  return points;
}

export default function Globe({ routes, label, color, mode, command, onAirport, onStatus }) {
  const mount = useRef(null),
    overlay = useRef(null),
    viewerRef = useRef(null);
  const onAirportRef = useRef(onAirport),
    onStatusRef = useRef(onStatus);
  onAirportRef.current = onAirport;
  onStatusRef.current = onStatus;
  const routePositions = useRef([]);
  const previousRoutes = useRef(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  useEffect(() => {
    let disposed = false,
      viewer;
    async function initialize() {
      try {
        if (!C())
          throw new Error('The globe library could not load. Check your connection and reload.');
        const Cesium = C();
        viewer = new Cesium.Viewer(mount.current, {
          imageryProvider: false,
          skyBox: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          timeline: false,
          animation: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          requestRenderMode: true,
          scene3DOnly: false,
          shouldAnimate: false
        });
        viewerRef.current = viewer;
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#07111c');
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#183c4b');
        viewer.scene.globe.maximumScreenSpaceError = 0.75;
        viewer.scene.globe.tileCacheSize = 512;
        viewer.resolutionScale = Math.max(1.5, Math.min(window.devicePixelRatio || 1, 2));
        viewer.scene.globe.enableLighting = false;
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1000;
        viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(-145, 53, 19000000) });
        viewer.scene.renderError.addEventListener(() =>
          setFailure('The 3D renderer stopped. Reload the page to restart it.')
        );
        if (!disposed) setReady(true);
      } catch (error) {
        if (!disposed) setFailure(error.message);
      }
    }
    initialize();
    return () => {
      disposed = true;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const viewer = viewerRef.current,
      Cesium = C();
    onStatusRef.current('Loading imagery…');
    const street = mode === 'roadmap';
    Cesium.ArcGisMapServerImageryProvider.fromUrl(
      `https://services.arcgisonline.com/ArcGIS/rest/services/${
        street ? 'World_Street_Map' : 'World_Imagery'
      }/MapServer`
    )
      .then(provider => {
        if (cancelled) return;
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(provider);
        provider.errorEvent.addEventListener(() =>
          onStatusRef.current('Some map tiles are unavailable. Zoom out or retry.')
        );
        if (mode === 'globe') viewer.scene.morphTo3D(0);
        else viewer.scene.morphTo2D(0);
        fit();
        viewer.scene.requestRender();
        onStatusRef.current('');
      })
      .catch(() => {
        if (!cancelled)
          onStatusRef.current('Imagery unavailable. Check your connection and reload.');
      });
    return () => {
      cancelled = true;
    };
  }, [ready, mode]);

  function fit(points = routePositions.current) {
    const viewer = viewerRef.current,
      Cesium = C();
    if (!viewer || !points.length) return;
    if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
      const bounds = Cesium.Rectangle.fromCartesianArray(points);
      const width = Math.max(0.03, Cesium.Rectangle.computeWidth(bounds));
      const height = Math.max(0.03, Cesium.Rectangle.computeHeight(bounds));
      const mobile = innerWidth < 700;
      const padded =
        width * 1.9 >= Math.PI * 2
          ? Cesium.Rectangle.MAX_VALUE
          : new Cesium.Rectangle(
              Cesium.Math.negativePiToPi(bounds.west - width * (mobile ? 0.3 : 0.7)),
              Math.max(-Math.PI / 2, bounds.south - height * (mobile ? 1.1 : 0.3)),
              Cesium.Math.negativePiToPi(bounds.east + width * 0.3),
              Math.min(Math.PI / 2, bounds.north + height * 0.3)
            );
      viewer.camera.flyTo({ destination: padded, duration: 1.1 });
      return;
    }
    const sphere = Cesium.BoundingSphere.fromPoints(points);
    const range = Math.max(700000, sphere.radius * (innerWidth < 700 ? 4.8 : 3.5));
    viewer.camera.flyToBoundingSphere(sphere, {
      duration: 1.1,
      offset: new Cesium.HeadingPitchRange(0, -Math.PI / 2, range),
      complete: () => {
        if (innerWidth < 700 && viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
          const panel = document.querySelector('.atlas-panel').getBoundingClientRect();
          const desiredY = (120 + panel.top) / 2;
          viewer.camera.moveDown(
            Math.max(0, (innerHeight / 2 - desiredY) / innerHeight) * range * 1.15
          );
          viewer.scene.requestRender();
        }
      }
    });
  }

  useEffect(() => {
    if (!ready) return undefined;
    const viewer = viewerRef.current,
      Cesium = C();
    viewer.entities.removeAll();
    overlay.current.replaceChildren();
    const points = [],
      airports = new Map(),
      labels = [];
    const occluder = new Cesium.EllipsoidalOccluder(
      Cesium.Ellipsoid.WGS84,
      viewer.camera.positionWC
    );
    const visible = position => {
      occluder.cameraPosition = viewer.camera.positionWC;
      return viewer.scene.mode !== Cesium.SceneMode.SCENE3D || occluder.isPointVisible(position);
    };
    routes.forEach(route => {
      const sampled = sampleRoute(route).map(([lng, lat]) =>
        Cesium.Cartesian3.fromDegrees(lng, lat, 1000)
      );
      points.push(...sampled);
      if (sampled.length > 1)
        viewer.entities.add({
          polyline: {
            positions: sampled,
            width: 3,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString(color),
              dashLength: 17
            })
          }
        });
      route.forEach(airport => airports.set(airport.id, airport));
    });
    airports.forEach(airport => {
      const position = Cesium.Cartesian3.fromDegrees(airport.lng, airport.lat, 1200);
      points.push(position);
      viewer.entities.add({
        position,
        point: {
          pixelSize: 9,
          color: Cesium.Color.fromCssColorString('#e7f5f8'),
          outlineColor: Cesium.Color.fromCssColorString('#142632'),
          outlineWidth: 2,
          disableDepthTestDistance: Infinity,
          show: new Cesium.CallbackProperty(() => visible(position), false)
        }
      });
      if (label === 'none') return;
      const button = document.createElement('button');
      button.className = 'atlas-map-label';
      button.type = 'button';
      button.textContent = airport[label] || airport.iata || airport.icao;
      button.title = airport.name;
      button.onclick = () => onAirportRef.current(airport);
      overlay.current.appendChild(button);
      labels.push({ button, position });
    });
    routePositions.current = points;
    const overlap = (a, b) =>
      Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
      Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const layout = () => {
      const occupied = [
        ...document.querySelectorAll('.atlas-panel,.atlas-brand,.atlas-controls,.atlas-detail')
      ]
        .filter(e => e.offsetHeight)
        .map(e => {
          const r = e.getBoundingClientRect();
          return { x: r.x - 6, y: r.y - 6, w: r.width + 12, h: r.height + 12 };
        });
      labels.forEach(({ button, position }) => {
        const p = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, position);
        button.hidden =
          !p || !visible(position) || p.x < 0 || p.y < 0 || p.x > innerWidth || p.y > innerHeight;
        if (button.hidden) return;
        const w = button.offsetWidth,
          h = button.offsetHeight;
        let best = null;
        [13, 35, 65, 105].forEach(gap =>
          [[gap, -h / 2], [-w - gap, -h / 2], [-w / 2, -h - gap], [-w / 2, gap]].forEach(
            ([dx, dy]) => {
              const box = {
                x: Math.max(5, Math.min(innerWidth - w - 5, p.x + dx)),
                y: Math.max(5, Math.min(innerHeight - h - 32, p.y + dy)),
                w,
                h
              };
              const collision = occupied.reduce((sum, r) => sum + overlap(box, r), 0);
              const score = collision * 10000 + gap;
              if (!best || score < best.score) best = { ...box, score, collision };
            }
          )
        );
        // At dense hubs, omit overlapping labels until the user zooms in.
        if (best.collision > 0) {
          button.hidden = true;
          return;
        }
        button.style.transform = `translate(${Math.round(best.x)}px,${Math.round(best.y)}px)`;
        occupied.push(best);
      });
    };
    const remove = viewer.scene.postRender.addEventListener(layout);
    if (previousRoutes.current !== routes) fit(points);
    previousRoutes.current = routes;
    viewer.scene.requestRender();
    return () => remove();
  }, [ready, routes, label, color]);

  useEffect(() => {
    if (!ready || !command) return;
    const v = viewerRef.current,
      Cesium = C();
    if (command.type === 'fit') fit();
    if (command.type === 'route')
      fit(
        sampleRoute(command.route).map(([lng, lat]) =>
          Cesium.Cartesian3.fromDegrees(lng, lat, 1000)
        )
      );
    if (command.type === 'world')
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-100, 35, 24000000),
        duration: 1
      });
    if (command.type === 'in') v.camera.zoomIn(v.camera.positionCartographic.height * 0.4);
    if (command.type === 'out') v.camera.zoomOut(v.camera.positionCartographic.height * 0.6);
    if (command.type === 'north')
      v.camera.setView({ orientation: { heading: 0, pitch: v.camera.pitch, roll: 0 } });
    v.scene.requestRender();
  }, [ready, command]);
  return (
    <>
      <div className="atlas-globe" ref={mount} />
      <div className="atlas-labels" ref={overlay} />
      {failure && (
        <div className="atlas-error" role="alert">
          {failure}
          <button onClick={() => location.reload()}>Reload map</button>
        </div>
      )}
    </>
  );
}
