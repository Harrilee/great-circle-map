import React, { useMemo, useRef, useState } from 'react';

export function searchAirports(airports, query) {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  const rank = airport => {
    const code = [airport.iata, airport.icao].map(value => String(value || '').toLowerCase());
    const city = String(airport.city || '').toLowerCase();
    if (code.includes(term)) return 0;
    if (city === term) return 1;
    if (city.startsWith(term)) return 2;
    return 3;
  };
  return airports
    .filter(
      airport =>
        (airport.iata || airport.icao) &&
        [airport.iata, airport.icao, airport.city, airport.name].some(value =>
          String(value || '')
            .toLowerCase()
            .includes(term)
        )
    )
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 8);
}

export default function AirportPicker({ airports, onAddRoute }) {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const input = useRef(null);
  const matches = useMemo(() => searchAirports(airports, query), [airports, query]);
  const expanded = open && query.trim().length >= 2;
  function choose(airport) {
    setSelected(value => [...value, airport]);
    setQuery('');
    setActive(0);
    setOpen(false);
    input.current.focus();
  }
  function submit(event) {
    event.preventDefault();
    if (query.trim() || selected.length < 2) return;
    onAddRoute(selected.map(airport => airport.iata || airport.icao).join('-'));
    setSelected([]);
    setOpen(false);
    input.current.focus();
  }
  function keyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (expanded && matches.length) choose(matches[active] || matches[0]);
      else if (!query.trim()) submit(event);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive(index =>
        Math.max(0, Math.min(matches.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
      );
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Backspace' && !query) {
      setSelected(value => value.slice(0, -1));
    }
  }
  return (
    <form className="atlas-airport-picker" onSubmit={submit}>
      <label className="atlas-field-label" htmlFor="airport-search">
        Your route
      </label>
      <div className="atlas-token-input">
        {selected.map((airport, index) => (
          <span className="atlas-airport-token" key={`${airport.id}-${index}`} title={airport.name}>
            <span>{airport.iata || airport.icao}</span>
            <button
              type="button"
              aria-label={`Remove ${airport.iata || airport.icao} from route`}
              onClick={() => {
                setSelected(value => value.filter((_, i) => i !== index));
                input.current.focus();
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="airport-search"
          ref={input}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls="airport-options"
          aria-activedescendant={
            expanded && matches.length ? `airport-option-${active}` : undefined
          }
          aria-describedby="airport-picker-help"
          placeholder={selected.length ? 'Add another airport…' : 'Search city or airport…'}
          value={query}
          autoComplete="off"
          onChange={event => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={keyDown}
        />
      </div>
      {expanded && (
        <ul id="airport-options" role="listbox" className="atlas-search-results">
          {matches.map((airport, index) => (
            <li
              key={airport.id}
              id={`airport-option-${index}`}
              role="option"
              aria-selected={active === index}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(airport)}
            >
              <strong>{airport.iata || airport.icao}</strong>
              <span>
                {airport.city}
                <small>{airport.name}</small>
              </span>
            </li>
          ))}
          {!matches.length && (
            <li className="atlas-no-results" role="option" aria-selected="false">
              No matching airports
            </li>
          )}
        </ul>
      )}
      <p id="airport-picker-help" className="atlas-muted">
        Select airports, then press Enter again to add the route.
      </p>
      <button
        className="atlas-primary atlas-add-route"
        type="submit"
        disabled={selected.length < 2 || !!query.trim()}
      >
        Add route <span>↵</span>
      </button>
    </form>
  );
}
