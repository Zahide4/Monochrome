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
      } catch (err) { }
    };
    fetchPosts();
  }, [token]);

  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  };
  function formatDate(date) {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });

    const suffix =
      day % 10 === 1 && day !== 11 ? 'st' :
        day % 10 === 2 && day !== 12 ? 'nd' :
          day % 10 === 3 && day !== 13 ? 'rd' : 'th';

    return `${month} ${day}${suffix}`;
  }
  const date = new Date();
  return (
    <div>
      <header className="editorial-header">


        <div className="editorial-items">
          <h1 className="header-title">Where your <span>words</span> <br />take center stage.</h1>
          <div className="header-meta">
            <p>{formatDate(date)} • {new Date().getFullYear()}</p>
            <p>Curated Perspectives</p>
          </div>
        </div>
        <div className='header-img'>
          <img src="/logo-main2.webp" alt="Monochrome Logo" className="header-logo" />
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
              <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
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
