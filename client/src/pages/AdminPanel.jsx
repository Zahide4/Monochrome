import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, BANNED
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // Action State
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

  // Stats Calculation
  const stats = useMemo(() => {
    return {
      total: posts.length,
      active: posts.filter(p => !p.hiddenByAdmin).length,
      banned: posts.filter(p => p.hiddenByAdmin).length
    };
  }, [posts]);

  // Filtering
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) || 
                          post.author?.username.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' ? true : post.hiddenByAdmin;
    return matchesSearch && matchesFilter;
  });

  // Actions
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
    if(!confirm("Restore this post to public view?")) return;
    try {
      await axios.put(`https://monochrome-w1vb.onrender.com/api/posts/${post._id}`, 
        { hiddenByAdmin: false }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPosts();
    } catch (err) { alert('Error'); }
  };

  return (
    <div className="fade-in admin-container">
      
      {/* HEADER */}
      <div className="admin-header">
        <h1 className="header-title" style={{ fontSize: '2.5rem', textAlign: 'left', marginBottom: '0' }}>Dashboard</h1>
        <div className="admin-header-meta">
            <span>ADMINISTRATOR ACCESS</span>
            <span>LOGGED IN AS: {user?.username?.toUpperCase()}</span>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="admin-stats-grid">
        <div className="admin-stat-box">
            <div className="admin-stat-label">Total Visible Entries</div>
            <h3 className="admin-stat-value">{stats.total}</h3>
        </div>
        <div className="admin-stat-box">
            <div className="admin-stat-label">Active / Public</div>
            <h3 className="admin-stat-value">{stats.active}</h3>
        </div>
        <div className="admin-stat-box" style={{ 
            backgroundColor: stats.banned > 0 ? '#fff1f2' : 'white', 
            borderColor: stats.banned > 0 ? '#fecaca' : '#e4e4e7' 
        }}>
            <div className="admin-stat-label" style={{ color: stats.banned > 0 ? '#991b1b' : 'inherit' }}>Take Downs</div>
            <h3 className="admin-stat-value" style={{ color: stats.banned > 0 ? '#991b1b' : 'inherit' }}>{stats.banned}</h3>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="admin-controls">
        <div className="admin-filter-group">
            <button 
                onClick={() => setFilter('ALL')}
                className={`admin-btn-text ${filter === 'ALL' ? 'admin-btn-active' : 'admin-btn-inactive'}`}>
                ALL ENTRIES
            </button>
            <button 
                onClick={() => setFilter('BANNED')}
                className={`admin-btn-text admin-btn-danger ${filter === 'BANNED' ? 'admin-btn-active' : 'admin-btn-inactive'}`}>
                FLAGGED / BANNED
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

      {/* DATA TABLE */}
      <div style={{ borderTop: '1px solid #000' }}>
        <div className="admin-table-header">
            <div>Title</div>
            <div>Author</div>
            <div>Date</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {filteredPosts.map(post => (
            <div key={post._id} className="admin-table-row" style={{ backgroundColor: post.hiddenByAdmin ? '#fff1f2' : 'transparent' }}>
                <div className="admin-row-grid">
                    
                    {/* Title */}
                    <div style={{ paddingRight: '1rem' }}>
                        <span style={{ fontFamily: 'serif', fontSize: '1.1rem', fontWeight: '500', display: 'block' }}>
                            {post.title}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: '#a1a1aa' }}>
                            ID: {post._id}
                        </span>
                    </div>

                    {/* Author */}
                    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {post.author?.username}
                    </div>

                    {/* Date */}
                    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#52525b' }}>
                        {new Date(post.createdAt).toLocaleDateString()}
                    </div>

                    {/* Status */}
                    <div>
                        {post.hiddenByAdmin ? (
                            <span className="badge-banned">BANNED</span>
                        ) : post.isPrivate ? (
                            <span className="badge-private">PRIVATE</span>
                        ) : (
                            <span className="badge-public">PUBLIC</span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="admin-actions">
                         <button onClick={() => navigate(`/posts/${post._id}`)} className="admin-btn-text">VIEW</button>
                         
                         {post.hiddenByAdmin ? (
                             <button onClick={() => handleRestore(post)} className="admin-btn-text" style={{ color: '#16a34a', fontWeight: 'bold' }}>RESTORE</button>
                         ) : (
                             <button onClick={() => setActionId(post._id)} className="admin-btn-text" style={{ color: '#991b1b', fontWeight: 'bold' }}>TAKE DOWN</button>
                         )}
                    </div>
                </div>

                {/* EXPANDABLE REASON BOX */}
                {actionId === post._id && (
                    <div className="admin-reason-box">
                         <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', marginBottom: '0.5rem' }}>ENTER REASON FOR REMOVAL:</p>
                         <div className="admin-reason-input-group">
                             <input 
                                autoFocus
                                type="text"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="admin-input-reason"
                                placeholder="Violation of terms..."
                             />
                             <button onClick={() => submitTakeDown(post)} className="btn-small btn-confirm">CONFIRM</button>
                             <button onClick={() => setActionId(null)} className="btn-small btn-cancel">CANCEL</button>
                         </div>
                    </div>
                )}
            </div>
        ))}
        
        {filteredPosts.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'serif', color: '#a1a1aa', fontStyle: 'italic' }}>
                No entries found.
            </div>
        )}
      </div>
    </div>
  );
}
