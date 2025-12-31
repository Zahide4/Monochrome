import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const EMOJIS = ['👍', '❤️', '🔥', '👏', '😲'];

export default function ReactionBar({ post, onUpdate }) {
  const { user, token } = useAuth();
  
  const reactionCounts = post.reactions?.reduce((acc, curr) => {
    if (!acc[curr.emoji]) acc[curr.emoji] = [];
    acc[curr.emoji].push(curr.user);
    return acc;
  }, {}) || {};

  const handleReact = async (emoji) => {
    if (!user) return alert("Please login to react");
    try {
      const res = await axios.put(`https://monochrome-agc7.onrender.com/api/posts/${post._id}/react`, 
        { emoji }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onUpdate) onUpdate(res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="reaction-wrapper">
      {EMOJIS.map(emoji => {
        const usersWhoReacted = reactionCounts[emoji] || [];
        const count = usersWhoReacted.length;
        const hasReacted = user && usersWhoReacted.includes(user.id);

        return (
          <button 
            key={emoji}
            onClick={(e) => { e.preventDefault(); handleReact(emoji); }}
            className={`reaction-btn ${hasReacted ? 'active' : ''}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
