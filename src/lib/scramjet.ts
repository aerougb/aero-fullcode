let scramjetInitialized = false;
let initPromise: Promise<void> | null = null;

declare global {
  interface Window {
    __scramjet$bundle?: {
      rewriters: { url: { encodeUrl(url: string): string } };
    };
    BareMux?: { BareMuxConnection: new (path: string) => BareMuxConnectionInstance };
  }
}

interface BareMuxConnectionInstance {
  setTransport(path: string, options: unknown[]): Promise<void>;
}

export async function initScramjet(): Promise<void> {
  if (scramjetInitialized) return;
  if (initPromise) return initPromise;
  initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<void> {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers are not supported in this browser');

  console.log('[scramjet] waiting for globals...');
  await waitForGlobals();
  console.log('[scramjet] globals ready');

  const registration = await navigator.serviceWorker.register('/sw.js?v=20261009-v7', { scope: '/', updateViaCache: 'none' });
  console.log('[scramjet] SW registered');
  await navigator.serviceWorker.ready;
  console.log('[scramjet] SW ready, controller:', !!navigator.serviceWorker.controller);

  if (!navigator.serviceWorker.controller && registration.active) {
    const reloadKey = 'aero-service-worker-reloaded-v7';
    if (window.sessionStorage.getItem(reloadKey) !== '1') {
      window.sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
      await new Promise<void>(() => undefined);
    }
  }
  if (!navigator.serviceWorker.controller) await waitForController(registration);
  if (!navigator.serviceWorker.controller) throw new Error('Scramjet service worker is not controlling this page');
  window.sessionStorage.removeItem('aero-service-worker-reloaded-v7');
  console.log('[scramjet] SW controlling page');

  const BareMux = window.BareMux;
  if (!BareMux) throw new Error('BareMux v2 is unavailable');
  const connection = new BareMux.BareMuxConnection('/baremux/worker.js');

  // The deployed host is static (no Node server), so the local /wisp/ endpoint
  // doesn't exist. Try local first (works in dev), then fall back to the public
  // Mercury Workshop Wisp server.
  const localWisp = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/wisp/`;
  const publicWisp = 'wss://wisp.mercurywork.shop/';

  const tryTransport = async (wispUrl: string): Promise<boolean> => {
    try {
      console.log('[scramjet] trying Wisp:', wispUrl);
      await connection.setTransport('/libcurl/browser.js', [{ wisp: wispUrl }]);
      console.log('[scramjet] transport set via', wispUrl);
      return true;
    } catch (err) {
      console.warn('[scramjet] transport failed for', wispUrl, err);
      return false;
    }
  };

  // Try local first with a short timeout, then public
  const localOk = await Promise.race([
    tryTransport(localWisp),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
  ]);

  if (!localOk) {
    const publicOk = await Promise.race([
      tryTransport(publicWisp),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000)),
    ]);
    if (!publicOk) throw new Error('Could not connect to any Wisp proxy server');
  }

  scramjetInitialized = true;
  console.log('[scramjet] fully initialized');
}

function waitForController(registration: ServiceWorkerRegistration): Promise<void> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, 5000);
    const finish = () => {
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('controllerchange', finish);
      resolve();
    };
    navigator.serviceWorker.addEventListener('controllerchange', finish, { once: true });
    registration.update().catch(() => undefined);
  });
}

function waitForGlobals(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('Scramjet assets failed to load — check that /scram/ and /baremux/ files are served')),
      15000,
    );
    // Use setInterval instead of requestAnimationFrame so this works
    // even when the tab is backgrounded or RAF is throttled.
    const interval = window.setInterval(() => {
      if (window.__scramjet$bundle && window.BareMux) {
        window.clearInterval(interval);
        window.clearTimeout(timeout);
        resolve();
      }
    }, 100);
  });
}

export function isScramjetReady(): boolean {
  return scramjetInitialized;
}

export function encodeUrl(url: string): string {
  const bundle = window.__scramjet$bundle;
  if (!scramjetInitialized || !bundle) throw new Error('Scramjet is not initialized');
  return bundle.rewriters.url.encodeUrl(url);
}
