import { useState, useEffect } from 'react';
import api from '../api/client';
import { Toast } from '../components/Toast';

export function Bucket() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/bucket').then(({ data }) => setItems(data)).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status, visitedAt) => {
    try {
      const { data } = await api.patch(`/bucket/${id}`, { status, visitedAt });
      setItems((prev) => prev.map((i) => (i._id === id ? data : i)));
      setToast({ message: 'Marked as visited!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Update failed', type: 'error' });
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove from bucket list?')) return;
    try {
      await api.delete(`/bucket/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
      setToast({ message: 'Removed from bucket list', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to remove', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span>Loading your bucket list…</span>
      </div>
    );
  }

  const want = items.filter((i) => i.status === 'want-to-visit');
  const visited = items.filter((i) => i.status === 'visited');

  return (
    <div className="page-bucket">
      <h1 className="page-title">My Bucket List</h1>
      <p className="page-subtitle">Places you want to visit and places you've been.</p>
      <h2 className="bucket-section-title">Want to visit ({want.length})</h2>
      <div className="bucket-list">
        {want.map((item) => (
          <div key={item._id} className="bucket-item">
            <div>
              <h3>{item.destination?.name}</h3>
              <p className="dest-meta">{item.destination?.state} • {item.destination?.budget}</p>
            </div>
            <div className="bucket-actions">
              <button className="btn-print btn-sm" onClick={() => updateStatus(item._id, 'visited', new Date().toISOString())}>
                ✓ Mark Visited
              </button>
              <button className="btn-outline btn-sm" onClick={() => remove(item._id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="bucket-section-title">Visited ({visited.length})</h2>
      <div className="bucket-list">
        {visited.map((item) => (
          <div key={item._id} className="bucket-item bucket-item-visited">
            <div>
              <h3>{item.destination?.name}</h3>
              <p className="dest-meta">{item.destination?.state}</p>
              {item.visitedAt && <p className="visited-at">Visited {new Date(item.visitedAt).toLocaleDateString()}</p>}
            </div>
            <button className="btn-outline btn-sm" onClick={() => remove(item._id)}>Remove</button>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="bucket-empty">
          <p>Your bucket list is empty.</p>
          <p>Add destinations from Browse or Suggestions to get started.</p>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
