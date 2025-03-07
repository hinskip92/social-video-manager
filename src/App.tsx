import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import VideoLibrary from './pages/VideoLibrary';
import VideoPlayer from './pages/VideoPlayer';
import Settings from './pages/Settings';
import { DirectoryProvider } from './contexts/DirectoryContext';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  
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
    <DirectoryProvider>
      <Router>
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
          
          {/* Main content */}
          <div className={`flex flex-col flex-1 overflow-hidden ${sidebarOpen ? 'md:ml-64' : ''}`}>
            <Header 
              sidebarOpen={sidebarOpen} 
              setSidebarOpen={setSidebarOpen} 
              searchTerm={globalSearchTerm}
              setSearchTerm={setGlobalSearchTerm}
            />
            
            <main className="flex-1 overflow-y-auto p-5">
              <Routes>
                <Route path="/" element={<VideoLibrary globalSearchTerm={globalSearchTerm} setGlobalSearchTerm={setGlobalSearchTerm} />} />
                <Route path="/video/:id" element={<VideoPlayer />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </DirectoryProvider>
  );
}

export default App;
