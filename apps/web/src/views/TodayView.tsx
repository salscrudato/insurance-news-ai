export default function TodayView() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-display-large mb-2">Today</h1>
      <p className="text-body-secondary text-text-secondary mb-6">
        Your daily insurance news digest
      </p>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-surface-secondary border border-separator"
          >
            <div className="h-4 bg-surface-tertiary rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-surface-tertiary rounded w-full mb-2"></div>
            <div className="h-3 bg-surface-tertiary rounded w-5/6"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

