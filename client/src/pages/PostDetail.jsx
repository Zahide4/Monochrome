import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ReactionBar from '../components/ReactionBar';
import CommentSection from '../components/CommentSection';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [post, setPost] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`https://monochrome-agc7.onrender.com/api/posts/${id}`, { headers });
        setPost(res.data);
      } catch (err) { navigate('/'); }
    };
    fetchPost();
  }, [id, token, navigate]);

  if (!post) return <div className="font-mono" style={{ color: '#a1a1aa' }}>Loading...</div>;

  return (
    <div className="fade-in">
      {/* BANNED NOTICE FOR AUTHOR */}
      {post.hiddenByAdmin && (
        <div style={{ 
            padding: '1.5rem', marginBottom: '2rem', 
            background: '#fee2e2', border: '1px solid #ef4444', 
            color: '#7f1d1d' 
        }}>
            <h3 className="font-mono" style={{ margin: 0, fontWeight: 'bold' }}>⚠️ CONTENT REMOVED BY ADMIN</h3>
            <p className="font-serif" style={{ marginTop: '0.5rem' }}>
               Reason: {post.takedownReason || 'Violates community guidelines.'}
            </p>
        </div>
      )}

      <div className="detail-meta">
        {new Date(post.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      
      <h1 className="detail-title">{post.title}</h1>
      
      <div className="detail-byline">
          <span className="uppercase">BY {post.author?.username}</span>
          {post.isPrivate && <span style={{ color: '#a1a1aa' }}>| RESTRICTED ACCESS</span>}
      </div>

      <div className="detail-content">{post.content}</div>

      <div style={{ marginTop: '3rem', marginBottom: '5rem' }}>
        <h3 className="font-mono uppercase" style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>Reader Reactions</h3>
        <ReactionBar post={post} onUpdate={setPost} />
        <CommentSection post={post} onUpdate={setPost} />
      </div>
    </div>
  );
}
