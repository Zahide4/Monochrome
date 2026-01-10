import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Define SVGs for each reaction type
const REACTION_TYPES = [
  { 
    id: 'like', 
    label: 'Like',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thumbs-up-icon lucide-thumbs-up"><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path d="M7 10v12"/></svg>
    )
  },
  { 
    id: 'heart', 
    label: 'Love',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heart-icon lucide-heart"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>
    )
  }
];

export default function ReactionBar({ post, onUpdate }) {
  const { user, token } = useAuth();
  
  // Group reactions by the 'id' (e.g., 'like', 'heart')
  const reactionCounts = post.reactions?.reduce((acc, curr) => {
    if (!acc[curr.emoji]) acc[curr.emoji] = [];
    acc[curr.emoji].push(curr.user);
    return acc;
  }, {}) || {};

  const handleReact = async (reactionId) => {
    if (!user) return alert("Please login to react");
    try {
      // We send the ID ('like' or 'heart') to the backend
      const res = await axios.put(`https://monochrome-w1vb.onrender.com/api/posts/${post._id}/react`, 
        { emoji: reactionId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onUpdate) onUpdate(res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="reaction-wrapper">
      {REACTION_TYPES.map((type) => {
        const usersWhoReacted = reactionCounts[type.id] || [];
        const count = usersWhoReacted.length;
        const hasReacted = user && usersWhoReacted.includes(user.id);

        return (
          <button 
            key={type.id}
            title={type.label}
            onClick={(e) => { e.preventDefault(); handleReact(type.id); }}
            className={`reaction-btn ${hasReacted ? 'active' : ''}`}
          >
            {/* Render the SVG */}
            <span className="reaction-icon">{type.icon}</span>
            {count >= 0 && <span className="reaction-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}