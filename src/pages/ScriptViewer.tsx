import { useState, useEffect } from 'react';

const SCRIPTS_DIR = "C:\\Users\\Henry\\Documents\\Tortuga Agent Knowledge\\Episode Scripts";

export default function ScriptViewer() {
  const [scripts, setScripts] = useState<FileDetails[]>([]);
  const [selected, setSelected] = useState<FileDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const files = await window.electronAPI.readAllDirectory(SCRIPTS_DIR);
        const pdfs = files.filter(
          (f) => !f.isDirectory && f.name.toLowerCase().endsWith('.pdf')
        );
        setScripts(pdfs);
        if (pdfs.length > 0) setSelected(pdfs[0]);
      } catch (e) {
        console.error('Failed to load scripts', e);
        setError('Unable to read scripts directory');
      }
    };
    load();
  }, []);

  const sanitizedPath = selected?.path.replace(/\\/g, '/');
  const pdfUrl = selected ? `file:///${sanitizedPath}` : '';

  const reloadList = async (keepSelectedPath?: string) => {
    try {
      const files = await window.electronAPI.readAllDirectory(SCRIPTS_DIR);
      const pdfs = files.filter((f) => !f.isDirectory && f.name.toLowerCase().endsWith('.pdf'));
      setScripts(pdfs);
      if (keepSelectedPath) {
        const retained = pdfs.find((p) => p.path === keepSelectedPath);
        setSelected(retained || (pdfs.length > 0 ? pdfs[0] : null));
      } else {
        if (!pdfs.length) setSelected(null);
      }
    } catch (e) {
      console.error('Reload error:', e);
    }
  };

  const openRenameDialog = () => {
    if (!selected) return;
    const base = selected.name.replace(/\.pdf$/i, '');
    setNewName(base);
    setShowRenameDialog(true);
  };

  const confirmRename = async () => {
    if (!selected) return;
    let name = newName.trim();
    if (!name) return;
    if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    if (name === selected.name) {
      setShowRenameDialog(false);
      return;
    }
    setRenaming(true);
    try {
      const newPath = await window.electronAPI.renameFile(selected.path, name);
      await reloadList(newPath);
      setShowRenameDialog(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Rename failed: ' + msg);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Episode Scripts
        </h1>
        {selected && (
          <div className="flex gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Open in New Window
            </a>
            <button
              onClick={openRenameDialog}
              disabled={renaming}
              className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {renaming ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-red-500 dark:text-red-400">{error}</p>
      ) : scripts.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No PDF scripts found.</p>
      ) : (
        <div className="flex h-full w-full flex-1 gap-4 overflow-hidden">
          {/* Script list */}
          <div className="w-64 overflow-y-auto rounded-lg bg-white p-4 shadow dark:bg-gray-800 dark:text-gray-200">
            <ul className="space-y-2">
              {scripts.map((script) => (
                <li key={script.path}>
                  <button
                    onClick={() => setSelected(script)}
                    className={`w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selected?.path === script.path
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-700/40 dark:text-blue-100'
                        : ''
                    }`}
                  >
                    {script.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Viewer */}
          <div className="flex-1 overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
            {selected ? (
              <iframe
                src={pdfUrl}
                title={selected.name}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-gray-600 dark:text-gray-400">
                Select a script to view.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
        Scripts directory: {SCRIPTS_DIR}
      </div>

      {/* Rename Modal */}
      {showRenameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">Rename Script</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              placeholder="Enter new file name"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRenameDialog(false)}
                className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmRename}
                disabled={renaming || newName.trim() === ''}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {renaming ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 