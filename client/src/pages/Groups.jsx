import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';

export function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  // Member selector
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    api.get('/groups')
      .then(({ data }) => setGroups(data))
      .finally(() => setLoading(false));
  }, []);

  // Search users as you type
  useEffect(() => {
    if (!memberSearch.trim()) { setMemberResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/users/search?email=${encodeURIComponent(memberSearch)}`)
        .then(({ data }) => {
          // Exclude self
          setMemberResults(data.filter(u => u._id !== user?._id));
        })
        .catch(() => setMemberResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [memberSearch, user]);

  const toggleMember = (u) => {
    setSelectedMembers(prev =>
      prev.some(m => m._id === u._id)
        ? prev.filter(m => m._id !== u._id)
        : [...prev, u]
    );
    setMemberSearch('');
    setMemberResults([]);
  };

  const removeMember = (id) =>
    setSelectedMembers(prev => prev.filter(m => m._id !== id));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const memberEmails = selectedMembers.map(m => m.email);
      const { data } = await api.post('/groups', { name: name.trim(), memberEmails });
      setGroups((prev) => [data, ...prev]);
      setName('');
      setSelectedMembers([]);
      setMemberSearch('');
      setShowForm(false);
      setToast({ message: 'Group created!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to create', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span>Loading groups…</span>
      </div>
    );
  }

  return (
    <div className="page-groups">
      <div className="page-groups-header">
        <div>
          <h1 className="page-title">Trip Expenses</h1>
          <p className="page-subtitle">Splitwise-style expense splitting for your trips.</p>
        </div>
        <button className="btn-print" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {showForm && (
        <form className="group-create-form" onSubmit={handleCreate}>
          <label>
            Group Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rajasthan Trip March 2026"
              required
            />
          </label>

          <div className="group-create-form-field">
            <span className="group-create-form-label">Add Members</span>

            {/* Selected member chips */}
            {selectedMembers.length > 0 && (
              <div className="member-chips">
                {selectedMembers.map(m => (
                  <span key={m._id} className="member-chip-selected">
                    {m.name}
                    <button type="button" onClick={() => removeMember(m._id)} aria-label="Remove">×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input + dropdown */}
            <div className="member-search-wrap" ref={searchRef}>
              <input
                type="text"
                className="member-search-input"
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search by email…"
                autoComplete="off"
              />
              {searchOpen && memberResults.length > 0 && (
                <ul className="member-dropdown">
                  {memberResults.map(u => {
                    const selected = selectedMembers.some(m => m._id === u._id);
                    return (
                      <li
                        key={u._id}
                        className={`member-dropdown-item ${selected ? 'member-dropdown-item--selected' : ''}`}
                        onMouseDown={() => toggleMember(u)}
                      >
                        <span className="member-dropdown-name">{u.name}</span>
                        <span className="member-dropdown-email">{u.email}</span>
                        {selected && <span className="member-dropdown-check">✓</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
              {searchOpen && memberSearch && memberResults.length === 0 && (
                <div className="member-dropdown member-dropdown--empty">No users found</div>
              )}
            </div>
          </div>

          <button type="submit" className="btn-print" disabled={creating || !name.trim()}>
            {creating ? 'Creating…' : 'Create Group'}
          </button>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="groups-empty">
          <p>No groups yet. Create one to start splitting expenses!</p>
        </div>
      ) : (
        <div className="groups-list">
          {groups.map((g) => (
            <Link to={`/groups/${g._id}`} key={g._id} className="group-card-link">
              <div className="group-card">
                <div className="group-card-info">
                  <h3>{g.name}</h3>
                  <p className="group-card-meta">
                    {g.members.length} member{g.members.length !== 1 ? 's' : ''} · {g.currency}
                  </p>
                  <p className="group-card-members">
                    {g.members.map((m) => m.name).join(', ')}
                  </p>
                </div>
                <span className="group-card-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
