export default function SavedView() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-display-large mb-2">Saved</h1>
      <p className="text-body-secondary text-text-secondary mb-6">
        Your saved articles and signals
      </p>

      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-surface-secondary border border-separator"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="h-4 bg-surface-tertiary rounded w-2/3"></div>
              <button className="text-text-tertiary hover:text-text-secondary">
                ✕
              </button>
            </div>
            <div className="h-3 bg-surface-tertiary rounded w-full mb-2"></div>
            <div className="h-3 bg-surface-tertiary rounded w-4/5 mb-3"></div>
            <div className="text-caption text-text-tertiary">
              Saved 2 days ago
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 text-center text-text-secondary">
        <p>No saved articles yet</p>
      </div>
    </div>
  );
}

