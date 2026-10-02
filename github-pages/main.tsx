import { createRoot } from 'react-dom/client';
import FriendsFirst from '../app/friends-first';
import '../app/globals.css';

const root = document.getElementById('root');

if (!root) throw new Error('Friends First could not find its page container.');

createRoot(root).render(<FriendsFirst />);
