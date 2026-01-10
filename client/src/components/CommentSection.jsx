import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function CommentSection({ post, onUpdate }) {
  const { user, token } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `https://monochrome-agc7.onrender.com/api/posts/${post._id}/comment`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if(onUpdate) onUpdate(res.data);
      setText('');
    } catch (err) {
      console.error(err);
      alert("Failed to post comment");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await axios.delete(
        `https://monochrome-agc7.onrender.com/api/posts/${post._id}/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if(onUpdate) onUpdate(res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e4e4e7' }}>
      <h3 style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#71717a', marginBottom: '1rem', textTransform: 'uppercase' }}>
        LETTERS TO THE EDITOR ({post.comments?.length || 0})
      </h3>

      {user ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <textarea
            style={{ 
                width: '100%', padding: '1rem', border: '1px solid #e4e4e7', 
                backgroundColor: '#fafafa', fontFamily: 'serif', fontSize: '1rem',
                minHeight: '80px', marginBottom: '0.5rem'
            }}
            placeholder="Write your thoughts..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" disabled={loading} style={{ 
              backgroundColor: '#18181b', color: 'white', padding: '0.5rem 1.5rem', 
              fontSize: '0.7rem', fontFamily: 'monospace', cursor: 'pointer', opacity: loading ? 0.5 : 1 
          }}>
            {loading ? 'SENDING...' : 'POST COMMENT'}
          </button>
        </form>
      ) : (
        <div style={{ fontFamily: 'serif', fontStyle: 'italic', color: '#71717a', marginBottom: '2rem' }}>
          <Link to="/login" style={{ textDecoration: 'underline', color: 'black' }}>Log in</Link> to join the discussion.
        </div>
      )}

      <div>
        {post.comments?.map((comment) => (
          <div key={comment._id} style={{ marginBottom: '2rem', borderBottom: '1px solid #f4f4f5', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.7rem', fontFamily: 'monospace' }}>
              <span style={{ fontWeight: 'bold' }}>{comment.user.username}</span>
              <span style={{ color: '#a1a1aa' }}>
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p style={{ fontFamily: 'serif', fontSize: '0.95rem', color: '#52525b', lineHeight: '1.6' }}>
                {comment.text}
            </p>
            {user && (user.id === comment.user._id || user.role === 'admin') && (
              <button onClick={() => handleDelete(comment._id)} style={{ 
                  fontSize: '0.65rem', color: '#991b1b', textDecoration: 'underline', 
                  cursor: 'pointer', fontFamily: 'monospace', marginTop: '0.5rem' 
              }}>
                DELETE
              </button>
            )}
          </div>
        )).reverse()}
      </div>
    </div>
  );
}
