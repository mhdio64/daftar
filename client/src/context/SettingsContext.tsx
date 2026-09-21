import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AlertSettings {
  enableAlerts: boolean;
  cronEnabled: boolean;
  cronTime: string;
  alertDaysBefore: number[];
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly';
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
    apiRoot: string;
  };
  discord: {
    enabled: boolean;
    webhookUrl: string;
    username: string;
  };
  bale: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
  webhook: {
    enabled: boolean;
    url: string;
    secretHeader: string;
    secretValue: string;
  };
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: string;
    secure: boolean;
    username: string;
    password: string;
    fromEmail: string;
    toEmails: string;
  };
  sms: {
    enabled: boolean;
    provider: 'kavenegar' | 'farazsms' | 'generic';
    apiKey: string;
    lineNumber: string;
    recipients: string;
    webhookUrl: string;
  };
}

export interface AppSettings {
  enableQuickConnect: boolean;
  defaultSshPort: string;
  defaultWebProtocol: 'https' | 'http';
  autoHideSecretSeconds: number;
  defaultDensity: 'compact' | 'comfortable';
  theme: 'light' | 'dark';
  enableStrengthMeter: boolean;
  alerts: AlertSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  enableQuickConnect: true,
  defaultSshPort: '22',
  defaultWebProtocol: 'https',
  autoHideSecretSeconds: 30,
  defaultDensity: 'compact',
  theme: 'light',
  enableStrengthMeter: true,
  alerts: {
    enableAlerts: false,
    cronEnabled: true,
    cronTime: '09:00',
    alertDaysBefore: [30, 7, 1, 0],
    digestEnabled: true,
    digestFrequency: 'weekly',
    telegram: {
      enabled: false,
      botToken: '',
      chatId: '',
      apiRoot: 'https://api.telegram.org',
    },
    discord: {
      enabled: false,
      webhookUrl: '',
      username: 'سامانه دفتر',
    },
    bale: {
      enabled: false,
      botToken: '',
      chatId: '',
    },
    webhook: {
      enabled: false,
      url: '',
      secretHeader: 'Authorization',
      secretValue: '',
    },
    email: {
      enabled: false,
      smtpHost: 'smtp.gmail.com',
      smtpPort: '587',
      secure: false,
      username: '',
      password: '',
      fromEmail: 'noreply@daftar.local',
      toEmails: '',
    },
    sms: {
      enabled: false,
      provider: 'generic',
      apiKey: '',
      lineNumber: '',
      recipients: '',
      webhookUrl: '',
    },
  },
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = 'daftar_app_settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          alerts: {
            ...DEFAULT_SETTINGS.alerts,
            ...(parsed.alerts || {}),
            telegram: { ...DEFAULT_SETTINGS.alerts.telegram, ...(parsed.alerts?.telegram || {}) },
            discord: { ...DEFAULT_SETTINGS.alerts.discord, ...(parsed.alerts?.discord || {}) },
            bale: { ...DEFAULT_SETTINGS.alerts.bale, ...(parsed.alerts?.bale || {}) },
            webhook: { ...DEFAULT_SETTINGS.alerts.webhook, ...(parsed.alerts?.webhook || {}) },
            email: { ...DEFAULT_SETTINGS.alerts.email, ...(parsed.alerts?.email || {}) },
            sms: { ...DEFAULT_SETTINGS.alerts.sms, ...(parsed.alerts?.sms || {}) },
          },
        };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated: AppSettings = {
        ...prev,
        ...newSettings,
        ...(newSettings.alerts
          ? {
              alerts: {
                ...prev.alerts,
                ...newSettings.alerts,
              },
            }
          : {}),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        if (newSettings.theme) {
          localStorage.setItem('daftar_theme', newSettings.theme);
        }
        if (newSettings.defaultDensity) {
          localStorage.setItem('daftar_density', newSettings.defaultDensity);
        }
      } catch {
        // storage disabled or quota exceeded
      }
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem('daftar_theme', DEFAULT_SETTINGS.theme);
      localStorage.setItem('daftar_density', DEFAULT_SETTINGS.defaultDensity);
    } catch {
      // ignore
    }
  };

  // هماهنگی اولیه با کلاس dark در تگ ریشه
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
