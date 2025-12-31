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
      axios.get(`https://monochrome-agc7.onrender.com/api/posts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setFormData({ title: res.data.title, content: res.data.content, isPrivate: res.data.isPrivate }));
    }
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const config = { headers: { Authorization: `Bearer ${token}` } };
    if (id) await axios.put(`https://monochrome-agc7.onrender.com/api/posts/${id}`, formData, config);
    else await axios.post('https://monochrome-agc7.onrender.com/api/posts', formData, config);
    navigate('/mine');
  };

  return (
    <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
      <h1 className="header-title" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>
        {id ? 'Edit Entry' : 'New Entry'}
      </h1>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label className="font-mono" style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>TITLE</label>
          <input 
            type="text" className="editor-input-title"
            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required 
          />
        </div>
        <div>
          <label className="font-mono" style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>CONTENT</label>
          <textarea 
            className="editor-textarea"
            value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} required 
          />
        </div>
        <div className="checkbox-group">
            <input 
              type="checkbox" id="isPrivate" 
              checked={formData.isPrivate} onChange={e => setFormData({...formData, isPrivate: e.target.checked})} 
            />
            <label htmlFor="isPrivate" className="checkbox-label">Make this entry private</label>
        </div>
        <button className="btn-primary" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
          {id ? 'Update' : 'Publish'}
        </button>
      </form>
    </div>
  );
}
