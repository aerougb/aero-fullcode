import { useMemo, useState } from 'react';
import { ExternalLink, Film, Play, Search, Tv } from 'lucide-react';

interface MoviesViewProps { onOpenInBrowser: () => void }
interface MovieItem { id: string; title: string; year: string; tmdbId: number }
interface TvItem { id: string; title: string; year: string; tmdbId: number; season: number; episode: number }
type LibraryItem = (MovieItem & { type: 'movie' }) | (TvItem & { type: 'tv' });

const MOVIES: MovieItem[] = [
  { id: 'inception', title: 'Inception', year: '2010', tmdbId: 27205 },
  { id: 'interstellar', title: 'Interstellar', year: '2014', tmdbId: 157336 },
  { id: 'dark-knight', title: 'The Dark Knight', year: '2008', tmdbId: 155 },
  { id: 'avengers-endgame', title: 'Avengers: Endgame', year: '2019', tmdbId: 299534 },
  { id: 'spider-man-no-way-home', title: 'Spider-Man: No Way Home', year: '2021', tmdbId: 634649 },
  { id: 'dune', title: 'Dune', year: '2021', tmdbId: 438631 },
  { id: 'oppenheimer', title: 'Oppenheimer', year: '2023', tmdbId: 872585 },
  { id: 'matrix', title: 'The Matrix', year: '1999', tmdbId: 603 },
  { id: 'parasite', title: 'Parasite', year: '2019', tmdbId: 496243 },
  { id: 'fight-club', title: 'Fight Club', year: '1999', tmdbId: 550 },
  { id: 'pulp-fiction', title: 'Pulp Fiction', year: '1994', tmdbId: 680 },
  { id: 'godfather', title: 'The Godfather', year: '1972', tmdbId: 238 },
  { id: 'shawshank', title: 'The Shawshank Redemption', year: '1994', tmdbId: 278 },
  { id: 'fellowship', title: 'The Lord of the Rings: The Fellowship of the Ring', year: '2001', tmdbId: 120 },
  { id: 'spirited-away', title: 'Spirited Away', year: '2001', tmdbId: 129 },
  { id: 'titanic', title: 'Titanic', year: '1997', tmdbId: 597 },
  { id: 'avatar', title: 'Avatar', year: '2009', tmdbId: 19995 },
  { id: 'joker', title: 'Joker', year: '2019', tmdbId: 475557 },
  { id: 'iron-man', title: 'Iron Man', year: '2008', tmdbId: 1726 },
  { id: 'deadpool', title: 'Deadpool', year: '2016', tmdbId: 293660 },
  { id: 'whiplash', title: 'Whiplash', year: '2014', tmdbId: 244786 },
  { id: 'everything-everywhere', title: 'Everything Everywhere All at Once', year: '2022', tmdbId: 545611 },
  { id: 'top-gun-maverick', title: 'Top Gun: Maverick', year: '2022', tmdbId: 361743 },
  { id: 'john-wick', title: 'John Wick', year: '2014', tmdbId: 245891 },
];

const TV_SHOWS: TvItem[] = [
  { id: 'breaking-bad', title: 'Breaking Bad', year: '2008', tmdbId: 1396, season: 1, episode: 1 },
  { id: 'stranger-things', title: 'Stranger Things', year: '2016', tmdbId: 66732, season: 1, episode: 1 },
  { id: 'last-of-us', title: 'The Last of Us', year: '2023', tmdbId: 100088, season: 1, episode: 1 },
  { id: 'game-of-thrones', title: 'Game of Thrones', year: '2011', tmdbId: 1399, season: 1, episode: 1 },
  { id: 'the-office', title: 'The Office', year: '2005', tmdbId: 2316, season: 1, episode: 1 },
  { id: 'rick-and-morty', title: 'Rick and Morty', year: '2013', tmdbId: 60625, season: 1, episode: 1 },
  { id: 'the-boys', title: 'The Boys', year: '2019', tmdbId: 76479, season: 1, episode: 1 },
  { id: 'wednesday', title: 'Wednesday', year: '2022', tmdbId: 119051, season: 1, episode: 1 },
  { id: 'better-call-saul', title: 'Better Call Saul', year: '2015', tmdbId: 60059, season: 1, episode: 1 },
  { id: 'attack-on-titan', title: 'Attack on Titan', year: '2013', tmdbId: 1429, season: 1, episode: 1 },
  { id: 'one-piece', title: 'One Piece', year: '1999', tmdbId: 37854, season: 1, episode: 1 },
  { id: 'succession', title: 'Succession', year: '2018', tmdbId: 87108, season: 1, episode: 1 },
];

const movieEmbed = (tmdbId: number) => `https://vidphantom.com/movie/${tmdbId}`;
const tvEmbed = (show: TvItem) => `https://vidphantom.com/tv/${show.tmdbId}/${show.season}/${show.episode}`;

export default function MoviesView({ onOpenInBrowser: _onOpenInBrowser }: MoviesViewProps) {
  const [category, setCategory] = useState<'movies' | 'tv'>('movies');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LibraryItem>({ ...MOVIES[0], type: 'movie' });

  const library = useMemo<LibraryItem[]>(() => (category === 'movies' ? MOVIES.map((item) => ({ ...item, type: 'movie' as const })) : TV_SHOWS.map((item) => ({ ...item, type: 'tv' as const }))), [category]);
  const filteredItems = library.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));
  const embedUrl = selected.type === 'movie' ? movieEmbed(selected.tmdbId) : tvEmbed(selected);

  const switchCategory = (nextCategory: 'movies' | 'tv') => {
    setCategory(nextCategory);
    setQuery('');
    if (nextCategory === 'movies') {
      setSelected({ ...MOVIES[0], type: 'movie' });
    } else {
      setSelected({ ...TV_SHOWS[0], type: 'tv' });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}><Film size={22} style={{ color: 'var(--accent)' }} /></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>Watch room</p><h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Movies & shows</h1></div>
            </div>
            <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>Pick a title and play it directly in the embedded VidPhantom player.</p>
          </div>
          <a href="https://vidphantom.live/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-80 lg:self-auto" style={{ color: 'var(--accent)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>Browse VidPhantom <ExternalLink size={14} /></a>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-fit items-center gap-1 rounded-xl p-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <button onClick={() => switchCategory('movies')} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors" style={{ background: category === 'movies' ? 'var(--accent)' : 'transparent', color: category === 'movies' ? 'var(--bg-primary)' : 'var(--text-secondary)' }}><Film size={14} /> Movies</button>
            <button onClick={() => switchCategory('tv')} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors" style={{ background: category === 'tv' ? 'var(--accent)' : 'transparent', color: category === 'tv' ? 'var(--bg-primary)' : 'var(--text-secondary)' }}><Tv size={14} /> TV shows</button>
          </div>
          <label className="flex w-full items-center gap-2 rounded-xl px-3 py-2 sm:max-w-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}><Search size={15} style={{ color: 'var(--text-muted)' }} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${category === 'movies' ? 'movies' : 'shows'}...`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /></label>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1.5fr)]">
          <section className="rounded-2xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="mb-2 flex items-center justify-between px-1"><h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{category === 'movies' ? 'Movie library' : 'TV library'}</h2><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{filteredItems.length} titles</span></div>
            <div className="grid max-h-[min(68vh,680px)] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
              {filteredItems.map((item) => <button key={item.id} onClick={() => setSelected(item)} className="group flex items-center gap-3 rounded-xl p-3 text-left transition-all hover:-translate-y-0.5" style={{ background: selected.id === item.id ? 'var(--bg-tertiary)' : 'transparent', border: `1px solid ${selected.id === item.id ? 'var(--accent)' : 'var(--border)'}` }}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: selected.id === item.id ? 'var(--accent)' : 'var(--bg-tertiary)', color: selected.id === item.id ? 'var(--bg-primary)' : 'var(--accent)' }}>{item.type === 'movie' ? <Film size={16} /> : <Tv size={16} />}</div><span className="min-w-0 flex-1"><strong className="block truncate text-sm" style={{ color: 'var(--text-primary)' }}>{item.title}</strong><small style={{ color: 'var(--text-muted)' }}>{item.year}{item.type === 'tv' ? ' · S1 E1' : ''}</small></span><Play size={14} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--accent)' }} /></button>)}
              {filteredItems.length === 0 && <p className="px-2 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No titles match that search.</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl" style={{ background: '#000', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}><div className="min-w-0"><h2 className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.title}</h2><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selected.type === 'movie' ? `${selected.year} · Movie` : `${selected.year} · Season ${selected.season}, episode ${selected.episode}`}</p></div><a href={embedUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 transition-opacity hover:opacity-80" style={{ color: 'var(--accent)' }} aria-label="Open player in a new tab"><ExternalLink size={16} /></a></div>
            <iframe key={embedUrl} src={embedUrl} title={`${selected.title} player`} className="h-[min(68vh,680px)] w-full border-0" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" allowFullScreen scrolling="no" />
          </section>
        </div>
      </div>
    </div>
  );
}
