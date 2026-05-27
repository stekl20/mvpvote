import StatsScatter from '../components/StatsScatter';

export default function Stats() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Stats vs. Votes</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Did the statistics predict the ballot results? Select a stat to compare it against total vote points received.
        </p>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '28px 32px' }}>
        <StatsScatter />
      </div>
    </div>
  );
}
