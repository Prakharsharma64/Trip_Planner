import { Link } from 'react-router-dom';

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

export function DestCard({ d, onAddToBucket, addingId, showAddButton = true, user, bucketStatus }) {
  const cover = d.images?.cover;
  const isVisited = bucketStatus?.status === 'visited';
  const isInBucket = !!bucketStatus;

  return (
    <Link to={`/destinations/${d._id}`} className="dest-card-link">
      <div className="dest-card">
        <div className="dest-card-photo">
          {cover ? (
            <img src={cover} alt={d.name} loading="lazy" />
          ) : (
            <div
              className="dest-card-placeholder"
              style={{ background: placeholderGradient(d.state) }}
              aria-hidden
            >
              <span className="dest-card-placeholder-letter">{d.name.charAt(0)}</span>
              <span className="dest-card-placeholder-label">{d.state || 'India'}</span>
            </div>
          )}
          {isVisited && (
            <span className="dest-card-badge dest-card-badge--visited">
              ✓ Visited{bucketStatus.visitedAt ? ` · ${new Date(bucketStatus.visitedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ''}
            </span>
          )}
          {!isVisited && isInBucket && (
            <span className="dest-card-badge dest-card-badge--bucket">
              ♡ In Bucket
            </span>
          )}
        </div>
        <div className="dest-card-body">
          <h3>{d.name}</h3>
          <p className="dest-meta">{d.state} • {d.category}</p>
          {d.budget && <p className="dest-budget">{d.budget}</p>}
          {d.weather && <p className="dest-weather">{d.weather}</p>}
          {showAddButton && user && !isInBucket && (
            <button
              type="button"
              className="btn-print btn-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToBucket?.(d._id);
              }}
              disabled={addingId === d._id}
            >
              {addingId === d._id ? 'Adding…' : '+ Add to Bucket'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
