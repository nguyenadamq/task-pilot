function CurrentTaskPanel({ blocks, isSaving, onExtendBlock }) {
  const now = new Date();
  const orderedBlocks = [...blocks].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const current = orderedBlocks.find((block) => new Date(block.start_at) <= now && new Date(block.end_at) > now);
  const next = orderedBlocks.find((block) => new Date(block.start_at) > now);

  return (
    <section className="panel live-panel">
      <div>
        <h2>Now</h2>
        {current ? (
          <>
            <h3>{current.title}</h3>
            <p className="meta-line">
              Until {formatTime(current.end_at)} | {current.duration_minutes} min
            </p>
          </>
        ) : (
          <p className="meta-line">No active task block.</p>
        )}
      </div>
      <div>
        <h2>Next</h2>
        {next ? (
          <>
            <h3>{next.title}</h3>
            <p className="meta-line">{formatDateTime(next.start_at)}</p>
          </>
        ) : (
          <p className="meta-line">Nothing else scheduled.</p>
        )}
      </div>
      {current ? (
        <div className="button-row">
          <button className="secondary-button" type="button" disabled={isSaving} onClick={() => onExtendBlock(current.id, 15)}>
            Extend 15 min
          </button>
          <button className="secondary-button" type="button" disabled={isSaving} onClick={() => onExtendBlock(current.id, 30)}>
            Extend 30 min
          </button>
        </div>
      ) : null}
    </section>
  );
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default CurrentTaskPanel;
