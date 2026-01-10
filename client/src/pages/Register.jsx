import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export default function Register() {
  const [data, setData] = useState({ email: '', username: '', password: '' });
  const navigate = useNavigate();
  const { login } = useAuth(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://monochrome-w1vb.onrender.com/api/register', data);
      navigate('/login');
    } catch (err) { alert(err.response?.data || 'Registration failed'); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post('https://monochrome-w1vb.onrender.com/api/google-login', {
        token: credentialResponse.credential
      });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) { alert('Google Signup failed'); }
  };

  return (
    <div className="auth-wrapper fade-in">
      <h1 className="auth-title">Join the Club</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
         <input 
          placeholder="Display Name" className="auth-input"
          onChange={e => setData({...data, username: e.target.value})}
        />
        <input 
          placeholder="Email Address" type="email" className="auth-input"
          onChange={e => setData({...data, email: e.target.value})}
        />
        <input 
          type="password" placeholder="Password" className="auth-input"
          onChange={e => setData({...data, password: e.target.value})}
        />
        <button className="btn-primary">Create Account</button>
      </form>

      <div className="divider">
        <span className="divider-text">Or</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => { console.log('Signup Failed'); }}
            theme="outline" size="large" width="350" text="signup_with"
        />
        <Link to="/login" className="font-mono" style={{ fontSize: '0.75rem', color: '#71717a' }}>Already have an account? Login</Link>
      </div>
    </div>
  );
}
