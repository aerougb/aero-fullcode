import { useCallback, useEffect, useState } from 'react';
import { AtSign, Check, Eye, EyeOff, Image, Lock, LogOut, Palette, Shield, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { normalizeCustomColors } from '@/lib/appearance';
import type { AccentColor, CustomColors, Theme, UserSettings } from '@/types';

interface SettingsUser { id: string; email: string; username: string }
interface SettingsViewProps {
  theme: Theme;
  accent: AccentColor;
  motionEnabled: boolean;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  customColors: CustomColors;
  onThemeChange: (theme: Theme) => void;
  onAccentChange: (accent: AccentColor) => void;
  onMotionChange: (enabled: boolean) => void;
  onAvatarUrlChange: (url: string) => void;
  onBackgroundUrlChange: (url: string) => void;
  onCustomColorsChange: (colors: CustomColors) => void;
  user: SettingsUser | null;
}

const THEMES: { id: Theme; label: string; preview: string }[] = [
  { id: 'dark', label: 'Aero Blue', preview: '#050a14' },
  { id: 'light', label: 'Light', preview: '#f8f9fa' },
  { id: 'midnight', label: 'Midnight', preview: '#050814' },
  { id: 'sunset', label: 'Sunset', preview: '#1a0a0a' },
  { id: 'forest', label: 'Forest', preview: '#0a1410' },
];
const ACCENTS: { id: AccentColor; label: string; color: string }[] = [
  { id: 'blue', label: 'Aero Blue', color: '#2d8cff' },
  { id: 'cyan', label: 'Cyan', color: '#06b6d4' },
  { id: 'emerald', label: 'Emerald', color: '#10b981' },
  { id: 'amber', label: 'Amber', color: '#f59e0b' },
  { id: 'rose', label: 'Rose', color: '#f43f5e' },
];
type AuthMode = 'signin' | 'signup';
type AssetKind = 'avatar' | 'background';
type EditableSetting = 'privacy_clear_on_exit' | 'privacy_block_trackers' | 'privacy_dnt' | 'theme' | 'accent_color';

export default function SettingsView({
  theme,
  accent,
  motionEnabled,
  avatarUrl,
  backgroundUrl,
  customColors,
  onThemeChange,
  onAccentChange,
  onMotionChange,
  onAvatarUrlChange,
  onBackgroundUrlChange,
  onCustomColorsChange,
  user,
}: SettingsViewProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [privacySettings, setPrivacySettings] = useState<UserSettings>({
    theme: 'dark', accent_color: 'blue', privacy_clear_on_exit: false, privacy_block_trackers: true, privacy_dnt: true,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetLoading, setAssetLoading] = useState<AssetKind | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      const settings = data as UserSettings;
      setPrivacySettings(settings);
      onThemeChange(settings.theme);
      onAccentChange(settings.accent_color);
      onCustomColorsChange(normalizeCustomColors(settings.custom_colors));
    });
  }, [onAccentChange, onCustomColorsChange, onThemeChange, user]);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    const normalizedUsername = username.trim().toLowerCase();
    try {
      if (authMode === 'signup') {
        if (!/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(normalizedUsername)) throw new Error('Username must be 3–30 characters using letters, numbers, dots, dashes, or underscores.');
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: normalizedUsername } } });
        if (error) throw error;
        setAuthSuccess('Account created. You are now signed in.');
      } else {
        const { data: loginEmail, error: lookupError } = await supabase.rpc('lookup_email_by_username', { p_username: normalizedUsername });
        if (lookupError || typeof loginEmail !== 'string') throw new Error('Invalid username or password.');
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw new Error('Invalid username or password.');
        setAuthSuccess('Signed in successfully.');
      }
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthSuccess(null);
  };

  const saveSettings = useCallback(async (updated: UserSettings): Promise<boolean> => {
    if (!user) return false;
    setPrivacySettings(updated);
    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      theme: updated.theme,
      accent_color: updated.accent_color,
      privacy_clear_on_exit: updated.privacy_clear_on_exit,
      privacy_block_trackers: updated.privacy_block_trackers,
      privacy_dnt: updated.privacy_dnt,
      avatar_path: updated.avatar_path || null,
      background_path: updated.background_path || null,
      custom_colors: updated.custom_colors || {},
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setAssetError('Could not save your appearance settings.');
      return false;
    }
    setSettingsSaved(true);
    window.setTimeout(() => setSettingsSaved(false), 2000);
    return true;
  }, [user]);

  const saveField = useCallback(async (key: EditableSetting, value: boolean | string) => {
    const updated = { ...privacySettings, [key]: value } as UserSettings;
    await saveSettings(updated);
  }, [privacySettings, saveSettings]);

  const handleColorChange = (key: keyof CustomColors, value: string) => {
    const nextColors = normalizeCustomColors({ ...customColors, [key]: value });
    onCustomColorsChange(nextColors);
    void saveSettings({ ...privacySettings, custom_colors: nextColors });
  };

  const uploadAsset = async (kind: AssetKind, file: File) => {
    if (!user) return;
    const maxBytes = kind === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    const extensionByType: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const extension = extensionByType[file.type];
    if (!extension || file.size > maxBytes) {
      setAssetError(`Choose a PNG, JPG, or WebP image under ${kind === 'avatar' ? '5' : '10'} MB.`);
      return;
    }
    setAssetError(null);
    setAssetLoading(kind);
    const path = `${user.id}/${kind}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('user-assets').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
    if (uploadError) {
      setAssetError('Could not upload that image. Please try again.');
      setAssetLoading(null);
      return;
    }
    const updated = { ...privacySettings, [`${kind}_path`]: path } as UserSettings;
    const saved = await saveSettings(updated);
    if (!saved) {
      setAssetLoading(null);
      return;
    }
    const { data: signedAsset } = await supabase.storage.from('user-assets').createSignedUrl(path, 3600);
    if (signedAsset?.signedUrl) {
      if (kind === 'avatar') onAvatarUrlChange(signedAsset.signedUrl);
      else onBackgroundUrlChange(signedAsset.signedUrl);
    }
    setAssetLoading(null);
  };

  const handleFileChange = (kind: AssetKind, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadAsset(kind, file);
  };

  return (
    <div className="h-full overflow-y-auto p-6 animate-fade-in">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="overflow-hidden rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}><User size={18} style={{ color: 'var(--accent)' }} /><h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Account</h2></div>
          <div className="p-5">{user ? <div className="flex items-center gap-3">
            {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold" style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>{user.username.charAt(0).toUpperCase()}</div>}
            <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>@{user.username}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p></div>
            <button onClick={handleSignOut} className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}><LogOut size={14} />Sign Out</button>
          </div> : <div>
            <div className="mb-4 flex gap-2"><button onClick={() => setAuthMode('signin')} className="flex-1 rounded-lg py-2 text-sm font-medium" style={{ background: authMode === 'signin' ? 'var(--accent)' : 'var(--bg-tertiary)', color: authMode === 'signin' ? 'var(--bg-primary)' : 'var(--text-secondary)' }}>Sign In</button><button onClick={() => setAuthMode('signup')} className="flex-1 rounded-lg py-2 text-sm font-medium" style={{ background: authMode === 'signup' ? 'var(--accent)' : 'var(--bg-tertiary)', color: authMode === 'signup' ? 'var(--bg-primary)' : 'var(--text-secondary)' }}>Sign Up</button></div>
            <form onSubmit={handleAuth} className="space-y-3"><div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: 'var(--bg-tertiary)' }}><AtSign size={16} style={{ color: 'var(--text-muted)' }} /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" required className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /></div>{authMode === 'signup' && <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: 'var(--bg-tertiary)' }}><AtSign size={16} style={{ color: 'var(--text-muted)' }} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email for account recovery" required className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /></div>}<div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: 'var(--bg-tertiary)' }}><Lock size={16} style={{ color: 'var(--text-muted)' }} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required minLength={6} className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} /><button type="button" onClick={() => setShowPassword(!showPassword)} style={{ color: 'var(--text-muted)' }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{authError && <p className="text-xs" style={{ color: '#f43f5e' }}>{authError}</p>}{authSuccess && <p className="text-xs" style={{ color: 'var(--accent)' }}>{authSuccess}</p>}<button type="submit" disabled={authLoading} className="w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>{authLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}</button></form>
          </div>}</div>
        </section>

        {user && <section className="overflow-hidden rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}><Image size={18} style={{ color: 'var(--accent)' }} /><h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Personalize aero.</h2></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <UploadCard label="Profile picture" description="PNG, JPG, or WebP · 5 MB max" preview={avatarUrl} inputId="avatar-upload" loading={assetLoading === 'avatar'} onChange={(event) => handleFileChange('avatar', event)} />
            <UploadCard label="Site background" description="PNG, JPG, or WebP · 10 MB max" preview={backgroundUrl} inputId="background-upload" loading={assetLoading === 'background'} onChange={(event) => handleFileChange('background', event)} />
          </div>
          <div className="grid gap-3 border-t p-5 sm:grid-cols-4" style={{ borderColor: 'var(--border)' }}>
            <ColorControl label="Page color" value={customColors.background || '#050a14'} onChange={(value) => handleColorChange('background', value)} />
            <ColorControl label="Panel color" value={customColors.surface || '#0a1424'} onChange={(value) => handleColorChange('surface', value)} />
            <ColorControl label="Accent color" value={customColors.accent || '#2d8cff'} onChange={(value) => handleColorChange('accent', value)} />
            <ColorControl label="Glow color" value={customColors.glow || '#9bd3ff'} onChange={(value) => handleColorChange('glow', value)} />
          </div>
          {assetError && <p className="px-5 pb-4 text-xs" style={{ color: '#f43f5e' }}>{assetError}</p>}
        </section>}

        <section className="overflow-hidden rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}><div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}><Palette size={18} style={{ color: 'var(--accent)' }} /><h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Theme</h2></div><div className="space-y-4 p-5"><div><p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>Color theme</p><div className="grid grid-cols-5 gap-2">{THEMES.map((item) => <button key={item.id} onClick={() => { onThemeChange(item.id); void saveField('theme', item.id); }} className="flex flex-col items-center gap-1.5 rounded-lg p-2" style={{ border: `2px solid ${theme === item.id ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg-tertiary)' }}><div className="h-8 w-8 rounded-full" style={{ background: item.preview, border: '1px solid var(--border)' }} /><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</span></button>)}</div></div><div><p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>Accent color</p><div className="flex gap-2">{ACCENTS.map((item) => <button key={item.id} onClick={() => { onAccentChange(item.id); void saveField('accent_color', item.id); }} className="flex flex-col items-center gap-1 rounded-lg p-2" style={{ border: `2px solid ${accent === item.id ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg-tertiary)' }}><div className="h-8 w-8 rounded-full" style={{ background: item.color }} /><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</span></button>)}</div></div><div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}><PrivacyToggle label="Animated backgrounds" description="Add gentle motion across the app" checked={motionEnabled} onChange={onMotionChange} /></div></div></section>

        <section className="overflow-hidden rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}><div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}><Shield size={18} style={{ color: 'var(--accent)' }} /><h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Privacy</h2></div><div className="space-y-4 p-5"><PrivacyToggle label="Block trackers" description="Prevent third-party tracking scripts from loading" checked={privacySettings.privacy_block_trackers} onChange={(value) => void saveField('privacy_block_trackers', value)} disabled={!user} /><PrivacyToggle label="Send Do Not Track" description="Add a DNT header to outgoing requests" checked={privacySettings.privacy_dnt} onChange={(value) => void saveField('privacy_dnt', value)} disabled={!user} /><PrivacyToggle label="Clear data on exit" description="Automatically clear browsing data when you close aero." checked={privacySettings.privacy_clear_on_exit} onChange={(value) => void saveField('privacy_clear_on_exit', value)} disabled={!user} />{!user && <p className="pt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Sign in to save privacy preferences across devices.</p>}{settingsSaved && <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--accent)' }}><Check size={14} />Settings saved</div>}</div></section>
      </div>
    </div>
  );
}

function UploadCard({ label, description, preview, inputId, loading, onChange }: { label: string; description: string; preview: string | null; inputId: string; loading: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <div className="rounded-xl p-3" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}><div className="mb-3 flex items-center gap-3">{preview ? <img src={preview} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--bg-hover)', color: 'var(--accent)' }}><Image size={20} /></div>}<div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{description}</p></div></div><label htmlFor={inputId} className="block cursor-pointer rounded-lg px-3 py-2 text-center text-xs font-semibold transition-opacity hover:opacity-80" style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>{loading ? 'Uploading...' : preview ? 'Replace image' : 'Choose image'}</label><input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" onChange={onChange} className="hidden" /></div>;
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: 'var(--bg-tertiary)' }}><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" /></label>;
}

function PrivacyToggle({ label, description, checked, onChange, disabled }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <div className="flex items-center justify-between gap-4"><div className="flex-1"><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p><p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p></div><button onClick={() => !disabled && onChange(!checked)} disabled={disabled} className="relative h-6 w-11 shrink-0 rounded-full disabled:opacity-40" style={{ background: checked ? 'var(--accent)' : 'var(--bg-hover)' }}><div className="absolute top-0.5 h-5 w-5 rounded-full bg-white" style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }} /></button></div>;
}
