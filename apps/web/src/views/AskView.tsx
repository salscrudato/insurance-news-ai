export default function AskView() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-display-large mb-2">Ask</h1>
      <p className="text-body-secondary text-text-secondary mb-6">
        Ask questions about insurance news
      </p>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-surface-secondary border border-separator">
          <textarea
            placeholder="Ask a question about insurance news..."
            className="w-full bg-surface text-text placeholder-text-tertiary border border-separator rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-accent"
            rows={4}
          />
          <button className="mt-3 w-full bg-accent text-white rounded-lg py-2 font-semibold hover:bg-accent-hover transition-colors">
            Ask
          </button>
        </div>

        <div className="p-4 rounded-lg bg-surface-secondary border border-separator">
          <div className="h-4 bg-surface-tertiary rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-surface-tertiary rounded w-full mb-2"></div>
          <div className="h-3 bg-surface-tertiary rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

