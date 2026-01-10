import AdminPanel from './pages/AdminPanel';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreatePost from './pages/CreatePost';
import MyPosts from './pages/MyPosts';
import PostDetail from './pages/PostDetail';
import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";



const PrivateRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

function App() {
  useEffect(() => {
    const lenis = new Lenis({
      smooth: true,
      lerp: 0.1, // lower = smoother
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);


  return (
    <AuthProvider>
      <Router>
        <div className="spinner-container">
          <div className="spinner center">
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
            <div className="spinner-blade"></div>
          </div>
        </div>
        <div className="app-wrapper">

          <Navbar />
          <main className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/create" element={<PrivateRoute><CreatePost /></PrivateRoute>} />
              <Route path="/edit/:id" element={<PrivateRoute><CreatePost /></PrivateRoute>} />
              <Route path="/mine" element={<PrivateRoute><MyPosts /></PrivateRoute>} />
              <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}
export default App;
