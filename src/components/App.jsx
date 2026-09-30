import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { push, replace } from 'redux-little-router';
import { getAirportData } from '../actionCreators';
import { getRoutes } from '../selectors';
import { getRouteDistance, makeDistanceReadable } from '../utils/distance';
import Globe from './Atlas/Globe';
import AirportPicker from './Atlas/AirportPicker';
import { basePath } from '../utils/assetUrl';
import '../stylesheets/atlas.scss';
import { markerDefaults, readMarkerStyle } from '../utils/markerStyle';

const EMPTY_ROUTES = [];

function App({ dispatch, airportData, result, query, pathname }) {
  const [draft, setDraft] = useState(query.routes || '');
  const [tab, setTab] = useState('routes');
  const [collapsed, setCollapsed] = useState(false);
  const [command, setCommand] = useState(null);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('');
  const [shared, setShared] = useState('');
  useEffect(() => {
    dispatch(getAirportData());
  }, []);
  useEffect(() => {
    setDraft(query.routes || '');
    setSelected(null);
  }, [query.routes]);
  useEffect(() => {
    setCommand({ type: 'layout', time: Date.now() });
  }, [tab, collapsed, selected]);
  const routes = result.routes || EMPTY_ROUTES;
  const unit = ['km', 'mi', 'nm'].includes(query.unit) ? query.unit : 'km';
  const label = ['city', 'iata', 'icao', 'none'].includes(query.label) ? query.label : 'iata';
  const color = /^#[0-9a-f]{6}$/i.test(query.color || '') ? query.color : '#80d9e3';
  const markerStyle = readMarkerStyle(query);
  const updateMarkerStyle = values => dispatch(replace({ query: values }, { persistQuery: true }));
  const path = pathname.replace(basePath, '').replace(/\/$/, '') || '/';
  const mode =
    path === '/roadmap-3d'
      ? 'roadmap-3d'
      : path.includes('roadmap')
      ? 'roadmap'
      : path.includes('satellite') || path === '/leaflet'
      ? 'satellite'
      : 'globe';
  const update = values => dispatch(push({ query: values }, { persistQuery: true }));
  const send = (type, extra = {}) => setCommand({ type, ...extra, time: Date.now() });
  const distance = r => makeDistanceReadable(getRouteDistance(r), unit);
  const sectors = routes.reduce((n, r) => n + Math.max(0, r.length - 1), 0);
  const total = routes.reduce((n, r) => n + getRouteDistance(r), 0);
  const switchMode = value =>
    dispatch(push({ pathname: `/${value === 'globe' ? '' : value}` }, { persistQuery: true }));
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      setShared('Link copied');
    } catch (e) {
      setShared('Copy the URL from your address bar to share this map.');
    }
    setTimeout(() => setShared(''), 5000);
  }
  return (
    <main className="atlas-app">
      <Globe
        {...markerStyle}
        routes={routes}
        label={label}
        color={color}
        mode={mode}
        command={command}
        onAirport={setSelected}
        onStatus={setStatus}
      />
      <header className="atlas-brand">
        <div className="atlas-eyebrow">A WORLD CONNECTED · FLIGHT ATLAS</div>
        <h1>
          Great Circle Map<span>.</span>
        </h1>
        <p>Every journey, a different perspective.</p>
      </header>
      <div className="atlas-mode-badge">
        {mode === 'globe'
          ? 'SATELLITE / 3D'
          : mode === 'satellite'
          ? 'SATELLITE / 2D'
          : mode === 'roadmap-3d'
          ? 'STREET MAP / 3D'
          : 'STREET MAP / 2D'}
      </div>
      <aside
        className={`atlas-panel ${collapsed ? 'is-collapsed' : ''}`}
        aria-label="Route planner"
      >
        <div className="atlas-panel-heading">
          <span>YOUR FLIGHT ATLAS</span>
          <button
            aria-label={collapsed ? 'Expand planner' : 'Collapse planner'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? '+' : '−'}
          </button>
        </div>
        {!collapsed && (
          <div className="atlas-panel-body">
            <nav className="atlas-tabs" aria-label="Planner sections">
              <button aria-pressed={tab === 'routes'} onClick={() => setTab('routes')}>
                Routes
              </button>
              <button aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}>
                Map & settings
              </button>
            </nav>
            {tab === 'routes' ? (
              <>
                <AirportPicker
                  airports={airportData}
                  onAddRoute={route => {
                    const existing = (query.routes || '').trim().replace(/[,;\/\n]+$/, '');
                    update({ routes: existing ? `${existing}, ${route}` : route });
                  }}
                />
                <details className="atlas-code-entry" onToggle={() => send('layout')}>
                  <summary>Paste or edit airport codes</summary>
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      update({ routes: draft });
                    }}
                  >
                    <label className="atlas-field-label" htmlFor="route-input">
                      Airport codes
                    </label>
                    <textarea
                      id="route-input"
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      placeholder="SEA-ANC-BRW"
                      spellCheck="false"
                      aria-describedby="route-help"
                    />
                    <p id="route-help" className="atlas-muted">
                      Connect airports with – · Separate routes with commas.
                      <br />
                      IATA, ICAO and slash expansion are supported.
                    </p>
                    <div className="atlas-row">
                      <button
                        className="atlas-primary"
                        type="submit"
                        disabled={!airportData.length}
                      >
                        Draw routes <span>↗</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft('');
                          update({ routes: '' });
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                </details>
                {!airportData.length && (
                  <p role="status" className="atlas-muted">
                    Loading airports…{' '}
                    <button onClick={() => dispatch(getAirportData())}>Retry</button>
                  </p>
                )}
                {result.error && (
                  <p role="alert" className="atlas-validation">
                    {result.error}
                  </p>
                )}
                {!query.routes && (
                  <div className="atlas-examples">
                    <span className="atlas-muted">Take a look</span>
                    {['SEA-ANC-BRW', 'LAX-DXB', 'SFO-HND-SIN'].map(example => (
                      <button key={example} onClick={() => update({ routes: example })}>
                        {example} ↗
                      </button>
                    ))}
                  </div>
                )}
                {routes.length > 0 && (
                  <details className="atlas-all-data" onToggle={() => send('layout')}>
                    <summary>
                      Show all data <span>{sectors} legs</span>
                    </summary>
                    <div className="atlas-route-list">
                      {routes.map((route, index) => (
                        <article className="atlas-route" key={`${route.id}-${index}`}>
                          <div className="atlas-route-heading">
                            <button onClick={() => send('route', { route })}>
                              <i style={{ borderColor: color }} />
                              {route.map(a => a.userEnteredCode).join(' → ')}
                            </button>
                            <button
                              className="atlas-remove"
                              aria-label={`Remove route ${index + 1}`}
                              onClick={() =>
                                update({
                                  routes: routes
                                    .filter((_, i) => i !== index)
                                    .map(r => r.map(a => a.userEnteredCode).join('-'))
                                    .join(',')
                                })
                              }
                            >
                              ×
                            </button>
                          </div>
                          <details>
                            <summary>
                              {distance(route)}
                              <span>{Math.max(0, route.length - 1)} legs · Details</span>
                            </summary>
                            <div className="atlas-legs">
                              {route.slice(1).map((a, i) => (
                                <div key={i}>
                                  <span>
                                    {route[i].city || route[i].iata} → {a.city || a.iata}
                                  </span>
                                  <b>{distance([route[i], a])}</b>
                                </div>
                              ))}
                              {route.length > 2 && (
                                <>
                                  <div>
                                    <span>Nonstop comparison</span>
                                    <b>{distance([route[0], route[route.length - 1]])}</b>
                                  </div>
                                  <div>
                                    <span>Extra distance</span>
                                    <b>
                                      {makeDistanceReadable(
                                        getRouteDistance(route) -
                                          getRouteDistance([route[0], route[route.length - 1]]),
                                        unit
                                      )}
                                    </b>
                                  </div>
                                </>
                              )}
                            </div>
                          </details>
                        </article>
                      ))}
                    </div>
                    {routes.length > 0 && (
                      <div className="atlas-total">
                        <span>TOTAL DISTANCE</span>
                        <strong>{makeDistanceReadable(total, unit)}</strong>
                        <small>
                          {sectors} legs · {new Set(routes.flat().map(a => a.id)).size} airports
                        </small>
                      </div>
                    )}
                  </details>
                )}
              </>
            ) : (
              <div className="atlas-settings">
                <label htmlFor="map-mode">
                  Map view
                  <select id="map-mode" value={mode} onChange={e => switchMode(e.target.value)}>
                    <option value="globe">Satellite globe · 3D</option>
                    <option value="satellite">Satellite map · 2D</option>
                    <option value="roadmap-3d">Street map · 3D</option>
                    <option value="roadmap">Street map · 2D</option>
                  </select>
                </label>
                <label htmlFor="distance-unit">
                  Distance unit
                  <select
                    id="distance-unit"
                    value={unit}
                    onChange={e => update({ unit: e.target.value })}
                  >
                    <option value="km">Kilometers</option>
                    <option value="mi">Miles</option>
                    <option value="nm">Nautical miles</option>
                  </select>
                </label>
                <label htmlFor="airport-labels">
                  Airport labels
                  <select
                    id="airport-labels"
                    value={label}
                    onChange={e => update({ label: e.target.value })}
                  >
                    <option value="iata">IATA code</option>
                    <option value="icao">ICAO code</option>
                    <option value="city">City name</option>
                    <option value="none">Hidden</option>
                  </select>
                </label>
                <fieldset className="atlas-marker-settings">
                  <legend>Labels & airport points</legend>
                  {[
                    ['labelSize', 'Label size', 8, 32, 'px'],
                    ['labelOpacity', 'Label opacity', 0, 100, '%'],
                    ['pointSize', 'Airport point size', 2, 24, 'px']
                  ].map(([key, title, min, max, unit]) => (
                    <label className="atlas-range" htmlFor={key} key={key}>
                      <span>
                        {title}
                        <output htmlFor={key}>
                          {markerStyle[key]} {unit}
                        </output>
                      </span>
                      <input
                        id={key}
                        type="range"
                        min={min}
                        max={max}
                        step="1"
                        value={markerStyle[key]}
                        onChange={e => updateMarkerStyle({ [key]: e.target.value })}
                      />
                    </label>
                  ))}
                  {[
                    ['labelForeground', 'Label text color'],
                    ['labelBackground', 'Label background color']
                  ].map(([key, title]) => (
                    <label className="atlas-color" htmlFor={key} key={key}>
                      {title}
                      <input
                        id={key}
                        type="color"
                        value={markerStyle[key]}
                        onChange={e => updateMarkerStyle({ [key]: e.target.value })}
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="atlas-reset-style"
                    onClick={() => updateMarkerStyle(markerDefaults)}
                  >
                    Reset label & point style
                  </button>
                </fieldset>
                <label className="atlas-color" htmlFor="route-color">
                  Route color
                  <input
                    id="route-color"
                    type="color"
                    value={color}
                    onChange={e => update({ color: e.target.value })}
                  />
                </label>
                <p className="atlas-muted">
                  Distances follow the WGS84 ellipsoid. Solid paths show the shortest
                  airport-to-airport routes, not recorded flight tracks.
                </p>
                <p className="atlas-muted">
                  Airport data: OpenTravelData. Map imagery: Esri and its contributors.
                </p>
              </div>
            )}
            <div className="atlas-footer-actions">
              <button onClick={() => send('fit')}>Fit routes</button>
              <button onClick={() => send('world')}>World view</button>
              <button onClick={share}>Share ↗</button>
            </div>
            {shared && (
              <p role="status" className="atlas-muted">
                {shared}
              </p>
            )}
          </div>
        )}
      </aside>
      <nav className="atlas-controls" aria-label="Map controls">
        <button aria-label="Zoom in" onClick={() => send('in')}>
          +
        </button>
        <button aria-label="Zoom out" onClick={() => send('out')}>
          −
        </button>
        <button aria-label="Reset north" onClick={() => send('north')}>
          N ↑
        </button>
        <button
          aria-label="Fullscreen"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else if (document.documentElement.requestFullscreen)
              document.documentElement
                .requestFullscreen()
                .catch(() => setStatus('Fullscreen is not available in this browser.'));
            else setStatus('Fullscreen is not available in this browser.');
          }}
        >
          ⛶
        </button>
      </nav>
      {selected && (
        <aside className="atlas-detail">
          <button aria-label="Close airport details" onClick={() => setSelected(null)}>
            ×
          </button>
          <span className="atlas-eyebrow">
            {selected.iata} / {selected.icao}
          </span>
          <h2>{selected.name}</h2>
          <p>{selected.city}</p>
          <small>
            {selected.lat.toFixed(3)}°, {selected.lng.toFixed(3)}°
          </small>
        </aside>
      )}
      {status && (
        <div className="atlas-status" role="status">
          {status}
        </div>
      )}
      <footer className="atlas-hint">Drag to explore · Scroll to zoom · Right-drag to tilt</footer>
    </main>
  );
}
export default connect(state => ({
  airportData: state.airportData,
  result: getRoutes(state),
  query: state.router.query,
  pathname: state.router.pathname
}))(App);
