import React, { useState, useEffect, useContext, createContext } from 'react';

// --- LocalStorage Keys ---
const LS_USERS = 'blog_users';
const LS_POSTS = 'blog_posts';
const LS_COMMENTS = 'blog_comments';
const LS_CURRENT_USER = 'blog_currentUser';

// --- Helper Functions ---
const formatTimestamp = (isoString) => {
  if (!isoString) return 'Just now';
  return new Date(isoString).toLocaleString();
};

// Simple ID generator for mock data
const generateId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

// --- Mock Auth Context ---
const AuthContext = createContext();

const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem(LS_USERS) || '[]'));

  // Load current user from storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(LS_CURRENT_USER);
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  // Sync users list to storage
  useEffect(() => {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  }, [users]);

  const login = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      // In a real app, don't store password in the user object
      const { password: _, ...userToStore } = user;
      setCurrentUser(userToStore);
      localStorage.setItem(LS_CURRENT_USER, JSON.stringify(userToStore));
      return true;
    }
    throw new Error("Invalid email or password");
  };

  const signup = (email, password, displayName) => {
    if (users.find(u => u.email === email)) {
      throw new Error("User already exists");
    }
    const newUser = {
      uid: generateId(),
      email,
      password, // NOTE: Storing plain text passwords is a huge security risk. Only for demo.
      displayName
    };
    setUsers([...users, newUser]);
    
    // Log them in
    const { password: _, ...userToStore } = newUser;
    setCurrentUser(userToStore);
    localStorage.setItem(LS_CURRENT_USER, JSON.stringify(userToStore));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(LS_CURRENT_USER);
  };

  const authValue = {
    currentUser,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};

// --- Mock Database Context ---
const DatabaseContext = createContext();

const useDatabase = () => useContext(DatabaseContext);

const DatabaseProvider = ({ children }) => {
  const [posts, setPosts] = useState(() => JSON.parse(localStorage.getItem(LS_POSTS) || '[]'));
  const [comments, setComments] = useState(() => JSON.parse(localStorage.getItem(LS_COMMENTS) || '[]'));

  // Sync posts and comments to storage
  useEffect(() => {
    localStorage.setItem(LS_POSTS, JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem(LS_COMMENTS, JSON.stringify(comments));
  }, [comments]);

  const db = {
    // Posts
    posts: posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    addPost: (post) => {
      const newPost = { 
        ...post, 
        id: generateId(), 
        createdAt: new Date().toISOString(),
        likes: [] // Add likes array
      };
      setPosts(prev => [...prev, newPost]);
      return newPost;
    },
    updatePost: (updatedPost) => {
      setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
    },
    deletePost: (postId) => {
      setPosts(prev => prev.filter(p => p.id !== postId));
      // Also delete related comments
      setComments(prev => prev.filter(c => c.postId !== postId));
    },
    toggleLike: (postId, userId) => {
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === postId) {
            const hasLiked = post.likes.includes(userId);
            const newLikes = hasLiked
              ? post.likes.filter(uid => uid !== userId) // Unlike
              : [...post.likes, userId]; // Like
            return { ...post, likes: newLikes };
          }
          return post;
        })
      );
    },

    // Comments
    getComments: (postId) => {
      return comments
        .filter(c => c.postId === postId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    addComment: (comment) => {
      const newComment = { ...comment, id: generateId(), createdAt: new Date().toISOString() };
      setComments(prev => [...prev, newComment]);
    }
  };

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
};

// --- Sub-Components ---

/**
 * Navigation Bar Component
 */
const Navigation = ({ setCurrentPage }) => {
  const { currentUser, logout } = useAuth();

  return (
    <nav className="bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-white cursor-pointer" onClick={() => setCurrentPage('home')}>
          Social Media App
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 hover:text-white cursor-pointer" onClick={() => setCurrentPage('home')}>
            Feed
          </span>
          {currentUser ? (
            <>
              <span className="text-gray-300 hover:text-white cursor-pointer" onClick={() => setCurrentPage('profile')}>
                Hi, {currentUser.displayName || 'User'}
              </span>
              <button onClick={() => { logout(); setCurrentPage('home'); }} className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-semibold">
                Logout
              </button>
            </>
          ) : (
            <>
              <span className="text-gray-300 hover:text-white cursor-pointer" onClick={() => setCurrentPage('login')}>
                Login
              </span>
              <span className="text-gray-300 hover:text-white cursor-pointer" onClick={() => setCurrentPage('signup')}>
                Sign Up
              </span>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

/**
 * Login Form Component
 */
const Login = ({ setCurrentPage, setError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = (e) => {
    e.preventDefault();
    setError(null);
    try {
      login(email, password);
      setCurrentPage('home');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 bg-gray-700 rounded-lg text-white" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 bg-gray-700 rounded-lg text-white" required />
        <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold">
          Login
        </button>
      </form>
    </div>
  );
};

/**
 * Sign Up Form Component
 */
const SignUp = ({ setCurrentPage, setError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { signup } = useAuth();

  const handleSignUp = (e) => {
    e.preventDefault();
    setError(null);
    try {
      signup(email, password, displayName);
      setCurrentPage('home');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center">Sign Up</h2>
      <form onSubmit={handleSignUp} className="space-y-4">
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name" className="w-full p-3 bg-gray-700 rounded-lg text-white" required />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 bg-gray-700 rounded-lg text-white" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 chars)" className="w-full p-3 bg-gray-700 rounded-lg text-white" required />
        <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold">
          Sign Up
        </button>
      </form>
    </div>
  );
};

/**
 * Like Button Component
 */
const LikeButton = ({ post, user }) => {
  const { toggleLike } = useDatabase();
  
  if (!user) return <span className="text-gray-400">{post.likes.length} Likes</span>;

  const hasLiked = post.likes.includes(user.uid);

  return (
    <button
      onClick={() => toggleLike(post.id, user.uid)}
      className={`py-2 px-4 rounded-lg font-semibold ${
        hasLiked
          ? 'bg-pink-500 text-white'
          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
      }`}
    >
      {hasLiked ? 'Liked' : 'Like'} ({post.likes.length})
    </button>
  );
};


/**
 * Post List (Home Page) Component
 */
const PostList = ({ setCurrentPage, setSelectedPost }) => {
  const { currentUser } = useAuth();
  const { posts } = useDatabase();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Main Feed</h2>
        {currentUser && (
          <button onClick={() => setCurrentPage('createPost')} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-5 rounded-lg font-semibold">
            Create Post
          </button>
        )}
      </div>
      <div className="space-y-6">
        {posts.length === 0 && <p className="text-gray-400">No posts yet. Be the first to write one!</p>}
        {posts.map(post => (
          <div key={post.id} className="bg-gray-800 p-6 rounded-lg shadow-md">
            {post.imageUrl && (
              <img src={post.imageUrl} alt={post.title} className="w-full h-64 object-cover rounded-lg mb-4" />
            )}
            <h3 className="text-2xl font-semibold mb-2">{post.title}</h3>
            <div className="text-sm text-gray-400 mb-4">
              By {post.authorName} on {formatTimestamp(post.createdAt)}
            </div>
            <p className="text-gray-300 mb-4">{post.content.substring(0, 150)}...</p>
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setSelectedPost(post);
                  setCurrentPage('postDetail');
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold"
              >
                Read More & Comment
              </button>
              <LikeButton post={post} user={currentUser} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Real-time Comments Component
 */
const Comments = ({ postId }) => {
  const { currentUser } = useAuth();
  const { getComments, addComment } = useDatabase();
  const [newComment, setNewComment] = useState('');
  
  // getComments is synchronous since it's just filtering a state array
  const comments = getComments(postId); 

  const handleAddComment = (e) => {
    e.preventDefault();
    if (newComment.trim() === '' || !currentUser) return;

    try {
      addComment({
        postId,
        text: newComment,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
      });
      setNewComment('');
    } catch (err) {
      console.error("Error adding comment: ", err);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold mb-4">Comments</h3>
      {currentUser ? (
        <form onSubmit={handleAddComment} className="mb-6 flex space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-grow p-3 bg-gray-700 rounded-lg text-white"
          />
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-5 rounded-lg font-semibold">
            Post
          </button>
        </form>
      ) : (
        <p className="text-gray-400 mb-4">Please log in to comment.</p>
      )}
      <div className="space-y-4">
        {comments.length === 0 && <p className="text-gray-400">No comments yet.</p>}
        {comments.map(comment => (
          <div key={comment.id} className="bg-gray-700 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-white">{comment.authorName}</span>
              <span className="text-xs text-gray-400">{formatTimestamp(comment.createdAt)}</span>
            </div>
            <p className="text-gray-300">{comment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Post Detail View Component
 */
const PostDetail = ({ post, setCurrentPage, setSelectedPost, setError }) => {
  const { currentUser } = useAuth();
  const { deletePost } = useDatabase();
  
  if (!post) return <p>Loading post...</p>;

  const isAuthor = currentUser && currentUser.uid === post.authorId;

  const handleDelete = () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      deletePost(post.id);
      setCurrentPage('home');
      setSelectedPost(null);
    } catch (err) {
      console.error(err);
      setError("Failed to delete post.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
      {post.imageUrl && (
        <img src={post.imageUrl} alt={post.title} className="w-full h-80 object-cover rounded-lg mb-6" />
      )}
      <h2 className="text-4xl font-bold mb-4">{post.title}</h2>
      <div className="text-sm text-gray-400 mb-6">
        By {post.authorName} on {formatTimestamp(post.createdAt)}
      </div>
      
      <div className="flex justify-between items-center mb-6">
        {isAuthor && (
          <div className="flex space-x-2">
            <button onClick={() => setCurrentPage('editPost')} className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg font-semibold">
              Edit Post
            </button>
            <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-semibold">
              Delete Post
            </button>
          </div>
        )}
        <LikeButton post={post} user={currentUser} />
      </div>

      <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
        {post.content}
      </p>

      <div className="border-t border-gray-700 mt-8">
        <Comments postId={post.id} />
      </div>
    </div>
  );
};

/**
 * Post Editor (Create/Edit) Component
 */
const PostEditor = ({ postToEdit, setCurrentPage, setSelectedPost, setError }) => {
  const { currentUser } = useAuth();
  const { addPost, updatePost } = useDatabase();
  const [title, setTitle] = useState(postToEdit ? postToEdit.title : '');
  const [content, setContent] = useState(postToEdit ? postToEdit.content : '');
  const [imageUrl, setImageUrl] = useState(postToEdit ? postToEdit.imageUrl : '');
  const isEditing = !!postToEdit;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (isEditing) {
        const updatedPost = { ...postToEdit, title, content, imageUrl };
        updatePost(updatedPost);
        setSelectedPost(updatedPost);
        setCurrentPage('postDetail');
      } else {
        const newPost = addPost({
          title,
          content,
          imageUrl,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
        });
        setSelectedPost(newPost);
        setCurrentPage('postDetail');
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save post.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6">{isEditing ? 'Edit Post' : 'Create New Post'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post Title" className="w-full p-3 bg-gray-700 rounded-lg text-white" required />
        <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (Optional)" className="w-full p-3 bg-gray-700 rounded-lg text-white" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post content here..." className="w-full p-3 bg-gray-700 rounded-lg text-white h-64" required />
        <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold">
          {isEditing ? 'Update Post' : 'Publish Post'}
        </button>
      </form>
    </div>
  );
};

/**
 * User Profile Component
 */
const Profile = () => {
  const { currentUser } = useAuth();
  const { posts } = useDatabase();
  
  if (!currentUser) return <p>Loading profile...</p>;

  const myPosts = posts.filter(p => p.authorId === currentUser.uid);

  return (
    <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-4">{currentUser.displayName}</h2>
      <p className="text-gray-400 mb-6">{currentUser.email}</p>
      
      <h3 className="text-2xl font-bold mb-4">My Posts</h3>
      <div className="space-y-4">
        {myPosts.length === 0 && <p className="text-gray-400">You haven't written any posts yet.</p>}
        {myPosts.map(post => (
          <div key={post.id} className="bg-gray-700 p-4 rounded-lg">
            <h4 className="text-xl font-semibold">{post.title}</h4>
            <p className="text-sm text-gray-400">{formatTimestamp(post.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main App Component
 */
const App = () => {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'postDetail', 'profile', 'login', 'signup', 'createPost', 'editPost'
  const [selectedPost, setSelectedPost] = useState(null);
  const [error, setError] = useState(null);

  const { currentUser } = useAuth(); // Get user from context

  // "Protected" routes effect
  useEffect(() => {
    if ((currentPage === 'createPost' || currentPage === 'profile' || currentPage === 'editPost') && !currentUser) {
      setCurrentPage('login'); // Redirect to login
    }
  }, [currentPage, currentUser]);

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return <PostList setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} />;
      case 'postDetail':
        return <PostDetail post={selectedPost} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} setError={setError} />;
      case 'profile':
        return currentUser ? <Profile /> : <Login setCurrentPage={setCurrentPage} setError={setError} />;
      case 'login':
        return <Login setCurrentPage={setCurrentPage} setError={setError} />;
      case 'signup':
        return <SignUp setCurrentPage={setCurrentPage} setError={setError} />;
      case 'createPost':
        return currentUser ? <PostEditor setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} setError={setError} /> : <Login setCurrentPage={setCurrentPage} setError={setError} />;
      case 'editPost':
        return currentUser ? <PostEditor postToEdit={selectedPost} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} setError={setError} /> : <Login setCurrentPage={setCurrentPage} setError={setError} />;
      default:
        return <PostList setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-inter">
      <Navigation setCurrentPage={setCurrentPage} />
      <main className="container mx-auto p-4 md:p-8">
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
            <p><strong>Error:</strong> {error}</p>
            <button onClick={() => setError(null)} className="ml-4 font-bold">X</button>
          </div>
        )}
        {renderPage()}
      </main>
    </div>
  );
};

// Wrap the App in its providers
const AppWrapper = () => (
  <AuthProvider>
    <DatabaseProvider>
      <App />
    </DatabaseProvider>
  </AuthProvider>
);

export default AppWrapper;

