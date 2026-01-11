import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export default function Register() {
  const [data, setData] = useState({ email: '', username: '', password: '' });
  const [errors, setErrors] = useState([]);
  const navigate = useNavigate();
  const { login } = useAuth(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]); 
    
    try {
      await axios.post('https://monochrome-w1vb.onrender.com/api/register', data);
      navigate('/login');
    } catch (err) {
      
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else if (err.response?.data?.message) {
        setErrors([err.response.data.message]);
      } else {
        setErrors(['Registration failed. Please try again.']);
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post('https://monochrome-w1vb.onrender.com/api/google-login', {
        token: credentialResponse.credential
      });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) { 
      setErrors(['Google Signup failed. Please try again.']);
    }
  };

  return (
    <div className="auth-wrapper fade-in">
      <h1 className="auth-title">Join Monochrome</h1>
      
      
      {errors.length > 0 && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1.5rem', 
          background: '#fee2e2', 
          border: '1px solid #ef4444', 
          borderRadius: '6px'
        }}>
          {errors.map((error, index) => (
            <p key={index} style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.875rem', 
              color: '#991b1b', 
              margin: '0.25rem 0' 
            }}>
              • {error}
            </p>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
         <input 
          placeholder="Display Name" 
          className="auth-input"
          value={data.username}
          onChange={e => setData({...data, username: e.target.value})}
        />
        <input 
          placeholder="Email Address" 
          type="email" 
          className="auth-input"
          value={data.email}
          onChange={e => setData({...data, email: e.target.value})}
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="auth-input"
          value={data.password}
          onChange={e => setData({...data, password: e.target.value})}
        />
        <p style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.75rem', 
          color: '#71717a', 
          marginTop: '-0.5rem',
          marginBottom: '1rem'
        }}>
          Password must be at least 8 characters and contain uppercase, lowercase, and a number
        </p>
        <button className="btn-primary">Create Account</button>
      </form>

      <div className="divider">
        <span className="divider-text">Or</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrors(['Google Signup failed. Please try again.'])}
            theme="outline" size="large" width="350" text="signup_with"
        />
        <Link to="/login" className="font-mono" style={{ fontSize: '0.75rem', color: '#71717a' }}>Already have an account? Login</Link>
      </div>
    </div>
  );
}