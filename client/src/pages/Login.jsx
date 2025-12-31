import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [data, setData] = useState({ email: '', password: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://elegant-blog-api.onrender.com/api/login', data);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) { alert('Login failed. Check credentials.'); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post('https://elegant-blog-api.onrender.com/api/google-login', {
        token: credentialResponse.credential
      });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) { alert('Google Login failed'); }
  };

  return (
    <div className="auth-wrapper fade-in">
      <h1 className="auth-title">Sign In</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        <input 
          placeholder="Email Address" type="email" className="auth-input"
          onChange={e => setData({...data, email: e.target.value})}
        />
        <input 
          type="password" placeholder="Password" className="auth-input"
          onChange={e => setData({...data, password: e.target.value})}
        />
        <button className="btn-primary">Continue with Email</button>
      </form>

      <div className="divider">
        <span className="divider-text">Or</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => { console.log('Login Failed'); }}
            theme="outline" size="large" width="350" text="continue_with"
        />
        <Link to="/register" className="font-mono" style={{ fontSize: '0.75rem', color: '#71717a' }}>Need an account? Join</Link>
      </div>
    </div>
  );
}
