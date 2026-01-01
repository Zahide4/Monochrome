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
  const { user, logout } = useAuth();
  return (

    <div>


      <header className="editorial-header">


        <div className="editorial-items">
          <h1 className="header-title">Where your <span>words</span> <br />take center stage.</h1>

          <div className="nav-links">
            <div className="header-buttons">
              {user ? (
                <>
                  <Link className='header-btn header-btn-dark' to="/create"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-tool-icon lucide-pen-tool"><path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" /><path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18" /><path d="m2.3 2.3 7.286 7.286" /><circle cx="11" cy="11" r="2" /></svg> Start Writing</Link>
                  <Link className='header-btn ' to="/mine"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scroll-icon lucide-scroll"><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></svg> My Logs</Link>
                  {/* <button onClick={logout} className="uppercase">Logout</button> */}
                </>
              ) : (
                <>
                  <Link className='header-btn header-btn-dark' to="/register"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-tool-icon lucide-pen-tool"><path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" /><path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18" /><path d="m2.3 2.3 7.286 7.286" /><circle cx="11" cy="11" r="2" /></svg> Start Writing</Link>
                </>
              )}
            </div>
          </div>
          <div className="header-meta">
            <p>{formatDate(date)} • {new Date().getFullYear()}</p>
            <p>Curated Perspectives</p>
          </div>
        </div>
        <div className='header-img'>
          <img
            src="https://ik.imagekit.io/monochromecremier/public/logo.webp"
            alt="Monochrome Logo"
            className="header-logo"
          />

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
