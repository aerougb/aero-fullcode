import { useState, useEffect, useCallback } from 'react';
import { Menu, Home, Globe, MessageSquare, Settings, Film, GamepadIcon, Github } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { ViewId, Theme, AccentColor, CustomColors, UserSettings } from '@/types';
import { normalizeCustomColors } from '@/lib/appearance';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import HomeView from '@/components/HomeView';
import BrowserView from '@/components/BrowserView';
import ChatView from '@/components/ChatView';
import SettingsView from '@/components/SettingsView';
import MoviesView from '@/components/MoviesView';
import GamesView from '@/components/GamesView';
import JsdelivrGenerator from '@/components/JsdelivrGenerator';

interface AppUser {
  id: string;
  email: string;
  username: string;
}

const VIEW_LABELS: Record<ViewId, string> = {
  home: 'Home', browser: 'Browser', chat: 'Chat', settings: 'Settings', movies: 'Movies', games: 'Games', jsdelivr: 'GitHub Links',
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<ViewId>('home');
  const [theme, setTheme] = useState<Theme>('dark');
  const [accent, setAccent] = useState<AccentColor>('blue');
  const [motionEnabled, setMotionEnabled] = useState<boolean>(() => window.localStorage.getItem('aero-motion') !== 'off');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState<CustomColors>({});
  const [user, setUser] = useState<AppUser | null>(null);
  const [browserTarget, setBrowserTarget] = useState<string | undefined>();
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-accent', accent);
    root.setAttribute('data-motion', motionEnabled ? 'on' : 'off');
    const customVariables: Record<string, string | undefined> = {
      '--bg-primary': customColors.background,
      '--bg-secondary': customColors.surface,
      '--accent': customColors.accent,
      '--accent-light': customColors.glow,
    };
    Object.entries(customVariables).forEach(([name, value]) => {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    });
    window.localStorage.setItem('aero-motion', motionEnabled ? 'on' : 'off');
  }, [theme, accent, motionEnabled, customColors]);

  useEffect(() => {
    const loadAppearance = async (userId: string) => {
      const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
      if (!data) return;
      const settings = data as UserSettings;
      setCustomColors(normalizeCustomColors(settings.custom_colors));
      const assets = supabase.storage.from('user-assets');
      const [avatar, background] = await Promise.all([
        settings.avatar_path ? assets.createSignedUrl(settings.avatar_path, 3600) : Promise.resolve({ data: null }),
        settings.background_path ? assets.createSignedUrl(settings.background_path, 3600) : Promise.resolve({ data: null }),
      ]);
      setAvatarUrl(avatar.data?.signedUrl || null);
      setBackgroundUrl(background.data?.signedUrl || null);
      setTheme(settings.theme as Theme);
      setAccent(settings.accent_color as AccentColor);
    };

    const loadUser = async (session: Session | null) => {
      if (!session) {
        setUser(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle();
      const fallbackUsername = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user';
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        username: profile?.username || fallbackUsername,
      });
    };

    supabase.auth.getSession().then(({ data }) => {
      void loadUser(data.session);
      if (data.session) void loadAppearance(data.session.user.id);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        await loadUser(session);
        if (session) {
          await loadAppearance(session.user.id);
        } else {
          setAvatarUrl(null);
          setBackgroundUrl(null);
          setCustomColors({});
        }
      })();
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleThemeChange = useCallback((newTheme: Theme) => setTheme(newTheme), []);
  const handleAccentChange = useCallback((newAccent: AccentColor) => setAccent(newAccent), []);

  if (isBooting) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5" style={{ background: '#020711', color: '#e7f5ff' }}>
        <img src="/winded copy.png" alt="WINDED DEVS" className="h-28 w-28 object-contain animate-pulse" />
        <div className="text-center">
          <p className="text-sm font-semibold tracking-[0.32em]">WINDED DEVS</p>
          <p className="mt-2 text-xs" style={{ color: '#8eabc5' }}>Starting aero.</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'home' as ViewId, label: 'Home', icon: Home },
    { id: 'browser' as ViewId, label: 'Browser', icon: Globe },
    { id: 'chat' as ViewId, label: 'Chat', icon: MessageSquare },
    { id: 'movies' as ViewId, label: 'Movies', icon: Film },
    { id: 'games' as ViewId, label: 'Games', icon: GamepadIcon },
    { id: 'jsdelivr' as ViewId, label: 'GitHub Links', icon: Github },
    { id: 'settings' as ViewId, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="aero-app-shell flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="aero-user-background" aria-hidden="true" style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined} />
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} activeView={activeView} onViewChange={setActiveView} navItems={navItems} user={user} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 h-12 border-b shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}><Menu size={20} /></button>}
          <h1 className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>aero.<span className="opacity-50"> / {VIEW_LABELS[activeView]}</span></h1>
        </header>
        <div className="flex-1 overflow-hidden">
          {activeView === 'home' && <HomeView onNavigate={setActiveView} />}
          {activeView === 'browser' && <BrowserView initialUrl={browserTarget} />}
          {activeView === 'chat' && <ChatView user={user} />}
          {activeView === 'settings' && <SettingsView theme={theme} accent={accent} motionEnabled={motionEnabled} avatarUrl={avatarUrl} backgroundUrl={backgroundUrl} customColors={customColors} onThemeChange={handleThemeChange} onAccentChange={handleAccentChange} onMotionChange={setMotionEnabled} onAvatarUrlChange={setAvatarUrl} onBackgroundUrlChange={setBackgroundUrl} onCustomColorsChange={setCustomColors} user={user} />}
          {activeView === 'movies' && <MoviesView onOpenInBrowser={() => { setBrowserTarget('https://watch.spencerdevs.xyz/'); setActiveView('browser'); }} />}
          {activeView === 'games' && <GamesView />}
          {activeView === 'jsdelivr' && <JsdelivrGenerator />}
        </div>
      </main>
    </div>
  );
}
