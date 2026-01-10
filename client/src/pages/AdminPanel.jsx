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
      const res = await axios.get('https://monochrome-agc7.onrender.com/api/posts', { headers: { Authorization: `Bearer ${token}` } });
      setPosts(res.data);
    } catch (err) { console.error(err); }
  };

  // --- STATS CALCULATION (REMOVED PRIVATE) ---
  const stats = useMemo(() => {
    return {
      total: posts.length,
      active: posts.filter(p => !p.hiddenByAdmin).length,
      banned: posts.filter(p => p.hiddenByAdmin).length
    };
  }, [posts]);

  // --- FILTERING ---
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) || 
                          post.author?.username.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' ? true : post.hiddenByAdmin;
    return matchesSearch && matchesFilter;
  });

  // --- ACTIONS ---
  const submitTakeDown = async (post) => {
    if (!reason.trim()) return alert("Reason is required.");
    try {
      await axios.put(`https://monochrome-agc7.onrender.com/api/posts/${post._id}`, 
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
      await axios.put(`https://monochrome-agc7.onrender.com/api/posts/${post._id}`, 
        { hiddenByAdmin: false }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPosts();
    } catch (err) { alert('Error'); }
  };

  // --- STYLES ---
  const statBoxStyle = {
    border: '1px solid #e4e4e7', padding: '1.5rem', flex: 1, backgroundColor: 'white'
  };
  const statLabelStyle = {
    fontFamily: 'monospace', fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem'
  };
  const statValueStyle = {
    fontFamily: 'serif', fontSize: '2rem', margin: 0
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '3rem', borderBottom: '1px solid #000', paddingBottom: '1rem' }}>
        <h1 style={{ fontFamily: 'serif', fontSize: '2.5rem', margin: 0, fontWeight: 'normal' }}>Dashboard</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#52525b' }}>
            <span>ADMINISTRATOR ACCESS</span>
            <span>LOGGED IN AS: {user?.username?.toUpperCase()}</span>
        </div>
      </div>

      {/* STATS GRID (3 COLUMNS NOW) */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
        <div style={statBoxStyle}>
            <div style={statLabelStyle}>Total Visible Entries</div>
            <h3 style={statValueStyle}>{stats.total}</h3>
        </div>
        <div style={statBoxStyle}>
            <div style={statLabelStyle}>Active / Public</div>
            <h3 style={statValueStyle}>{stats.active}</h3>
        </div>
        <div style={{ ...statBoxStyle, backgroundColor: stats.banned > 0 ? '#fff1f2' : 'white', borderColor: stats.banned > 0 ? '#fecaca' : '#e4e4e7' }}>
            <div style={{ ...statLabelStyle, color: stats.banned > 0 ? '#991b1b' : '#71717a' }}>Take Downs</div>
            <h3 style={{ ...statValueStyle, color: stats.banned > 0 ? '#991b1b' : 'black' }}>{stats.banned}</h3>
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
                onClick={() => setFilter('ALL')}
                style={{ 
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: '0.8rem', 
                    fontWeight: filter === 'ALL' ? 'bold' : 'normal',
                    textDecoration: filter === 'ALL' ? 'underline' : 'none'
                }}>
                ALL ENTRIES
            </button>
            <button 
                onClick={() => setFilter('BANNED')}
                style={{ 
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: '0.8rem', color: '#991b1b',
                    fontWeight: filter === 'BANNED' ? 'bold' : 'normal',
                    textDecoration: filter === 'BANNED' ? 'underline' : 'none'
                }}>
                FLAGGED / BANNED
            </button>
        </div>

        <input 
            type="text" 
            placeholder="Search titles or authors..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
                padding: '0.5rem 1rem', border: '1px solid #d4d4d8', width: '300px',
                fontFamily: 'monospace', fontSize: '0.8rem'
            }}
        />
      </div>

      {/* DATA TABLE */}
      <div style={{ borderTop: '1px solid #000' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1.5fr', padding: '1rem 0', borderBottom: '1px solid #e4e4e7', fontFamily: 'monospace', fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
            <div>Title</div>
            <div>Author</div>
            <div>Date</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {/* Rows */}
        {filteredPosts.map(post => (
            <div key={post._id} style={{ 
                borderBottom: '1px solid #e4e4e7', padding: '1.5rem 0', 
                backgroundColor: post.hiddenByAdmin ? '#fff1f2' : 'transparent',
                transition: 'background 0.2s'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1.5fr', alignItems: 'center' }}>
                    
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
                            <span style={{ fontSize: '0.6rem', background: '#991b1b', color: '#fff', padding: '2px 6px', fontFamily: 'monospace' }}>BANNED</span>
                        ) : post.isPrivate ? (
                            <span style={{ fontSize: '0.6rem', background: '#18181b', color: '#fff', padding: '2px 6px', fontFamily: 'monospace' }}>PRIVATE</span>
                        ) : (
                            <span style={{ fontSize: '0.6rem', border: '1px solid #16a34a', color: '#16a34a', padding: '2px 6px', fontFamily: 'monospace' }}>PUBLIC</span>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                         <button onClick={() => navigate(`/posts/${post._id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.7rem', textDecoration: 'underline' }}>VIEW</button>
                         
                         {post.hiddenByAdmin ? (
                             <button onClick={() => handleRestore(post)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.7rem', color: '#16a34a', fontWeight: 'bold' }}>RESTORE</button>
                         ) : (
                             <button onClick={() => setActionId(post._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.7rem', color: '#991b1b', fontWeight: 'bold' }}>TAKE DOWN</button>
                         )}
                    </div>
                </div>

                {/* EXPANDABLE REASON BOX */}
                {actionId === post._id && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'white', border: '1px solid #d4d4d8' }}>
                         <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', marginBottom: '0.5rem' }}>ENTER REASON FOR REMOVAL:</p>
                         <div style={{ display: 'flex', gap: '1rem' }}>
                             <input 
                                autoFocus
                                type="text"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                style={{ flex: 1, padding: '0.5rem', border: '1px solid #a1a1aa', fontFamily: 'serif' }}
                                placeholder="Violation of terms..."
                             />
                             <button onClick={() => submitTakeDown(post)} style={{ backgroundColor: '#991b1b', color: 'white', border: 'none', padding: '0 1rem', fontFamily: 'monospace', fontSize: '0.7rem', cursor: 'pointer' }}>CONFIRM</button>
                             <button onClick={() => setActionId(null)} style={{ backgroundColor: 'transparent', border: '1px solid #a1a1aa', padding: '0 1rem', fontFamily: 'monospace', fontSize: '0.7rem', cursor: 'pointer' }}>CANCEL</button>
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
