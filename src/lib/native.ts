// Capacitor wrappers — no-ops on web, native calls on iOS/Android.
// All imports are dynamic so the bundler doesn't pull native SDK code into web build.

import type { ImpactOptions } from '@capacitor/haptics';

let capPromise: Promise<typeof import('@capacitor/core') | null> | null = null;
function loadCap() {
  if (!capPromise) capPromise = import('@capacitor/core').catch(() => null);
  return capPromise;
}

export async function isNative(): Promise<boolean> {
  const mod = await loadCap();
  if (!mod) return false;
  try {
    return mod.Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function hapticLight(): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light } as ImpactOptions);
  } catch {
    /* ignore */
  }
}

export async function hapticMedium(): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium } as ImpactOptions);
  } catch {
    /* ignore */
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* ignore */
  }
}

export async function hapticWarning(): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    /* ignore */
  }
}

export async function hapticError(): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    /* ignore */
  }
}

export async function applyStatusBarTheme(theme: 'light' | 'dark'): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0d0d0d' : '#ffffff' });
  } catch {
    /* ignore */
  }
}

export async function hideSplash(): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }
}
