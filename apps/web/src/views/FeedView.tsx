export default function FeedView() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-display-large mb-2">Feed</h1>
      <p className="text-body-secondary text-text-secondary mb-6">
        All news signals from your sources
      </p>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-surface-secondary border border-separator hover:bg-surface-tertiary transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="h-4 bg-surface-tertiary rounded w-1/2"></div>
              <div className="h-3 bg-surface-tertiary rounded w-12"></div>
            </div>
            <div className="h-3 bg-surface-tertiary rounded w-full mb-2"></div>
            <div className="h-3 bg-surface-tertiary rounded w-4/5"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

