import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import TabBar from './components/TabBar';
import TodayView from './views/TodayView';
import FeedView from './views/FeedView';
import AskView from './views/AskView';
import SavedView from './views/SavedView';
import SettingsView from './views/SettingsView';
export default function App() {
    const [activeTab, setActiveTab] = useState('today');
    const renderView = () => {
        switch (activeTab) {
            case 'today':
                return _jsx(TodayView, {});
            case 'feed':
                return _jsx(FeedView, {});
            case 'ask':
                return _jsx(AskView, {});
            case 'saved':
                return _jsx(SavedView, {});
            case 'settings':
                return _jsx(SettingsView, {});
            default:
                return _jsx(TodayView, {});
        }
    };
    return (_jsxs("div", { className: "flex flex-col h-screen bg-surface text-text", children: [_jsx("main", { className: "flex-1 overflow-y-auto pb-safe", children: renderView() }), _jsx(TabBar, { activeTab: activeTab, onTabChange: setActiveTab })] }));
}
