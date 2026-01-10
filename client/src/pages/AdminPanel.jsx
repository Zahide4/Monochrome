import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const [posts, setPosts] = useState([]);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
       navigate('/');
    } else {
       fetchPosts();
    }
  }, [user, navigate]);

  const fetchPosts = async () => {
    try {
      const res = await axios.get('https://monochrome-agc7.onrender.com/api/posts', { 
         headers: { Authorization: `Bearer ${token}` } 
      });
      setPosts(res.data);
    } catch (err) { console.error(err); }
  };

  const toggleAdminHide = async (post) => {
    try {
      const newStatus = !post.hiddenByAdmin;
      await axios.put(`https://monochrome-agc7.onrender.com/api/posts/${post._id}`, 
        { hiddenByAdmin: newStatus }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPosts();
    } catch (err) { alert('Failed to update'); }
  };

  return (
    <div className="fade-in">
      <div style={{ borderBottom: '1px solid #e4e4e7', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 className="header-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Admin Console</h1>
        <p className="font-mono" style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>
           LOGGED IN AS: {user?.username?.toUpperCase()}
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {posts.map(post => (
          <div key={post._id} style={{ 
              padding: '1.5rem', border: '1px solid #e4e4e7',
              background: post.hiddenByAdmin ? '#fafafa' : 'white',
              opacity: post.hiddenByAdmin ? 0.6 : 1,
              position: 'relative'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', margin: 0 }}>{post.title}</h3>
                <span className="font-mono" style={{ fontSize: '0.75rem', color: '#71717a' }}>
                  BY {post.author?.username?.toUpperCase()}
                </span>
             </div>
             
             <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={() => toggleAdminHide(post)}
                  className="font-mono"
                  style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 'bold', 
                    color: post.hiddenByAdmin ? '#15803d' : '#991b1b',
                    border: '1px solid currentColor',
                    padding: '4px 8px',
                    cursor: 'pointer'
                  }}
                >
                   {post.hiddenByAdmin ? 'PUBLISH (UNHIDE)' : 'TAKE DOWN (HIDE)'}
                </button>
                <button 
                   onClick={() => navigate(`/edit/${post._id}`)}
                   className="font-mono"
                   style={{ fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #000', padding: '4px 8px', cursor: 'pointer' }}
                >
                   EDIT CONTENT
                </button>
             </div>
             <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                {post.isPrivate && <span className="font-mono" style={{ fontSize: '9px', background: 'black', color: 'white', padding: '2px 4px' }}>PRIVATE</span>}
                {post.hiddenByAdmin && <span className="font-mono" style={{ fontSize: '9px', background: '#991b1b', color: 'white', padding: '2px 4px' }}>BANNED BY ADMIN</span>}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
