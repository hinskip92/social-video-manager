import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import VideoLibrary from './pages/VideoLibrary';
import VideoPlayer from './pages/VideoPlayer';
import VideoEditor from './pages/VideoEditor';
import ScriptViewer from './pages/ScriptViewer';
import Settings from './pages/Settings';
import { DirectoryProvider } from './contexts/DirectoryContext';
import { PhotoProvider } from './contexts/PhotoContext';
import PhotoLibrary from './pages/PhotoLibrary';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open
  
  // Default to sidebar open on larger screens, closed on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <PhotoProvider>
    <DirectoryProvider>
      <Router>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
          
          {/* Main content */}
          <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'md:ml-72' : ''}`}>
            <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto animate-fade-in">
                <Routes>
                  <Route path="/" element={<VideoLibrary />} />
                  <Route path="/video/:id" element={<VideoPlayer />} />
                  <Route path="/video/:id/edit" element={<VideoEditor />} />
                  <Route path="/photos" element={<PhotoLibrary />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/scripts" element={<ScriptViewer />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </Router>
    </DirectoryProvider>
    </PhotoProvider>
  );
}

export default App;
