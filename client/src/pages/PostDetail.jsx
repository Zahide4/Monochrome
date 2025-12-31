import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ReactionBar from '../components/ReactionBar';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [post, setPost] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`http://localhost:5000/api/posts/${id}`, { headers });
        setPost(res.data);
      } catch (err) { navigate('/'); }
    };
    fetchPost();
  }, [id, token, navigate]);

  if (!post) return <div className="font-mono text-zinc-400 mt-10">Loading...</div>;

  return (
    <div className="animate-in fade-in duration-500 max-w-2xl mx-auto">
      
      {/* Editorial Header */}
      <div className="text-center mb-10">
        <div className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-4">
           {new Date(post.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <h1 className="font-serif text-5xl md:text-6xl mb-6 leading-tight text-zinc-900">{post.title}</h1>
        <div className="flex justify-center items-center gap-4 font-mono text-xs border-y border-zinc-100 py-4">
            <span className="font-bold text-zinc-900">BY {post.author?.username.toUpperCase()}</span>
            {post.isPrivate && <span className="text-zinc-400">| RESTRICTED ACCESS</span>}
        </div>
      </div>

      {/* Content with Drop Cap style logic roughly applied via leading/spacing */}
      <div className="font-serif text-lg leading-loose text-zinc-800 whitespace-pre-wrap text-justify">
        {post.content}
      </div>

      <div className="mt-12 mb-20">
        <h3 className="font-mono text-xs text-zinc-400 mb-2 uppercase">Reader Reactions</h3>
        <ReactionBar post={post} onUpdate={setPost} />
      </div>
    </div>
  );
}
