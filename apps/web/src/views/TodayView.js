import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function TodayView() {
    return (_jsxs("div", { className: "p-4 max-w-2xl mx-auto", children: [_jsx("h1", { className: "text-display-large mb-2", children: "Today" }), _jsx("p", { className: "text-body-secondary text-text-secondary mb-6", children: "Your daily insurance news digest" }), _jsx("div", { className: "space-y-3", children: [1, 2, 3].map((i) => (_jsxs("div", { className: "p-4 rounded-lg bg-surface-secondary border border-separator", children: [_jsx("div", { className: "h-4 bg-surface-tertiary rounded w-3/4 mb-3" }), _jsx("div", { className: "h-3 bg-surface-tertiary rounded w-full mb-2" }), _jsx("div", { className: "h-3 bg-surface-tertiary rounded w-5/6" })] }, i))) })] }));
}
