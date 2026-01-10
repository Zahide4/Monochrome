import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const [posts, setPosts] = useState([]);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // UI State for Taking Down
  const [activeActionId, setActiveActionId] = useState(null);
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

  const submitTakeDown = async (post) => {
    if (!reason.trim()) return alert("Reason is required.");
    try {
      await axios.put(`https://monochrome-agc7.onrender.com/api/posts/${post._id}`, 
        { hiddenByAdmin: true, takedownReason: reason }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveActionId(null);
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

  return (
    <div className="fade-in">
      <div style={{ borderBottom: '1px solid #e4e4e7', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <h1 className="font-serif" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Admin Console</h1>
        <p className="font-mono" style={{ color: '#71717a', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
           SYSTEM STATUS: ACTIVE • ID: {user?.username?.toUpperCase()}
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {posts.map(post => (
          <div key={post._id} style={{ 
              padding: '1.5rem', border: '1px solid #e4e4e7',
              backgroundColor: post.hiddenByAdmin ? '#fff1f2' : 'white',
              position: 'relative'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                    <h3 className="font-serif" style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>{post.title}</h3>
                    <div className="font-mono" style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>
                       AUTHOR: {post.author?.username}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {post.isPrivate && <span style={{ fontSize: '9px', background: '#18181b', color: 'white', padding: '3px 6px', fontFamily: 'monospace' }}>PRIVATE</span>}
                    {post.hiddenByAdmin && <span style={{ fontSize: '9px', background: '#991b1b', color: 'white', padding: '3px 6px', fontFamily: 'monospace' }}>TAKEN DOWN</span>}
                </div>
             </div>
             
             {/* ACTIVE BAN INTERFACE */}
             {activeActionId === post._id ? (
                 <div style={{ marginTop: '1rem', padding: '1rem', background: '#f4f4f5', border: '1px solid #e4e4e7' }}>
                    <p className="font-mono" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>REASON FOR REMOVAL:</p>
                    <input 
                        autoFocus
                        type="text" 
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="e.g. Violation of content policy..."
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', marginBottom: '0.5rem', border: '1px solid #d4d4d8' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => submitTakeDown(post)} style={{ backgroundColor: '#991b1b', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'monospace' }}>CONFIRM TAKE DOWN</button>
                        <button onClick={() => setActiveActionId(null)} style={{ backgroundColor: 'transparent', border: '1px solid #52525b', padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'monospace' }}>CANCEL</button>
                    </div>
                 </div>
             ) : (
                 <>
                    {post.hiddenByAdmin && (
                        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            REASON: {post.takedownReason || 'No reason provided'}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #f4f4f5', paddingTop: '1rem' }}>
                        {post.hiddenByAdmin ? (
                            <button onClick={() => handleRestore(post)} className="font-mono" style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#15803d', cursor: 'pointer' }}>
                            RESTORE POST
                            </button>
                        ) : (
                            <button onClick={() => { setActiveActionId(post._id); setReason(''); }} className="font-mono" style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#991b1b', cursor: 'pointer' }}>
                            TAKE DOWN
                            </button>
                        )}
                        
                        <button onClick={() => navigate(`/edit/${post._id}`)} className="font-mono" style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#52525b', cursor: 'pointer' }}>
                        EDIT CONTENT
                        </button>
                    </div>
                 </>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}
