import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function CreatePost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [formData, setFormData] = useState({ title: '', content: '', isPrivate: false });
  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:5000/api/posts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setFormData({ title: res.data.title, content: res.data.content, isPrivate: res.data.isPrivate }));
    }
  }, [id, token]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const config = { headers: { Authorization: `Bearer ${token}` } };
    if (id) await axios.put(`http://localhost:5000/api/posts/${id}`, formData, config);
    else await axios.post('http://localhost:5000/api/posts', formData, config);
    navigate('/mine');
  };
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-4xl mb-8 text-zinc-900">{id ? 'Edit Entry' : 'New Entry'}</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block font-mono text-xs text-zinc-400 mb-2">TITLE</label>
          <input type="text" className="w-full bg-transparent border-b border-zinc-200 py-2 focus:outline-none focus:border-zinc-900 font-serif text-2xl text-zinc-900" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
        </div>
        <div>
          <label className="block font-mono text-xs text-zinc-400 mb-2">CONTENT</label>
          <textarea rows="12" className="w-full bg-zinc-50 border border-zinc-200 p-6 focus:outline-none focus:border-zinc-400 font-serif text-lg text-zinc-800 leading-relaxed" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} required />
        </div>
        <div className="flex items-center gap-3">
            <input type="checkbox" id="isPrivate" checked={formData.isPrivate} onChange={e => setFormData({...formData, isPrivate: e.target.checked})} className="accent-black w-4 h-4" />
            <label htmlFor="isPrivate" className="font-mono text-xs text-zinc-600">Make this entry private</label>
        </div>
        <button className="w-full bg-black text-white font-mono py-4 hover:bg-zinc-800 transition uppercase tracking-widest text-sm shadow-lg">{id ? 'Update' : 'Publish'}</button>
      </form>
    </div>
  );
}
