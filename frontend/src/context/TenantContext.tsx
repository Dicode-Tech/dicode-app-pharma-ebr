import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { tenantService } from '../services/api';
import { useAuth } from './AuthContext';
import type { TenantSettings } from '../types';

interface TenantContextValue {
  settings: TenantSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const DEFAULT_BRANDING = {
  '--brand-primary': '#2563eb',
  '--brand-primary-dark': '#1d4ed8',
  '--brand-primary-soft': '#dbeafe',
  '--badge-bg': '#d1fae5',
  '--badge-text': '#047857',
};

function applyBranding(branding?: TenantSettings['branding']) {
  const root = document.documentElement;
  const map = {
    '--brand-primary': branding?.primaryColor || DEFAULT_BRANDING['--brand-primary'],
    '--brand-primary-dark': branding?.primaryDarkColor || DEFAULT_BRANDING['--brand-primary-dark'],
    '--brand-primary-soft': branding?.primarySoftColor || DEFAULT_BRANDING['--brand-primary-soft'],
    '--badge-bg': branding?.badgeBackground || DEFAULT_BRANDING['--badge-bg'],
    '--badge-text': branding?.badgeText || DEFAULT_BRANDING['--badge-text'],
  } as Record<string, string>;
  Object.entries(map).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setSettings(null);
      applyBranding(undefined);
      return;
    }
    setLoading(true);
    try {
      const data = await tenantService.getSettings();
      setSettings(data);
      applyBranding(data.branding);
    } catch (err) {
      console.error('Failed to load tenant settings', err);
      setSettings(null);
      applyBranding(undefined);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <TenantContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
