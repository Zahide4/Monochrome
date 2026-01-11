import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); 
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [actionId, setActionId] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/');
    else fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    try {
      const res = await axios.get('https://monochrome-w1vb.onrender.com/api/posts', { headers: { Authorization: `Bearer ${token}` } });
      setPosts(res.data);
    } catch (err) { console.error(err); }
  };

  const stats = useMemo(() => {
    return {
      total: posts.length,
      active: posts.filter(p => !p.hiddenByAdmin).length,
      banned: posts.filter(p => p.hiddenByAdmin).length
    };
  }, [posts]);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.author?.username.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' ? true : post.hiddenByAdmin;
    return matchesSearch && matchesFilter;
  });

  const submitTakeDown = async (post) => {
    if (!reason.trim()) return alert("Reason is required.");
    try {
      await axios.put(`https://monochrome-w1vb.onrender.com/api/posts/${post._id}`,
        { hiddenByAdmin: true, takedownReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActionId(null);
      setReason('');
      fetchPosts();
    } catch (err) { alert('Error'); }
  };

  const handleRestore = async (post) => {
    if (!confirm("Restore this post to public view?")) return;
    try {
      await axios.put(`https://monochrome-w1vb.onrender.com/api/posts/${post._id}`,
        { hiddenByAdmin: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPosts();
    } catch (err) { alert('Error'); }
  };

  const getBadge = (post) => {
    if (post.hiddenByAdmin) return <span className="badge-banned">TAKEN DOWN</span>;
    if (post.isPrivate) return <span className="badge-private">PRIVATE</span>;
    return <span className="badge-public">PUBLIC</span>;
  };

  return (
    <div className="admin-container fade-in">

      <div className="admin-header-section">
        <h1 className="admin-page-title">Dashboard</h1>
        <div className="admin-header-info">
          <span>ADMINISTRATOR ACCESS</span>
          <span>LOGGED IN AS: {user?.username?.toUpperCase()}</span>
        </div>
      </div>

      <div className="admin-stats-container">
        <div className="stat-box">
          <div className="stat-label">Total Visible Entries</div>
          <h3 className="stat-value">{stats.total}</h3>
        </div>
        <div className="stat-box">
          <div className="stat-label">Active / Public</div>
          <h3 className="stat-value">{stats.active}</h3>
        </div>
        <div className={`stat-box ${stats.banned > 0 ? 'alert' : ''}`}>
          <div className="stat-label">Take Downs</div>
          <h3 className="stat-value">{stats.banned}</h3>
        </div>
      </div>

      <div className="admin-controls">
        <div className="filter-group">
          <button
            onClick={() => setFilter('ALL')}
            className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}>
            ALL ENTRIES
          </button>
          <button
            onClick={() => setFilter('BANNED')}
            className={`filter-btn banned ${filter === 'BANNED' ? 'active' : ''}`}>
            TAKEN DOWN
          </button>
        </div>

        <input
          type="text"
          placeholder="Search titles or authors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search-input"
        />
      </div>

      <div className="admin-grid">
        {filteredPosts.map(post => (
          <div key={post._id} className={`admin-card ${post.hiddenByAdmin ? 'banned' : ''}`}>

            <div className="admin-card-header">
              <div className="admin-card-meta">
                ID: {post._id.slice(-6).toUpperCase()}
                <br />
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
              <div>{getBadge(post)}</div>
            </div>

            <div>
              <h3 className="admin-card-title">{post.title}</h3>
              <div className="admin-card-author">
                <span className="admin-dot"></span>
                {post.author?.username}
              </div>
            </div>

            <div className="admin-card-footer">
              {actionId !== post._id && (
                <div className="admin-card-actions">
                  <button className="btn-view" onClick={() => navigate(`/post/${post._id}`)}>
                    VIEW LIVE
                  </button>

                  {post.hiddenByAdmin ? (
                    <button className="btn-restore" onClick={() => handleRestore(post)}>
                      RESTORE
                    </button>
                  ) : (
                    <button className="btn-takedown" onClick={() => setActionId(post._id)}>
                      TAKE DOWN
                    </button>
                  )}
                </div>
              )}

              {actionId === post._id && (
                <div className="takedown-form">
                  <p className="takedown-label">REASON FOR REMOVAL:</p>
                  <input
                    autoFocus
                    type="text"
                    className="takedown-input"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Violation details..."
                  />
                  <div className="takedown-actions">
                    <button className="btn-confirm-red" onClick={() => submitTakeDown(post)}>
                      CONFIRM
                    </button>
                    <button className="btn-cancel-gray" onClick={() => { setActionId(null); setReason(''); }}>
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="admin-empty-state">
          No entries found.
        </div>
      )}
    </div>
  );
}