import { useState } from 'react';
import TabBar from './components/TabBar';
import TodayView from './views/TodayView';
import FeedView from './views/FeedView';
import AskView from './views/AskView';
import SavedView from './views/SavedView';
import SettingsView from './views/SettingsView';

type TabId = 'today' | 'feed' | 'ask' | 'saved' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('today');

  const renderView = () => {
    switch (activeTab) {
      case 'today':
        return <TodayView />;
      case 'feed':
        return <FeedView />;
      case 'ask':
        return <AskView />;
      case 'saved':
        return <SavedView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TodayView />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface text-text">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-safe">
        {renderView()}
      </main>

      {/* Bottom tab bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

