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
  await waitForGlobals();

  const registration = await navigator.serviceWorker.register('/sw.js?v=20261005-v3', { scope: '/' });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) await waitForController(registration);
  if (!navigator.serviceWorker.controller) throw new Error('Scramjet service worker is not controlling this page');

  const BareMux = window.BareMux;
  if (!BareMux) throw new Error('BareMux v2 is unavailable');
  const connection = new BareMux.BareMuxConnection('/baremux/worker.js');
  const wispUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/wisp/`;
  await connection.setTransport('/epoxy/index.mjs', [{ wisp: wispUrl }]);
  scramjetInitialized = true;
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
    const timeout = window.setTimeout(() => reject(new Error('Scramjet v2 assets failed to load')), 10000);
    const check = () => {
      if (window.__scramjet$bundle && window.BareMux) {
        window.clearTimeout(timeout);
        resolve();
        return;
      }
      window.requestAnimationFrame(check);
    };
    check();
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
