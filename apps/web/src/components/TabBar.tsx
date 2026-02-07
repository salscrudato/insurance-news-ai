import { FC } from 'react';

type TabId = 'today' | 'feed' | 'ask' | 'saved' | 'settings';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'today', label: 'Today', icon: '📅' },
  { id: 'feed', label: 'Feed', icon: '📰' },
  { id: 'ask', label: 'Ask', icon: '❓' },
  { id: 'saved', label: 'Saved', icon: '💾' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const TabBar: FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-separator bg-surface"
      style={{
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
              activeTab === tab.id
                ? 'text-accent'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-caption">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default TabBar;

