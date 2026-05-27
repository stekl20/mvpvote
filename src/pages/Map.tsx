import GeoMap from '../components/GeoMap';

export default function Map() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Voter Geography</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Where in North America did each MVP first-place pick come from?
        </p>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '28px 32px' }}>
        <GeoMap />
      </div>
    </div>
  );
}
