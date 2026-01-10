import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import '../index.css'; // Import the CSS file

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
        `https://monochrome-w1vb.onrender.com/api/posts/${post._id}/comment`,
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
        `https://monochrome-w1vb.onrender.com/api/posts/${post._id}/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if(onUpdate) onUpdate(res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="comment-section-container">
      <h3 className="comment-section-header">
        LETTERS TO THE EDITOR ({post.comments?.length || 0})
      </h3>

      {user ? (
        <form onSubmit={handleSubmit} className="comment-form">
          <textarea
            className="comment-textarea"
            placeholder="Write your thoughts..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="comment-submit-btn"
          >
            {loading ? 'SENDING...' : 'POST COMMENT'}
          </button>
        </form>
      ) : (
        <div className="comment-login-prompt">
          <Link to="/login" className="comment-login-link">Log in</Link> to join the discussion.
        </div>
      )}

      <div>
        {post.comments?.map((comment) => (
          <div key={comment._id} className="comment-item">
            <div className="comment-meta">
              <span className="comment-author">{comment.user.username}</span>
              <span className="comment-date">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="comment-text">
                {comment.text}
            </p>
            {user && (user.id === comment.user._id || user.role === 'admin') && (
              <button 
                onClick={() => handleDelete(comment._id)} 
                className="comment-delete-btn"
              >
                DELETE
              </button>
            )}
          </div>
        )).reverse()}
      </div>
    </div>
  );
}