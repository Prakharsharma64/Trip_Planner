import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';

export function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [locState, setLocState] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/users/me').then(({ data }) => {
      setProfile(data);
      setName(data.name || '');
      setCity(data.location?.city || '');
      setLocState(data.location?.state || '');
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', {
        name,
        location: { city, state: locState },
      });
      setProfile(data);
      setToast({ message: 'Profile updated', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Update failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="loading-screen">
        <span>Loading profile…</span>
      </div>
    );
  }

  const stats = profile.bucketStats || { wantToVisit: 0, visited: 0 };

  return (
    <div className="page-profile">
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Manage your account and view your travel stats.</p>
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="stat-num">{stats.wantToVisit}</span>
          <span className="stat-lbl">To Visit</span>
        </div>
        <div className="profile-stat">
          <span className="stat-num">{stats.visited}</span>
          <span className="stat-lbl">Visited</span>
        </div>
      </div>
      <form onSubmit={handleSave} className="profile-form">
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Home City
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Jaipur"
          />
        </label>
        <label>
          Home State
          <input
            type="text"
            value={locState}
            onChange={(e) => setLocState(e.target.value)}
            placeholder="e.g. Rajasthan"
          />
        </label>
        <button type="submit" className="btn-print" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      <p className="profile-email">{profile.email}</p>
      {profile.location?.city && (
        <p className="profile-location">📍 {profile.location.city}{profile.location.state ? `, ${profile.location.state}` : ''}</p>
      )}
      {profile.role === 'admin' && <span className="badge-admin">Admin</span>}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
