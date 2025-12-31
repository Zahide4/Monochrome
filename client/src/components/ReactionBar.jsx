import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const EMOJIS = ['👍', '❤️', '🔥', '👏', '😲'];

export default function ReactionBar({ post, onUpdate }) {
  const { user, token } = useAuth();
  
  // Group reactions by emoji
  // { '👍': [userId1, userId2], '❤️': [] }
  const reactionCounts = post.reactions?.reduce((acc, curr) => {
    if (!acc[curr.emoji]) acc[curr.emoji] = [];
    acc[curr.emoji].push(curr.user);
    return acc;
  }, {}) || {};

  const handleReact = async (emoji) => {
    if (!user) return alert("Please login to react");
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/${post._id}/react`, 
        { emoji }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onUpdate) onUpdate(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-100">
      {EMOJIS.map(emoji => {
        const usersWhoReacted = reactionCounts[emoji] || [];
        const count = usersWhoReacted.length;
        const hasReacted = user && usersWhoReacted.includes(user.id);

        return (
          <button 
            key={emoji}
            onClick={(e) => { e.preventDefault(); handleReact(emoji); }} // Prevent link navigation
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono transition-all
              ${hasReacted ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-200'}
            `}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
