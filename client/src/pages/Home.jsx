import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReactionBar from '../components/ReactionBar';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const { token } = useAuth();

  const fetchPosts = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('http://localhost:5000/api/posts', { headers });
      setPosts(res.data);
    } catch (err) {}
  };

  useEffect(() => { fetchPosts(); }, [token]);

  // Callback to update specific post in state without full reload
  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  };

  return (
    <div className="space-y-12">
      <header className="mb-12 border-b-2 border-zinc-900 pb-6">
        <h1 className="font-serif text-7xl mb-2 text-zinc-900 tracking-tighter">The Daily.</h1>
        <div className="flex justify-between items-end font-mono text-xs text-zinc-500 uppercase tracking-widest">
          <p>Volume 4 • {new Date().getFullYear()}</p>
          <p>Curated Perspectives</p>
        </div>
      </header>
      
      {/* Masonry Layout using Columns */}
      <div className="columns-1 md:columns-2 gap-8 space-y-8">
        {posts.map(post => (
          <article key={post._id} className="break-inside-avoid mb-8 border-b border-zinc-200 pb-8 group">
             
             {/* Meta Header */}
             <div className="flex justify-between items-center mb-3 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-zinc-200 rounded-full group-hover:bg-zinc-900 transition-colors"></div>
                  <span>{post.author?.username || 'Unknown'}</span>
                </div>
                <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month:'short', day:'numeric' })}</span>
             </div>

             <Link to={`/post/${post._id}`} className="block">
               <h2 className="font-serif text-3xl leading-none text-zinc-900 mb-3 group-hover:text-zinc-600 transition-colors">
                 {post.title}
               </h2>
               <p className="font-serif text-sm text-zinc-600 leading-relaxed line-clamp-4 text-justify">
                 {post.content}
               </p>
             </Link>
             
             <div className="mt-4 flex justify-between items-center">
                <ReactionBar post={post} onUpdate={handlePostUpdate} />
                {post.isPrivate && <span className="font-mono text-[10px] bg-zinc-100 px-1 py-0.5 text-zinc-500">PRIVATE</span>}
             </div>
          </article>
        ))}
      </div>
    </div>
  );
}
