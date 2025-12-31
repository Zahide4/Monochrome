import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReactionBar from '../components/ReactionBar';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('https://monochrome-agc7.onrender.com/api/posts', { headers });
        setPosts(res.data);
      } catch (err) {}
    };
    fetchPosts();
  }, [token]);

  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  };

  return (
    <div>
      <header className="editorial-header">
        <h1 className="header-title">The Daily.</h1>
        <div className="header-meta">
          <p>Volume 4 • {new Date().getFullYear()}</p>
          <p>Curated Perspectives</p>
        </div>
      </header>
      
      <div className="masonry-grid">
        {posts.map(post => (
          <article key={post._id} className="post-card">
             <div className="card-meta">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="author-dot"></span>
                  <span>{post.author?.username || 'Unknown'}</span>
                </div>
                <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month:'short', day:'numeric' })}</span>
             </div>

             <Link to={`/post/${post._id}`} style={{ display: 'block' }}>
               <h2 className="card-title">{post.title}</h2>
               <p className="card-excerpt">{post.content}</p>
             </Link>
             
             <div className="card-footer">
                <ReactionBar post={post} onUpdate={handlePostUpdate} />
                {post.isPrivate && <span className="tag-private">PRIVATE</span>}
             </div>
          </article>
        ))}
      </div>
    </div>
  );
}
