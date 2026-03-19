import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';

function placeholderGradient(state = '') {
  const gradients = {
    'Andhra Pradesh': 'linear-gradient(135deg, #0D47A1 0%, #1976D2 100%)',
    'Arunachal Pradesh': 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
    'Assam': 'linear-gradient(135deg, #00695C 0%, #00897B 100%)',
    'Gujarat': 'linear-gradient(135deg, #E65100 0%, #F57C00 100%)',
    'Himachal Pradesh': 'linear-gradient(135deg, #1A237E 0%, #3949AB 100%)',
    'Karnataka': 'linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%)',
    'Kerala': 'linear-gradient(135deg, #00695C 0%, #00897B 100%)',
    'Madhya Pradesh': 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)',
    'Maharashtra': 'linear-gradient(135deg, #B71C1C 0%, #D32F2F 100%)',
    'Meghalaya': 'linear-gradient(135deg, #1B5E20 0%, #43A047 100%)',
    'Nagaland': 'linear-gradient(135deg, #BF360C 0%, #FF5722 100%)',
    'Rajasthan': 'linear-gradient(135deg, #BF360C 0%, #E64A19 100%)',
    'Tamil Nadu': 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
    'Uttarakhand': 'linear-gradient(135deg, #1B5E20 0%, #388E3C 100%)',
  };
  if (state && gradients[state]) return gradients[state];
  const firstWord = state?.split(' ')[0];
  const match = Object.entries(gradients).find(([k]) => k.startsWith(firstWord || ''));
  return match ? match[1] : 'linear-gradient(135deg, #1A4A4A 0%, #2E7D7D 100%)';
}

/* ─── Lightbox Gallery ─── */
function ImageGallery({ images, name }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images || images.length === 0) return null;

  const handlePrev = (e) => { e.stopPropagation(); setActiveIdx((i) => (i - 1 + images.length) % images.length); };
  const handleNext = (e) => { e.stopPropagation(); setActiveIdx((i) => (i + 1) % images.length); };

  return (
    <section className="detail-section detail-gallery" style={{ animationDelay: '0.1s' }}>
      <h2 className="detail-section-title">Gallery</h2>
      <div className="gallery-main" onClick={() => setLightboxOpen(true)} role="button" tabIndex={0} aria-label="Open gallery lightbox">
        <img src={images[activeIdx]} alt={`${name} ${activeIdx + 1}`} className="gallery-main-img" />
        {images.length > 1 && (
          <>
            <button className="gallery-nav gallery-nav--prev" onClick={handlePrev} aria-label="Previous image">‹</button>
            <button className="gallery-nav gallery-nav--next" onClick={handleNext} aria-label="Next image">›</button>
            <span className="gallery-counter">{activeIdx + 1} / {images.length}</span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((url, i) => (
            <button
              key={i}
              className={`gallery-thumb ${i === activeIdx ? 'gallery-thumb--active' : ''}`}
              onClick={() => setActiveIdx(i)}
              aria-label={`View image ${i + 1}`}
            >
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {lightboxOpen && (
        <div className="gallery-lightbox" onClick={() => setLightboxOpen(false)} role="dialog" aria-label="Gallery lightbox">
          <button className="gallery-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close lightbox">×</button>
          <img src={images[activeIdx]} alt={`${name} ${activeIdx + 1}`} className="gallery-lightbox-img" />
          {images.length > 1 && (
            <>
              <button className="gallery-nav gallery-nav--prev gallery-lightbox-nav" onClick={handlePrev} aria-label="Previous">‹</button>
              <button className="gallery-nav gallery-nav--next gallery-lightbox-nav" onClick={handleNext} aria-label="Next">›</button>
              <span className="gallery-lightbox-counter">{activeIdx + 1} / {images.length}</span>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ─── Activity Image Modal ─── */
function ActivityModal({ act, onClose }) {
  if (!act) return null;
  // act is an array: [icon, title, description, image]
  const icon = act[0] || act.icon;
  const title = act[1] || act.title;
  const description = act[2] || act.description;
  const image = act[3] || act.image;

  return (
    <div className="act-modal-overlay" onClick={onClose} role="dialog" aria-label={title}>
      <div className="act-modal" onClick={e => e.stopPropagation()}>
        <button className="act-modal-close" onClick={onClose} aria-label="Close">×</button>
        {image ? (
          <img src={image} alt={title} className="act-modal-img" />
        ) : (
          <div className="act-modal-no-img">
            {icon && <span className="act-modal-icon">{icon}</span>}
          </div>
        )}
        <div className="act-modal-body">
          <h3 className="act-modal-title">{title}</h3>
          {description && <p className="act-modal-desc">{description}</p>}
        </div>
      </div>
    </div>
  );
}

export function DestinationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dest, setDest] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const [bucketStatus, setBucketStatus] = useState(null);
  const [activeAct, setActiveAct] = useState(null); // for activity modal

  const [formPlaceName, setFormPlaceName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVisibility, setFormVisibility] = useState('public');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchDest = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .get(`/destinations/${id}`)
      .then(({ data }) => setDest(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchRecommendations = useCallback(() => {
    if (!id) return;
    setRecLoading(true);
    api
      .get(`/destinations/${id}/recommendations`)
      .then(({ data }) => setRecommendations(data))
      .catch(() => setRecommendations([]))
      .finally(() => setRecLoading(false));
  }, [id]);

  // Fetch bucket status for this destination
  const fetchBucketStatus = useCallback(() => {
    if (!id || !user) return;
    api.get(`/bucket/status?destinationIds=${id}`)
      .then(({ data }) => {
        setBucketStatus(data[id] || null);
      })
      .catch(() => setBucketStatus(null));
  }, [id, user]);

  useEffect(() => { fetchDest(); }, [fetchDest]);
  useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);
  useEffect(() => { fetchBucketStatus(); }, [fetchBucketStatus]);

  const addToBucket = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !id) return;
    setAdding(true);
    try {
      await api.post('/bucket', { destinationId: id });
      setToast({ message: 'Added to bucket list!', type: 'success' });
      setBucketStatus({ status: 'want-to-visit', visitedAt: null });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to add', type: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const markVisited = async () => {
    if (!bucketStatus?.bucketItemId) return;
    try {
      await api.patch(`/bucket/${bucketStatus.bucketItemId}`, {
        status: 'visited',
        visitedAt: new Date().toISOString(),
      });
      setBucketStatus({ ...bucketStatus, status: 'visited', visitedAt: new Date().toISOString() });
      setToast({ message: 'Marked as visited!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to update', type: 'error' });
    }
  };

  const submitRecommendation = async (e) => {
    e.preventDefault();
    if (!formPlaceName.trim()) return;
    setFormSubmitting(true);
    try {
      await api.post(`/destinations/${id}/recommendations`, {
        placeName: formPlaceName.trim(),
        description: formDescription.trim() || undefined,
        visibility: formVisibility,
      });
      setFormPlaceName('');
      setFormDescription('');
      setFormVisibility('public');
      fetchRecommendations();
      setToast({ message: 'Recommendation added.', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to add', type: 'error' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const deleteRecommendation = async (recId) => {
    setDeletingId(recId);
    try {
      await api.delete(`/destinations/${id}/recommendations/${recId}`);
      setRecommendations((prev) => prev.filter((r) => r._id !== recId));
      setToast({ message: 'Recommendation removed.', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to remove', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span>Loading place…</span>
      </div>
    );
  }

  if (error || !dest) {
    return (
      <div className="page-detail page-detail--error">
        <p className="detail-error">{error || 'Place not found.'}</p>
        <Link to="/destinations" className="btn-print">Back to Destinations</Link>
      </div>
    );
  }

  const cover = dest.images?.cover;
  const galleryImages = [
    ...(cover ? [cover] : []),
    ...(dest.images?.gallery || []),
  ].filter(Boolean);
  const acts = Array.isArray(dest.acts) ? dest.acts : [];
  const isVisited = bucketStatus?.status === 'visited';
  const isInBucket = !!bucketStatus;

  return (
    <div className="page-detail">
      <nav className="detail-nav">
        <button type="button" className="detail-back" onClick={() => navigate(-1)} aria-label="Go back">
          ← Back
        </button>
        <Link to="/destinations" className="detail-back-link">All destinations</Link>
      </nav>

      <header className="detail-hero">
        <div className="detail-hero-media">
          {cover ? (
            <img src={cover} alt={dest.name} className="detail-hero-img" />
          ) : (
            <div
              className="detail-hero-placeholder"
              style={{ background: placeholderGradient(dest.state) }}
              aria-hidden
            >
              <span className="detail-hero-letter">{dest.name.charAt(0)}</span>
              <span className="detail-hero-state">{dest.state || 'India'}</span>
            </div>
          )}
        </div>
        <div className="detail-hero-overlay" />
        <div className="detail-hero-content">
          <p className="detail-hero-meta">{dest.state} · {dest.category}</p>
          <h1 className="detail-hero-title">{dest.name}</h1>
          {dest.budget && <p className="detail-hero-budget">{dest.budget}</p>}
          {user && (
            <div className="detail-hero-actions">
              {isVisited ? (
                <span className="detail-visited-badge">
                  ✓ You visited this place{bucketStatus.visitedAt ? ` on ${new Date(bucketStatus.visitedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                </span>
              ) : isInBucket ? (
                <button type="button" className="btn-print detail-hero-cta" onClick={markVisited}>
                  ✓ Mark as Visited
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-print detail-hero-cta"
                  onClick={addToBucket}
                  disabled={adding}
                >
                  {adding ? 'Adding…' : '+ Add to Bucket List'}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          {/* Gallery section */}
          {galleryImages.length > 1 && (
            <ImageGallery images={galleryImages} name={dest.name} />
          )}

          {dest.about && (
            <section className="detail-section detail-about" style={{ animationDelay: '0.05s' }}>
              <h2 className="detail-section-title">About</h2>
              <p className="detail-section-lead">{dest.about}</p>
            </section>
          )}

          {/* Things to do — rich image grid */}
          {acts.length > 0 && (
            <section className="detail-section detail-acts-grid" style={{ animationDelay: '0.1s' }}>
              <h2 className="detail-section-title">Things to do</h2>
              <p className="detail-acts-grid-sub">Click any activity to see a photo.</p>
              <div className="acts-grid">
                {acts.map((a, i) => (
                  <button
                    key={i}
                    className="act-card"
                    onClick={() => setActiveAct(a)}
                    aria-label={a[1] || a.title || 'Activity'}
                  >
                    {(a.image || a[3]) ? (
                      <img
                        src={a.image || a[3]}
                        alt={a[1] || a.title}
                        className="act-card-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="act-card-placeholder">
                        <span className="act-card-icon">{a[0] || a.icon || '#'}</span>
                      </div>
                    )}
                    <div className="act-card-body">
                      <span className="act-card-title">{a[1] || a.title}</span>
                      {(a[2] || a.description) && (
                        <span className="act-card-desc">{a[2] || a.description}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {dest.route && (
            <section className="detail-section" style={{ animationDelay: '0.15s' }}>
              <h2 className="detail-section-title">How to reach</h2>
              <p className="detail-section-text">{dest.route}</p>
            </section>
          )}

          {dest.tip && (
            <section className="detail-section detail-tip" style={{ animationDelay: '0.25s' }}>
              <h2 className="detail-section-title">Tip</h2>
              <p className="detail-tip-text">{dest.tip}</p>
            </section>
          )}

          {/* Traveler recommendations */}
          <section className="detail-section detail-recs" style={{ animationDelay: '0.3s' }}>
            <h2 className="detail-section-title">Traveler recommendations</h2>
            <p className="detail-recs-intro">
              Spots and tips from visitors. Add your own place — choose whether to share it with everyone or keep it for yourself.
            </p>

            {user && (
              <form className="detail-rec-form" onSubmit={submitRecommendation}>
                <div className="detail-rec-form-row">
                  <input
                    type="text"
                    className="detail-rec-input"
                    placeholder="Place or spot name"
                    value={formPlaceName}
                    onChange={(e) => setFormPlaceName(e.target.value)}
                    maxLength={120}
                    required
                  />
                  <div className="detail-rec-visibility">
                    <label className="detail-rec-toggle">
                      <input
                        type="radio"
                        name="visibility"
                        checked={formVisibility === 'public'}
                        onChange={() => setFormVisibility('public')}
                      />
                      <span className="detail-rec-toggle-label">Public</span>
                    </label>
                    <label className="detail-rec-toggle">
                      <input
                        type="radio"
                        name="visibility"
                        checked={formVisibility === 'private'}
                        onChange={() => setFormVisibility('private')}
                      />
                      <span className="detail-rec-toggle-label">Private</span>
                    </label>
                  </div>
                </div>
                <textarea
                  className="detail-rec-textarea"
                  placeholder="Why recommend it? (optional)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
                <button type="submit" className="btn-print btn-sm" disabled={formSubmitting || !formPlaceName.trim()}>
                  {formSubmitting ? 'Adding…' : 'Add recommendation'}
                </button>
              </form>
            )}

            {!user && (
              <p className="detail-recs-login">
                <Link to="/login" className="detail-recs-login-link">Sign in</Link> to add your own recommendations and see private ones.
              </p>
            )}

            {recLoading ? (
              <p className="detail-recs-loading">Loading recommendations…</p>
            ) : recommendations.length === 0 ? (
              <p className="detail-recs-empty">No recommendations yet. Be the first to add a spot.</p>
            ) : (
              <ul className="detail-recs-list">
                {recommendations.map((r) => (
                  <li key={r._id} className={`detail-rec-card ${r.visibility === 'private' ? 'detail-rec-card--private' : ''}`}>
                    <div className="detail-rec-card-head">
                      <span className="detail-rec-card-name">{r.placeName}</span>
                      <span className="detail-rec-card-meta">
                        {r.isOwn && r.visibility === 'private' && <span className="detail-rec-badge detail-rec-badge--private">Only you</span>}
                        {r.isOwn && r.visibility === 'public' && <span className="detail-rec-badge">Yours</span>}
                        {!r.isOwn && r.userName && <span className="detail-rec-card-user">{r.userName}</span>}
                      </span>
                    </div>
                    {r.description && <p className="detail-rec-card-desc">{r.description}</p>}
                    {r.isOwn && (
                      <button
                        type="button"
                        className="detail-rec-delete"
                        onClick={() => deleteRecommendation(r._id)}
                        disabled={deletingId === r._id}
                      >
                        {deletingId === r._id ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {dest.wiki && (
            <p className="detail-wiki">
              <a href={dest.wiki} target="_blank" rel="noopener noreferrer" className="detail-wiki-link">
                Read more on Wikipedia →
              </a>
            </p>
          )}
        </div>

        <aside className="detail-sidebar">
          <div className="detail-sidebar-sticky">
            {(dest.weather || dest.budget) && (
              <div className="detail-meta-cards">
                {dest.weather && (
                  <section className="detail-meta-card">
                    <h3 className="detail-meta-card-title">Best time</h3>
                    <p className="detail-meta-card-text">{dest.weather}</p>
                  </section>
                )}
                {dest.budget && (
                  <section className="detail-meta-card">
                    <h3 className="detail-meta-card-title">Budget</h3>
                    <p className="detail-meta-card-text">{dest.budget}</p>
                  </section>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      <ActivityModal act={activeAct} onClose={() => setActiveAct(null)} />
    </div>
  );
}
