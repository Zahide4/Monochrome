import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MyPosts() {
  const [posts, setPosts] = useState([]);
  const { token } = useAuth();

  const fetchPosts = async () => {
    const res = await axios.get('https://monochrome-agc7.onrender.com/api/posts/mine', { headers: { Authorization: `Bearer ${token}` } });
    setPosts(res.data);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleDelete = async (id) => {
    if(!confirm("Delete this record?")) return;
    await axios.delete(`https://monochrome-agc7.onrender.com/api/posts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    fetchPosts();
  };

  return (
    <div>
      <h1 className="header-title" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>My Archives</h1>
      <div>
        {posts.map(post => (
          <div key={post._id} className="list-item">
            <div>
              <Link to={`/post/${post._id}`} className="list-title">{post.title}</Link>
              <div className="list-meta">{post.isPrivate ? "PRIVATE" : "PUBLIC"} {post.hiddenByAdmin && <span style={{ color: "#991b1b", fontWeight: "bold", marginLeft: "10px" }}>[TAKEN DOWN]</span>}</div>
            </div>
            <div className="list-actions">
              <Link to={`/edit/${post._id}`} style={{ color: '#52525b', textDecoration: 'underline' }}>EDIT</Link>
              <button onClick={() => handleDelete(post._id)} className="action-delete">DELETE</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
