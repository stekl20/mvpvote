import VoterTable from '../components/VoterTable';

export default function Explorer() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Voter Explorer</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Browse all 100 ballots. Filter by outlet type or NBA market. Click any row to expand the full ballot.
        </p>
      </div>
      <VoterTable />
    </div>
  );
}
