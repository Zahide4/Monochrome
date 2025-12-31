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
      await axios.post('http://localhost:5000/api/register', data);
      // After manual register, go to login
      navigate('/login');
    } catch (err) { alert(err.response?.data || 'Registration failed'); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // We use the same 'google-login' endpoint because it handles BOTH Login and Register (Upsert)
      const res = await axios.post('http://localhost:5000/api/google-login', {
        token: credentialResponse.credential
      });

      // If successful, log the user in immediately
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Google Signup failed. Please check console.');
    }
  };

  return (
    <div className="max-w-md mx-auto pt-20">
      <h1 className="font-serif text-4xl mb-8 text-center text-zinc-900">Join the Club</h1>

      {/* Manual Form */}
      <form onSubmit={handleSubmit} className="space-y-6 mb-8">
        <input
          placeholder="Display Name"
          className="w-full bg-transparent border-b border-zinc-300 py-3 focus:outline-none focus:border-black font-mono text-sm text-zinc-900 placeholder:text-zinc-400"
          onChange={e => setData({ ...data, username: e.target.value })}
        />
        <input
          placeholder="Email Address"
          type="email"
          className="w-full bg-transparent border-b border-zinc-300 py-3 focus:outline-none focus:border-black font-mono text-sm text-zinc-900 placeholder:text-zinc-400"
          onChange={e => setData({ ...data, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full bg-transparent border-b border-zinc-300 py-3 focus:outline-none focus:border-black font-mono text-sm text-zinc-900 placeholder:text-zinc-400"
          onChange={e => setData({ ...data, password: e.target.value })}
        />
        <button className="w-full bg-black text-white font-mono py-4 hover:bg-zinc-800 transition uppercase text-xs mt-4 tracking-widest">Create Account</button>
      </form>

      {/* Divider */}
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
        <div className="relative flex justify-center text-xs uppercase font-mono"><span className="bg-white px-2 text-zinc-400">Or</span></div>
      </div>

      {/* Google Button */}
      <div className="flex justify-center flex-col items-center gap-4">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => { console.log('Signup Failed'); }}
          theme="outline"
          size="large"
          width="350"
          text="signup_with"
        />
        <Link to="/login" className="font-mono text-xs text-zinc-500 hover:text-black">Already have an account? Login</Link>
      </div>
    </div>
  );
}
