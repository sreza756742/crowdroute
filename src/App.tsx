import { ArrowLeft, CalendarDays, ChevronRight, Clock3, ExternalLink, Info, MapPin, Moon, SlidersHorizontal, Sun, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadDashboardData, type DashboardData } from './lib/data';
import type { Area, Category, Event, Venue } from './lib/schemas';
import { formatDay, formatTime, isStale, relativeUpdated } from './lib/time';

const categoryLabels: Record<Category, string> = { concert: 'Concerts', festival: 'Festivals', sport: 'Sport', racing: 'Racing', show: 'Shows', other: 'Other' };
const areaLabels: Record<Area, string> = { central: 'Central', north: 'North', south: 'South', east: 'East', west: 'West' };
const ratingLabels = { quiet: 'Quiet', busy: 'Busy', very_busy: 'Very busy' } as const;

export default function App() {
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event>();
  const [showFilters, setShowFilters] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [categories, setCategories] = useState<Set<Category>>(new Set());
  const [areas, setAreas] = useState<Set<Area>>(new Set());
  const [light, setLight] = useState(false);

  useEffect(() => { loadDashboardData().then((next) => { setData(next); setSelectedDate(next.days[0]?.date ?? ''); }).catch(() => setError(true)); }, []);
  useEffect(() => { document.documentElement.dataset.theme = light ? 'light' : 'dark'; }, [light]);

  const venues = useMemo(() => new Map(data?.venues.map((venue) => [venue.id, venue])), [data]);
  const visibleEvents = useMemo(() => data?.events
    .filter((event) => event.start_at && aucklandDate(event.start_at) === selectedDate)
    .filter((event) => categories.size === 0 || categories.has(event.category))
    .filter((event) => { const venue = venues.get(event.venue_id); return areas.size === 0 || (venue && areas.has(venue.area)); })
    .sort((a, b) => a.est_end_at.localeCompare(b.est_end_at)) ?? [], [data, selectedDate, categories, areas, venues]);

  if (error) return <ErrorState />;
  if (!data) return <div className="loading"><div className="loading-mark">AD</div><p>Loading the week ahead…</p></div>;
  if (showAbout) return <About meta={data.meta} onBack={() => setShowAbout(false)} />;
  if (selectedEvent) return <EventDetail event={selectedEvent} venue={venues.get(selectedEvent.venue_id)} meta={data.meta} onBack={() => setSelectedEvent(undefined)} />;

  const filterCount = categories.size + areas.size;
  return <div className="app-shell">
    <header className="topbar">
      <div><span className="eyebrow">AUCKLAND</span><h1>Drive the busy hours.</h1></div>
      <div className="header-actions">
        <button className="icon-button" aria-label="Toggle theme" onClick={() => setLight((value) => !value)}>{light ? <Moon /> : <Sun />}</button>
        <button className="icon-button" aria-label="About" onClick={() => setShowAbout(true)}><Info /></button>
      </div>
    </header>
    <UpdateStrip updatedAt={data.meta.last_successful_run_at} />
    <nav className="day-strip" aria-label="Choose a day">
      {data.days.map((day, index) => <button key={day.date} className={`day-chip ${day.rating} ${selectedDate === day.date ? 'selected' : ''}`} onClick={() => setSelectedDate(day.date)}>
        <span>{index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : formatDay(day.date).split(',')[0]}</span>
        <strong>{new Date(`${day.date}T12:00:00`).getDate()}</strong>
        <small>{ratingLabels[day.rating]}</small>
      </button>)}
    </nav>
    <main>
      <section className="timeline-header">
        <div><p className="section-kicker">EXPECTED BUSY</p><h2>{formatDay(selectedDate, 'long')}</h2></div>
        <button className="filter-button" onClick={() => setShowFilters(true)}><SlidersHorizontal /> Filters {filterCount > 0 && <span>{filterCount}</span>}</button>
      </section>
      {visibleEvents.length === 0 ? <EmptyState filtered={filterCount > 0} onClear={() => { setCategories(new Set()); setAreas(new Set()); }} /> :
        <div className="event-list">{visibleEvents.map((event) => <EventCard key={event.id} event={event} venue={venues.get(event.venue_id)} onOpen={() => setSelectedEvent(event)} />)}</div>}
    </main>
    <footer><span>Times and crowds are estimates.</span><button onClick={() => setShowAbout(true)}>About the data</button></footer>
    {showFilters && <FilterSheet categories={categories} areas={areas} setCategories={setCategories} setAreas={setAreas} onClose={() => setShowFilters(false)} />}
  </div>;
}

function EventCard({ event, venue, onOpen }: { event: Event; venue?: Venue; onOpen: () => void }) {
  return <button className="event-card" onClick={onOpen}>
    <div className="event-time"><span>EST. FINISH</span><strong>{formatTime(event.est_end_at)}</strong><small>Starts {formatTime(event.start_at)}</small></div>
    <div className="event-info"><span className={`category category-${event.category}`}>{categoryLabels[event.category]}</span><h3>{event.title}</h3><p><MapPin /> {venue?.name ?? 'Venue unavailable'}</p><p className="crowd"><span className={`crowd-dot ${event.crowd_band}`} /> {event.crowd_band.replace('_', ' ')} crowd</p></div>
    <ChevronRight className="card-chevron" />
  </button>;
}

function EventDetail({ event, venue, meta, onBack }: { event: Event; venue?: Venue; meta: DashboardData['meta']; onBack: () => void }) {
  const maps = venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}`)}` : '#';
  return <div className="app-shell detail-page">
    <header className="detail-nav"><button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft /></button><span>Event details</span><div /></header>
    <UpdateStrip updatedAt={meta.last_successful_run_at} />
    <main>
      <span className={`category category-${event.category}`}>{categoryLabels[event.category]}</span>
      <h1 className="detail-title">{event.title}</h1>
      <section className="finish-hero"><span>ESTIMATED FINISH</span><strong>{formatTime(event.est_end_at)}</strong><p>{event.end_time_source === 'reported' ? 'Reported by the event source' : 'Estimated from a typical event duration'}</p></section>
      <dl className="detail-facts">
        <div><dt><Clock3 /> Starts</dt><dd>{formatTime(event.start_at)}, {formatDay(aucklandDate(event.start_at), 'long')}</dd></div>
        <div><dt><MapPin /> Venue</dt><dd>{venue?.name}<small>{venue?.address}</small></dd></div>
        <div><dt><CalendarDays /> Expected crowd</dt><dd className="capitalize">{event.crowd_band.replace('_', ' ')}</dd></div>
      </dl>
      <div className="detail-actions"><a className="primary-action" href={maps} target="_blank" rel="noreferrer"><MapPin /> Open in Maps</a><a className="secondary-action" href={event.source_url} target="_blank" rel="noreferrer">View source <ExternalLink /></a></div>
      <p className="disclaimer">Finish time and crowd size are planning estimates, not guarantees of demand or surge pricing.</p>
    </main>
  </div>;
}

function FilterSheet({ categories, areas, setCategories, setAreas, onClose }: { categories: Set<Category>; areas: Set<Area>; setCategories: (value: Set<Category>) => void; setAreas: (value: Set<Area>) => void; onClose: () => void }) {
  const toggle = <T extends string>(current: Set<T>, item: T, setter: (value: Set<T>) => void) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item); else next.add(item);
    setter(next);
  };
  return <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filters-title">
    <div className="sheet-handle" /><header><h2 id="filters-title">Filter events</h2><button className="icon-button" aria-label="Close filters" onClick={onClose}><X /></button></header>
    <fieldset><legend>Category</legend><div className="choice-grid">{Object.entries(categoryLabels).map(([value, label]) => <button key={value} className={categories.has(value as Category) ? 'active' : ''} onClick={() => toggle(categories, value as Category, setCategories)}>{label}</button>)}</div></fieldset>
    <fieldset><legend>Area</legend><div className="choice-grid">{Object.entries(areaLabels).map(([value, label]) => <button key={value} className={areas.has(value as Area) ? 'active' : ''} onClick={() => toggle(areas, value as Area, setAreas)}>{label}</button>)}</div></fieldset>
    <div className="sheet-actions"><button className="clear-button" onClick={() => { setCategories(new Set()); setAreas(new Set()); }}>Clear all</button><button className="apply-button" onClick={onClose}>Show events</button></div>
  </section></div>;
}

function About({ meta, onBack }: { meta: DashboardData['meta']; onBack: () => void }) {
  return <div className="app-shell detail-page about-page"><header className="detail-nav"><button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft /></button><span>About</span><div /></header><main>
    <p className="section-kicker">BUILT FOR THE SHIFT AHEAD</p><h1>One quick read on Auckland’s event traffic.</h1>
    <section><h2>What this shows</h2><p>Public concerts, festivals, live shows, sport and racing over the coming week. Events are sourced from official structured listings and linked back to their publisher.</p></section>
    <section><h2>Use estimates as a guide</h2><p>Finish times, crowd bands and “expected busy” ratings help with planning. They do not guarantee passenger demand, earnings or surge pricing. This service is not affiliated with any ride platform.</p></section>
    <section><h2>Privacy</h2><p>No account, cookies or tracking. This site does not collect or store personal information.</p></section>
    <section><h2>Data status</h2><p>Last updated {relativeUpdated(meta.last_successful_run_at)}. Sources currently configured: {Object.keys(meta.source_counts).join(', ') || 'none'}.</p></section>
    <a className="secondary-action" href="mailto:feedback@example.com">Send feedback</a>
  </main></div>;
}

function UpdateStrip({ updatedAt }: { updatedAt: string }) { const stale = isStale(updatedAt); return <div className={`update-strip ${stale ? 'stale' : ''}`}><span className="status-dot" />{stale ? 'Data may be out of date' : `Updated ${relativeUpdated(updatedAt)}`}</div>; }
function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) { return <div className="empty-state"><CalendarDays /><h3>{filtered ? 'No matching events' : 'No major events listed'}</h3><p>{filtered ? 'Try clearing a filter to see more.' : 'A quieter-looking day can be useful too. Check back after the next update.'}</p>{filtered && <button onClick={onClear}>Clear filters</button>}</div>; }
function ErrorState() { return <div className="loading error-state"><div className="loading-mark">!</div><h1>Couldn’t load event data</h1><p>You may be offline before the first visit. Try again when connected.</p><button onClick={() => location.reload()}>Try again</button></div>; }
function aucklandDate(iso: string): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)); }
