import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';

const CATEGORIES = ['Food', 'Transport', 'Stay', 'Activity', 'Shopping', 'Other'];
const CATEGORY_ICONS = { Food: '🍽️', Transport: '🚗', Stay: '🏨', Activity: '🎯', Shopping: '🛍️', Other: '📝' };

export function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({ balances: [], simplified: [] });
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('expenses');

  // Expense form
  const [showExpForm, setShowExpForm] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Other');
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expSubmitting, setExpSubmitting] = useState(false);

  // Settle form
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  // Add member form
  const [addEmail, setAddEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [gRes, eRes, bRes, sRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balances`),
        api.get(`/groups/${id}/settlements`),
      ]);
      setGroup(gRes.data);
      setExpenses(eRes.data);
      setBalances(bRes.data);
      setSettlements(sRes.data);
      if (!expPaidBy && gRes.data.members?.length) {
        setExpPaidBy(user?._id || gRes.data.members[0]._id);
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        navigate('/groups');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addExpense = async (e) => {
    e.preventDefault();
    if (!expDesc.trim() || !expAmount) return;
    setExpSubmitting(true);
    try {
      await api.post(`/groups/${id}/expenses`, {
        description: expDesc.trim(),
        amount: parseFloat(expAmount),
        category: expCategory,
        paidBy: expPaidBy || user._id,
        splitType: 'equal',
      });
      setExpDesc('');
      setExpAmount('');
      setExpCategory('Other');
      setShowExpForm(false);
      setToast({ message: 'Expense added!', type: 'success' });
      fetchAll();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to add', type: 'error' });
    } finally {
      setExpSubmitting(false);
    }
  };

  const deleteExpense = async (expId) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/groups/${id}/expenses/${expId}`);
      setToast({ message: 'Expense deleted', type: 'success' });
      fetchAll();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to delete', type: 'error' });
    }
  };

  const addSettlement = async (e) => {
    e.preventDefault();
    if (!settleTo || !settleAmount) return;
    setSettleSubmitting(true);
    try {
      await api.post(`/groups/${id}/settlements`, {
        to: settleTo,
        amount: parseFloat(settleAmount),
        note: settleNote,
      });
      setSettleTo('');
      setSettleAmount('');
      setSettleNote('');
      setShowSettleForm(false);
      setToast({ message: 'Settlement recorded!', type: 'success' });
      fetchAll();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed', type: 'error' });
    } finally {
      setSettleSubmitting(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAddingMember(true);
    try {
      await api.patch(`/groups/${id}`, { addEmails: [addEmail.trim()] });
      setAddEmail('');
      setToast({ message: 'Member added!', type: 'success' });
      fetchAll();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed', type: 'error' });
    } finally {
      setAddingMember(false);
    }
  };

  const deleteGroup = async () => {
    if (!confirm('Delete this group and all its expenses? This cannot be undone.')) return;
    try {
      await api.delete(`/groups/${id}`);
      navigate('/groups');
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed', type: 'error' });
    }
  };

  if (loading || !group) {
    return (
      <div className="loading-screen">
        <span>Loading group…</span>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const isCreator = String(group.createdBy) === String(user?._id) || String(group.createdBy?._id) === String(user?._id);

  return (
    <div className="page-group-detail">
      <nav className="detail-nav">
        <Link to="/groups" className="detail-back-link">← All Groups</Link>
      </nav>

      <header className="group-detail-header">
        <div>
          <h1 className="page-title">{group.name}</h1>
          <p className="group-detail-meta">
            {group.members.length} members · {group.currency} · Total: ₹{totalExpenses.toLocaleString('en-IN')}
          </p>
        </div>
        {isCreator && (
          <button className="btn-outline btn-sm" onClick={deleteGroup}>Delete Group</button>
        )}
      </header>

      {/* Members strip */}
      <div className="group-members-strip">
        {group.members.map((m) => (
          <span key={m._id} className="group-member-chip">
            {m.name}
            {m.location?.city && <small> · {m.location.city}</small>}
          </span>
        ))}
        <form className="group-add-member" onSubmit={handleAddMember}>
          <input
            type="email"
            placeholder="Add by email…"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
          />
          <button type="submit" className="btn-print btn-sm" disabled={addingMember || !addEmail.trim()}>+</button>
        </form>
      </div>

      {/* Tabs */}
      <div className="group-tabs">
        <button className={`group-tab ${tab === 'expenses' ? 'group-tab--active' : ''}`} onClick={() => setTab('expenses')}>
          Expenses ({expenses.length})
        </button>
        <button className={`group-tab ${tab === 'balances' ? 'group-tab--active' : ''}`} onClick={() => setTab('balances')}>
          Balances
        </button>
        <button className={`group-tab ${tab === 'settlements' ? 'group-tab--active' : ''}`} onClick={() => setTab('settlements')}>
          Settlements ({settlements.length})
        </button>
      </div>

      {/* EXPENSES TAB */}
      {tab === 'expenses' && (
        <div className="group-tab-content">
          <button className="btn-print" onClick={() => setShowExpForm(!showExpForm)} style={{ marginBottom: '1rem' }}>
            {showExpForm ? 'Cancel' : '+ Add Expense'}
          </button>

          {showExpForm && (
            <form className="expense-form" onSubmit={addExpense}>
              <label>
                Description
                <input type="text" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="e.g. Dinner at Dal Bati place" required />
              </label>
              <div className="expense-form-row">
                <label>
                  Amount (₹)
                  <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0" min="1" step="any" required />
                </label>
                <label>
                  Category
                  <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>
                  Paid By
                  <select value={expPaidBy} onChange={(e) => setExpPaidBy(e.target.value)}>
                    {group.members.map((m) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="expense-form-note">Split equally among all {group.members.length} members (₹{expAmount ? (parseFloat(expAmount) / group.members.length).toFixed(0) : '0'} each)</p>
              <button type="submit" className="btn-print" disabled={expSubmitting || !expDesc.trim() || !expAmount}>
                {expSubmitting ? 'Adding…' : 'Add Expense'}
              </button>
            </form>
          )}

          {expenses.length === 0 ? (
            <p className="group-empty">No expenses yet. Add one to get started.</p>
          ) : (
            <ul className="expense-list">
              {expenses.map((exp) => (
                <li key={exp._id} className="expense-item">
                  <div className="expense-item-icon">{CATEGORY_ICONS[exp.category] || '📝'}</div>
                  <div className="expense-item-info">
                    <span className="expense-item-desc">{exp.description}</span>
                    <span className="expense-item-meta">
                      {exp.paidBy?.name || 'Unknown'} paid · {exp.category} · {new Date(exp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="expense-item-amount">₹{exp.amount.toLocaleString('en-IN')}</div>
                  <button className="expense-item-delete" onClick={() => deleteExpense(exp._id)} title="Delete">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* BALANCES TAB */}
      {tab === 'balances' && (
        <div className="group-tab-content">
          {balances.simplified.length === 0 ? (
            <div className="group-empty">
              <p>🎉 All settled up! No outstanding balances.</p>
            </div>
          ) : (
            <>
              <h3 className="balance-section-title">Simplified Settlements</h3>
              <p className="balance-section-sub">Minimum transfers to settle everyone:</p>
              <div className="balance-cards">
                {balances.simplified.map((b, i) => (
                  <div key={i} className="balance-card">
                    <span className="balance-from">{b.fromName}</span>
                    <span className="balance-arrow">→ pays →</span>
                    <span className="balance-to">{b.toName}</span>
                    <span className="balance-amount">₹{b.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              {balances.balances.length > 0 && (
                <>
                  <h3 className="balance-section-title" style={{ marginTop: '2rem' }}>Detailed Balances</h3>
                  <div className="balance-cards">
                    {balances.balances.map((b, i) => (
                      <div key={i} className="balance-card balance-card--detail">
                        <span className="balance-from">{b.fromName}</span>
                        <span className="balance-arrow">owes</span>
                        <span className="balance-to">{b.toName}</span>
                        <span className="balance-amount">₹{b.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* SETTLEMENTS TAB */}
      {tab === 'settlements' && (
        <div className="group-tab-content">
          <button className="btn-print" onClick={() => setShowSettleForm(!showSettleForm)} style={{ marginBottom: '1rem' }}>
            {showSettleForm ? 'Cancel' : '💸 Settle Up'}
          </button>

          {showSettleForm && (
            <form className="expense-form" onSubmit={addSettlement}>
              <label>
                Pay To
                <select value={settleTo} onChange={(e) => setSettleTo(e.target.value)} required>
                  <option value="">Select member…</option>
                  {group.members.filter((m) => String(m._id) !== String(user._id)).map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Amount (₹)
                <input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="0" min="1" step="any" required />
              </label>
              <label>
                Note (optional)
                <input type="text" value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="e.g. UPI transfer" />
              </label>
              <button type="submit" className="btn-print" disabled={settleSubmitting || !settleTo || !settleAmount}>
                {settleSubmitting ? 'Recording…' : 'Record Settlement'}
              </button>
            </form>
          )}

          {settlements.length === 0 ? (
            <p className="group-empty">No settlements recorded yet.</p>
          ) : (
            <ul className="expense-list">
              {settlements.map((s) => (
                <li key={s._id} className="expense-item expense-item--settlement">
                  <div className="expense-item-icon">💸</div>
                  <div className="expense-item-info">
                    <span className="expense-item-desc">{s.from?.name} paid {s.to?.name}</span>
                    <span className="expense-item-meta">
                      {s.note && `${s.note} · `}{new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="expense-item-amount expense-item-amount--settlement">₹{s.amount.toLocaleString('en-IN')}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
