import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const initialForm = { title: '', description: '', tags: '', resourceUrl: '' };
const prettyDate = (date) => new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('skillvault_token') || '');
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('skillvault_user') || 'null'); } catch { return null; } });
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [posts, setPosts] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('feed');
  const [postForm, setPostForm] = useState(initialForm);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [editingId, setEditingId] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map(p => p._id)), [bookmarks]);
  const visiblePosts = useMemo(() => {
    const source = activeTab === 'bookmarks' ? bookmarks : posts;
    const query = search.trim().toLowerCase();
    if (!query) return source;
    return source.filter(p => [p.title, p.description, ...(p.tags || []), p.author?.name].join(' ').toLowerCase().includes(query));
  }, [activeTab, bookmarks, posts, search]);

  function notify(text, isError = false) {
    setMessage(isError ? '' : text); setError(isError ? text : '');
    window.setTimeout(() => { setMessage(''); setError(''); }, 4500);
  }
  function saveSession(data) {
    localStorage.setItem('skillvault_token', data.token); localStorage.setItem('skillvault_user', JSON.stringify(data.user));
    setToken(data.token); setUser(data.user);
  }
  function logout() {
    localStorage.removeItem('skillvault_token'); localStorage.removeItem('skillvault_user');
    setToken(''); setUser(null); setPosts([]); setBookmarks([]); setNotes([]); setActiveTab('feed'); notify('You have logged out.');
  }

  async function loadPosts() {
    const data = await api('/posts'); setPosts(data.posts);
  }
  async function loadPrivateData(currentToken = token) {
    const [b, n] = await Promise.all([api('/bookmarks', { token: currentToken }), api('/notes', { token: currentToken })]);
    setBookmarks(b.posts); setNotes(n.notes);
  }
  async function refreshAll() {
    setLoading(true);
    try { await loadPosts(); if (token) await loadPrivateData(); }
    catch (e) { notify(e.message, true); }
    finally { setLoading(false); }
  }
  useEffect(() => { refreshAll(); }, [token]);

  async function submitAuth(e) {
    e.preventDefault(); setLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(authForm) });
      saveSession(data); setAuthForm({ name: '', email: '', password: '' }); notify(`Welcome${data.user.name ? `, ${data.user.name}` : ''}!`);
    } catch (e) { notify(e.message, true); }
    finally { setLoading(false); }
  }

  async function submitPost(e) {
    e.preventDefault(); if (!token) return notify('Log in to publish a post.', true);
    const body = { ...postForm, tags: postForm.tags.split(',').map(t => t.trim()).filter(Boolean) };
    setLoading(true);
    try {
      if (editingId) await api(`/posts/${editingId}`, { method: 'PUT', token, body: JSON.stringify(body) });
      else await api('/posts', { method: 'POST', token, body: JSON.stringify(body) });
      setPostForm(initialForm); setEditingId(''); setShowComposer(false); await loadPosts(); notify(editingId ? 'Post updated.' : 'Your knowledge is now shared!');
    } catch (e) { notify(e.message, true); }
    finally { setLoading(false); }
  }

  function startEdit(post) {
    setPostForm({ title: post.title, description: post.description, tags: (post.tags || []).join(', '), resourceUrl: post.resourceUrl || '' });
    setEditingId(post._id); setShowComposer(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function deletePost(post) {
    if (!window.confirm(`Delete “${post.title}”?`)) return;
    try { await api(`/posts/${post._id}`, { method: 'DELETE', token }); await loadPosts(); notify('Post deleted.'); }
    catch (e) { notify(e.message, true); }
  }
  async function toggleBookmark(post) {
    if (!token) return notify('Log in to save bookmarks.', true);
    const isSaved = bookmarkedIds.has(post._id);
    try {
      await api(`/bookmarks/${post._id}`, { method: isSaved ? 'DELETE' : 'POST', token });
      await loadPrivateData(); notify(isSaved ? 'Bookmark removed.' : 'Added to bookmarks.');
    } catch (e) { notify(e.message, true); }
  }
  async function submitNote(e) {
    e.preventDefault();
    try { await api('/notes', { method: 'POST', token, body: JSON.stringify(noteForm) }); setNoteForm({ title: '', content: '' }); await loadPrivateData(); notify('Personal note saved.'); }
    catch (e) { notify(e.message, true); }
  }
  async function deleteNote(id) {
    try { await api(`/notes/${id}`, { method: 'DELETE', token }); await loadPrivateData(); notify('Note deleted.'); }
    catch (e) { notify(e.message, true); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#home" onClick={() => setActiveTab('feed')}><span className="brand-mark">S</span><span>Skill<span className="brand-light">Vault</span><small>YOUR DEVELOPER KNOWLEDGE HUB</small></span></a>
      <div className="top-actions"><span className="status-dot" /> <span className="status-label">Knowledge grows when shared</span>{user ? <><span className="user-chip">{user.name?.slice(0, 1).toUpperCase()}</span><span className="user-name">{user.name}</span><button className="button button-quiet button-small" onClick={logout}>Log out</button></> : <a className="button button-outline button-small" href="#auth">Sign in</a>}</div>
    </header>

    <main className="layout">
      <aside className="sidebar">
        <div className="side-label">WORKSPACE</div>
        <button className={`nav-item ${activeTab === 'feed' ? 'active' : ''}`} onClick={() => setActiveTab('feed')}><span>⌂</span> Explore feed <span className="nav-count">{posts.length}</span></button>
        <button className={`nav-item ${activeTab === 'bookmarks' ? 'active' : ''}`} onClick={() => { if (!token) return notify('Log in to view bookmarks.', true); setActiveTab('bookmarks'); }}><span>◇</span> Bookmarks <span className="nav-count">{bookmarks.length}</span></button>
        <button className={`nav-item ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => { if (!token) return notify('Log in to view personal notes.', true); setActiveTab('notes'); }}><span>▤</span> My notes <span className="nav-count">{notes.length}</span></button>
        <div className="side-divider" />
        <div className="side-label">POPULAR TAGS</div>
        <div className="tag-cloud">{['javascript', 'react', 'nodejs', 'dsa', 'mongodb', 'career'].map(tag => <button key={tag} onClick={() => { setSearch(tag); setActiveTab('feed'); }} className="tag-filter"># {tag}</button>)}</div>
        <div className="sidebar-card"><div className="sidebar-card-icon">✦</div><strong>Build your vault</strong><p>Save the things you learn. Share what you discover.</p><button className="button button-primary button-full" onClick={() => { if (!token) { document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' }); return notify('Create an account to publish.', true); } setActiveTab('feed'); setShowComposer(true); }}>+ Share knowledge</button></div>
        <div className="sidebar-foot">Made for curious developers <span>♥</span></div>
      </aside>

      <section className="main-content" id="home">
        <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-star">✳</span> THE DEVELOPER COMMUNITY</div><h1>Learn something.<br/><span>Share everything.</span></h1><p>Your second brain for code, concepts, and career growth. Discover useful resources shared by developers like you.</p><div className="hero-stats"><div><strong>{posts.length}</strong><span>Shared resources</span></div><div className="stat-divider"/><div><strong>{new Set(posts.map(p => p.author?._id).filter(Boolean)).size}</strong><span>Contributors</span></div><div className="stat-divider"/><div><strong>{new Set(posts.flatMap(p => p.tags || [])).size}</strong><span>Topics</span></div></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-tile tile-code"><span>{'</>'}</span><small>CODE</small></div><div className="hero-tile tile-book"><span>▤</span><small>LEARN</small></div><div className="hero-tile tile-star"><span>✳</span><small>GROW</small></div><div className="hero-center"><span>✦</span></div></div></section>

        {message && <div className="notice success-notice">✓ {message}</div>}{error && <div className="notice error-notice">! {error}</div>}

        {(!token) && <section className="auth-card" id="auth"><div><div className="eyebrow">JOIN THE COMMUNITY</div><h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p>Sign in to publish resources, save bookmarks, and keep personal notes.</p></div><form onSubmit={submitAuth} className="auth-form">{authMode === 'register' && <input required minLength="2" placeholder="Your name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })}/>}<input required type="email" placeholder="Email address" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })}/><input required minLength="8" type="password" placeholder="Password (8+ characters)" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })}/><button className="button button-primary" disabled={loading}>{loading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button><button type="button" className="text-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></form></section>}

        {activeTab === 'notes' ? <section className="notes-section"><div className="section-heading"><div><div className="eyebrow">JUST FOR YOU</div><h2>My personal notes</h2><p>Private notes that only you can access.</p></div></div><form className="note-form panel" onSubmit={submitNote}><input required maxLength="120" placeholder="Note title" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })}/><textarea required maxLength="12000" rows="3" placeholder="Write down what you learned…" value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}/><button className="button button-primary">Save note</button></form><div className="notes-grid">{notes.map(note => <article className="note-card" key={note._id}><div className="note-card-top"><span>▤ PERSONAL NOTE</span><button className="icon-button danger" onClick={() => deleteNote(note._id)} aria-label="Delete note">×</button></div><h3>{note.title}</h3><p className="note-content">{note.content}</p><small>{prettyDate(note.updatedAt)}</small></article>)}{!notes.length && <div className="empty-state"><span>▤</span><h3>Your notes start here</h3><p>Keep private snippets, reminders, and things you want to remember.</p></div>}</div></section> : <>
          <div className="section-heading feed-heading"><div><div className="eyebrow">{activeTab === 'bookmarks' ? 'YOUR SAVED COLLECTION' : 'FRESH FROM THE COMMUNITY'}</div><h2>{activeTab === 'bookmarks' ? 'Your bookmarks' : 'Explore the vault'} <span className="heading-count">{visiblePosts.length}</span></h2><p>{activeTab === 'bookmarks' ? 'Resources you saved for later.' : 'Ideas, snippets, tutorials, and resources worth keeping.'}</p></div><button className="button button-primary" onClick={() => { if (!token) { document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' }); return notify('Sign in to share a resource.', true); } setEditingId(''); setPostForm(initialForm); setShowComposer(!showComposer); }}>+ Share a resource</button></div>

          {showComposer && <form className="composer panel" onSubmit={submitPost}><div className="composer-title"><div><div className="eyebrow">CONTRIBUTE TO THE VAULT</div><h3>{editingId ? 'Edit resource' : 'Share something useful'}</h3></div><button type="button" className="icon-button" onClick={() => { setShowComposer(false); setEditingId(''); setPostForm(initialForm); }}>×</button></div><label>Title<input required maxLength="140" placeholder="e.g. Understanding JavaScript closures" value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })}/></label><label>Description<textarea required maxLength="8000" rows="4" placeholder="What did you learn? Explain it so another developer can benefit…" value={postForm.description} onChange={e => setPostForm({ ...postForm, description: e.target.value })}/></label><div className="form-row"><label>Tags <span className="muted">(comma-separated)</span><input placeholder="javascript, interview, beginner" value={postForm.tags} onChange={e => setPostForm({ ...postForm, tags: e.target.value })}/></label><label>Resource link <span className="muted">(optional)</span><input type="url" placeholder="https://…" value={postForm.resourceUrl} onChange={e => setPostForm({ ...postForm, resourceUrl: e.target.value })}/></label></div><div className="composer-actions"><span className="muted">Be kind. Share accurate, helpful knowledge.</span><button className="button button-primary" disabled={loading}>{loading ? 'Saving…' : editingId ? 'Update resource' : 'Publish resource'}</button></div></form>}

          <div className="toolbar"><div className="search-box"><span>⌕</span><input placeholder="Search resources, tags, concepts…" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}</div><button className={`filter-chip ${!search ? 'selected' : ''}`} onClick={() => setSearch('')}>✳ All resources</button></div>
          {loading && !posts.length ? <div className="empty-state"><div className="loader"/><p>Opening the vault…</p></div> : visiblePosts.length ? <div className="post-list">{visiblePosts.map(post => <article className="post-card" key={post._id}><div className="post-accent"/><div className="post-main"><div className="post-meta"><span className="resource-type"><span>✦</span> KNOWLEDGE RESOURCE</span><span className="meta-dot">·</span><span>{prettyDate(post.createdAt)}</span><span className="meta-spacer"/><button className={`icon-button bookmark-button ${bookmarkedIds.has(post._id) ? 'is-bookmarked' : ''}`} onClick={() => toggleBookmark(post)} title={bookmarkedIds.has(post._id) ? 'Remove bookmark' : 'Bookmark'}>◇</button></div><h3>{post.title}</h3><p className="post-description">{post.description}</p>{post.resourceUrl && <a className="resource-link" href={post.resourceUrl} target="_blank" rel="noreferrer">↗ Open resource <span>↗</span></a>}<div className="post-bottom"><div className="post-tags">{(post.tags || []).map(tag => <button key={tag} className="post-tag" onClick={() => setSearch(tag)}>#{tag}</button>)}</div><div className="author"><span className="avatar">{post.author?.name?.slice(0, 1).toUpperCase() || '?'}</span><span>{post.author?.name || 'Community member'}</span>{user?.id === post.author?._id && <div className="owner-actions"><button onClick={() => startEdit(post)}>Edit</button><button onClick={() => deletePost(post)}>Delete</button></div>}</div></div></div></article>)}</div> : <div className="empty-state"><span>⌕</span><h3>{search ? 'No matching resources' : activeTab === 'bookmarks' ? 'No bookmarks yet' : 'The vault is ready for your first resource'}</h3><p>{search ? 'Try another keyword or clear the search.' : activeTab === 'bookmarks' ? 'Bookmark a resource from the feed and it will appear here.' : 'Be the first to share a concept, code snippet, or learning resource.'}</p>{!search && activeTab === 'feed' && token && <button className="button button-primary" onClick={() => setShowComposer(true)}>Share the first resource</button>}</div>}
        </>}
        <footer className="main-footer"><span>© {new Date().getFullYear()} SkillVault</span><span>Keep learning. Keep building. <b>✦</b></span></footer>
      </section>
    </main>
  </div>;
}
