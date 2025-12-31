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
      const res = await axios.post('https://monochrome-agc7.onrender.com/api/login', data);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) { alert('Login failed. Check credentials.'); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post('https://monochrome-agc7.onrender.com/api/google-login', {
        token: credentialResponse.credential
      });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      alert('Google Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto pt-20">
      <h1 className="font-serif text-4xl mb-8 text-center text-zinc-900">Sign In</h1>

      <form onSubmit={handleSubmit} className="space-y-6 mb-8">
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
        <button className="w-full bg-black text-white font-mono py-4 hover:bg-zinc-800 transition uppercase text-xs mt-4 tracking-widest">
          Continue with Email
        </button>
      </form>

      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
        <div className="relative flex justify-center text-xs uppercase font-mono"><span className="bg-white px-2 text-zinc-400">Or</span></div>
      </div>

      <div className="flex justify-center flex-col items-center gap-4">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => { console.log('Login Failed'); }}
          theme="outline"
          size="large"
          width="350"
          text="continue_with"
        />
        <Link to="/register" className="font-mono text-xs text-zinc-500 hover:text-black">Need an account? Join</Link>
      </div>
    </div>
  );
}
