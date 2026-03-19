import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';
import { DestCard } from '../components/DestCard';

export function Destinations() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, totalPages: 0 });
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('');
  const [state, setState] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [page, setPage] = useState(1);
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [bucketStatuses, setBucketStatuses] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    api.get('/destinations/states').then(({ data: s }) => setStates(s));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (tier) params.tier = tier;
    if (state) params.state = state;
    if (maxBudget) params.maxBudget = maxBudget;
    api.get('/destinations', { params })
      .then(({ data: d }) => {
        setData(d);
        // Fetch bucket statuses for these destinations
        if (user && d.data.length) {
          const ids = d.data.map((dest) => dest._id).join(',');
          api.get(`/bucket/status?destinationIds=${ids}`)
            .then(({ data: statusMap }) => setBucketStatuses(statusMap))
            .catch(() => setBucketStatuses({}));
        }
      })
      .finally(() => setLoading(false));
  }, [page, tier, state, maxBudget, user]);

  const addToBucket = async (destId) => {
    setAddingId(destId);
    try {
      await api.post('/bucket', { destinationId: destId });
      setToast({ message: 'Added to bucket list!', type: 'success' });
      // Update bucket status locally
      setBucketStatuses((prev) => ({
        ...prev,
        [destId]: { status: 'want-to-visit', visitedAt: null },
      }));
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to add', type: 'error' });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="page-destinations">
      <h1 className="page-title">Browse Destinations</h1>
      <p className="page-subtitle">Discover places across India. Filter by budget and state.</p>
      <div className="filters">
        <select value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }}>
          <option value="">All budgets</option>
          <option value="budget">Budget (&lt;₹5k)</option>
          <option value="mid">Mid (₹5–10k)</option>
          <option value="luxury">Luxury (&gt;₹10k)</option>
        </select>
        <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Max budget ₹"
          value={maxBudget}
          onChange={(e) => { setMaxBudget(e.target.value); setPage(1); }}
          min="0"
        />
      </div>

      {loading ? (
        <div className="loading-screen">
          <span>Loading destinations…</span>
        </div>
      ) : (
        <>
          <div className="card-grid">
            {data.data.map((d) => (
              <DestCard
                key={d._id}
                d={d}
                onAddToBucket={addToBucket}
                addingId={addingId}
                showAddButton
                user={user}
                bucketStatus={bucketStatuses[d._id]}
              />
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</button>
              <span>Page {page} of {data.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}>Next</button>
            </div>
          )}
        </>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
