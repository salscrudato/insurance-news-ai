import { useState } from 'react';

export default function SettingsView() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <h1 className="text-display-large mb-6">Settings</h1>

      <div className="space-y-4">
        {/* Theme Section */}
        <div className="rounded-lg bg-surface-secondary border border-separator overflow-hidden">
          <div className="p-4 border-b border-separator">
            <h2 className="text-headline">Appearance</h2>
          </div>
          <div className="p-4 space-y-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <label key={t} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={t}
                  checked={theme === t}
                  onChange={(e) =>
                    setTheme(e.target.value as 'light' | 'dark' | 'system')
                  }
                  className="w-4 h-4"
                />
                <span className="capitalize text-body">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notifications Section */}
        <div className="rounded-lg bg-surface-secondary border border-separator overflow-hidden">
          <div className="p-4 border-b border-separator">
            <h2 className="text-headline">Notifications</h2>
          </div>
          <div className="p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-body">Enable notifications</span>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>
        </div>

        {/* About Section */}
        <div className="rounded-lg bg-surface-secondary border border-separator overflow-hidden">
          <div className="p-4 border-b border-separator">
            <h2 className="text-headline">About</h2>
          </div>
          <div className="p-4 space-y-2 text-body-secondary">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="text-text-secondary">0.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

