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
      <h1 className="font-serif text-4xl mb-8 text-zinc-900">My Archives</h1>
      <div className="divide-y divide-zinc-200">
        {posts.map(post => (
          <div key={post._id} className="py-6 flex justify-between items-center group">
            <div>
              <Link to={`/post/${post._id}`} className="font-serif text-xl text-zinc-800 hover:text-black hover:underline decoration-zinc-300">{post.title}</Link>
              <div className="font-mono text-xs text-zinc-400 mt-1">{post.isPrivate ? "PRIVATE" : "PUBLIC"}</div>
            </div>
            <div className="flex gap-4 font-mono text-xs opacity-0 group-hover:opacity-100 transition">
              <Link to={`/edit/${post._id}`} className="hover:underline text-zinc-600">EDIT</Link>
              <button onClick={() => handleDelete(post._id)} className="text-red-800 hover:text-red-600">DELETE</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
