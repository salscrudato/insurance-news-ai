import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const tabs = [
    { id: 'today', label: 'Today', icon: '📅' },
    { id: 'feed', label: 'Feed', icon: '📰' },
    { id: 'ask', label: 'Ask', icon: '❓' },
    { id: 'saved', label: 'Saved', icon: '💾' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
];
const TabBar = ({ activeTab, onTabChange }) => {
    return (_jsx("nav", { className: "fixed bottom-0 left-0 right-0 border-t border-separator bg-surface", style: {
            paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        }, children: _jsx("div", { className: "flex justify-around items-center h-16", children: tabs.map((tab) => (_jsxs("button", { onClick: () => onTabChange(tab.id), className: `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${activeTab === tab.id
                    ? 'text-accent'
                    : 'text-text-tertiary hover:text-text-secondary'}`, "aria-label": tab.label, "aria-current": activeTab === tab.id ? 'page' : undefined, children: [_jsx("span", { className: "text-xl", children: tab.icon }), _jsx("span", { className: "text-caption", children: tab.label })] }, tab.id))) }) }));
};
export default TabBar;
