import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';
import { DestCard } from '../components/DestCard';

export function Suggestions() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState('mid');
  const [maxBudget, setMaxBudget] = useState('');
  const [state, setState] = useState('');
  const [states, setStates] = useState([]);
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/destinations/states').then(({ data }) => setStates(data));
  }, []);

  const fetchSuggestions = () => {
    setLoading(true);
    const params = { tier };
    if (maxBudget) params.maxBudget = maxBudget;
    if (state) params.state = state;
    api.get('/destinations/suggestions', { params })
      .then(({ data }) => setDestinations(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const addToBucket = async (destId) => {
    setAddingId(destId);
    try {
      await api.post('/bucket', { destinationId: destId });
      setToast({ message: 'Added to bucket list!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to add', type: 'error' });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="page-suggestions">
      <h1 className="page-title">Suggestions</h1>
      <p className="page-subtitle">Get destination ideas based on your budget.</p>
      <div className="filters">
        <label>
          Budget tier
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="budget">Budget (&lt;₹5k/day)</option>
            <option value="mid">Mid (₹5–10k/day)</option>
            <option value="luxury">Luxury (&gt;₹10k/day)</option>
          </select>
        </label>
        <label>
          Max budget ₹
          <input
            type="number"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            placeholder="e.g. 8000"
            min="0"
          />
        </label>
        <label>
          State
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Any</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="btn-print" onClick={fetchSuggestions}>Get Suggestions</button>
      </div>

      {loading ? (
        <div className="loading-screen">
          <span>Finding suggestions…</span>
        </div>
      ) : (
        <div className="card-grid">
          {destinations.map((d) => (
            <DestCard
              key={d._id}
              d={d}
              onAddToBucket={addToBucket}
              addingId={addingId}
              showAddButton
              user={user}
            />
          ))}
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
