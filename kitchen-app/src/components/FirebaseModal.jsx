import { useState, useEffect } from 'react';
import {
  getFirebaseConfig,
  isFirebaseConfigured,
  saveFirebaseConfig,
  clearFirebaseConfig,
  testFirestoreConnection
} from '../firebase';
import { store } from '../store';

export default function FirebaseModal({ isOpen, onClose, onConfigChange }) {
  const [config, setConfig] = useState({
    projectId: '',
    apiKey: '',
    authDomain: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [pasteSnippet, setPasteSnippet] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    if (isOpen) {
      const active = getFirebaseConfig();
      if (active) {
        setConfig({
          projectId: active.projectId || '',
          apiKey: active.apiKey || '',
          authDomain: active.authDomain || '',
          storageBucket: active.storageBucket || '',
          messagingSenderId: active.messagingSenderId || '',
          appId: active.appId || ''
        });
      }
      setStatusMessage(null);
      setPasteSnippet('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleParseSnippet() {
    if (!pasteSnippet.trim()) return;
    try {
      const projectIdMatch = pasteSnippet.match(/projectId\s*:\s*["']([^"']+)["']/);
      const apiKeyMatch = pasteSnippet.match(/apiKey\s*:\s*["']([^"']+)["']/);
      const authDomainMatch = pasteSnippet.match(/authDomain\s*:\s*["']([^"']+)["']/);
      const storageBucketMatch = pasteSnippet.match(/storageBucket\s*:\s*["']([^"']+)["']/);
      const senderIdMatch = pasteSnippet.match(/messagingSenderId\s*:\s*["']([^"']+)["']/);
      const appIdMatch = pasteSnippet.match(/appId\s*:\s*["']([^"']+)["']/);

      if (projectIdMatch || apiKeyMatch) {
        setConfig(prev => ({
          ...prev,
          projectId: projectIdMatch ? projectIdMatch[1] : prev.projectId,
          apiKey: apiKeyMatch ? apiKeyMatch[1] : prev.apiKey,
          authDomain: authDomainMatch ? authDomainMatch[1] : prev.authDomain,
          storageBucket: storageBucketMatch ? storageBucketMatch[1] : prev.storageBucket,
          messagingSenderId: senderIdMatch ? senderIdMatch[1] : prev.messagingSenderId,
          appId: appIdMatch ? appIdMatch[1] : prev.appId,
        }));
        setStatusMessage({ type: 'success', text: '✓ Configuration parsed and loaded from snippet!' });
      } else {
        setStatusMessage({ type: 'error', text: 'Could not extract Firebase credentials from the pasted text.' });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Invalid format: ' + e.message });
    }
  }

  async function handleTest() {
    if (!config.projectId || !config.apiKey) {
      setStatusMessage({ type: 'error', text: 'Please enter both Project ID and API Key.' });
      return;
    }
    setTesting(true);
    setStatusMessage({ type: 'info', text: 'Testing Firestore connection...' });

    const fullConfig = {
      ...config,
      authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
      storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
    };

    const res = await testFirestoreConnection(fullConfig);
    setTesting(false);
    if (res.success) {
      setStatusMessage({ type: 'success', text: `✓ ${res.message}` });
    } else {
      setStatusMessage({ type: 'error', text: `✗ ${res.message}` });
    }
  }

  function handleSave() {
    if (!config.projectId || !config.apiKey) {
      setStatusMessage({ type: 'error', text: 'Project ID and API Key are required.' });
      return;
    }
    try {
      const fullConfig = {
        ...config,
        authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
        storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
      };
      saveFirebaseConfig(fullConfig);
      setStatusMessage({ type: 'success', text: '✓ Firebase configuration saved and active!' });
      if (onConfigChange) onConfigChange();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      setStatusMessage({ type: 'error', text: e.message });
    }
  }

  async function handlePushLocalToCloud() {
    setSyncing(true);
    setStatusMessage({ type: 'info', text: 'Syncing all local master data, recipes, and history to Firestore...' });
    try {
      await store.syncAllToFirestore();
      setStatusMessage({ type: 'success', text: '✓ All local data successfully synchronized to Firebase Firestore!' });
      if (onConfigChange) onConfigChange();
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Sync failed: ' + e.message });
    } finally {
      setSyncing(false);
    }
  }

  async function handlePullCloudToLocal() {
    setSyncing(true);
    setStatusMessage({ type: 'info', text: 'Pulling latest records from Firestore...' });
    try {
      const count = await store.pullAllFromFirestore();
      setStatusMessage({ type: 'success', text: `✓ Pulled ${count} collections from Firestore into local storage!` });
      if (onConfigChange) onConfigChange();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Pull failed: ' + e.message });
    } finally {
      setSyncing(false);
    }
  }

  function handleDisconnect() {
    if (window.confirm('Disconnect Firebase? Your data will remain safely preserved in local browser storage.')) {
      clearFirebaseConfig();
      setConfig({
        projectId: '',
        apiKey: '',
        authDomain: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
      });
      setStatusMessage({ type: 'info', text: 'Firebase disconnected. Running in offline/local mode.' });
      if (onConfigChange) onConfigChange();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 620 }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex items-center gap-md">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #FFCA28 0%, #FFA000 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                boxShadow: '0 2px 8px rgba(255, 160, 0, 0.25)',
              }}
            >
              🔥
            </div>
            <div>
              <h3>Firebase Firestore Setup</h3>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Real-time cloud database synchronization across all kitchen devices
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Status Badge */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              background: isConfigured ? 'rgba(5, 150, 105, 0.08)' : 'rgba(217, 119, 6, 0.08)',
              border: isConfigured ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid rgba(217, 119, 6, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="flex items-center gap-sm">
              <span style={{ fontSize: 12 }}>{isConfigured ? '🟢' : '🟡'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isConfigured ? 'var(--success)' : 'var(--warning)' }}>
                {isConfigured ? `Connected: ${config.projectId}` : 'Running Offline (Browser LocalStorage)'}
              </span>
            </div>
            {isConfigured && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDisconnect}
                style={{ fontSize: 11, padding: '2px 8px', color: 'var(--danger)' }}
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Status Alert Notification */}
          {statusMessage && (
            <div
              className="animate-in"
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 16,
                background:
                  statusMessage.type === 'success'
                    ? 'var(--success-subtle)'
                    : statusMessage.type === 'error'
                    ? 'var(--danger-subtle)'
                    : 'var(--info-subtle)',
                color:
                  statusMessage.type === 'success'
                    ? 'var(--success)'
                    : statusMessage.type === 'error'
                    ? 'var(--danger)'
                    : 'var(--info)',
                border: `1px solid ${
                  statusMessage.type === 'success'
                    ? 'var(--success-border)'
                    : statusMessage.type === 'error'
                    ? 'var(--danger-border)'
                    : 'var(--info-border)'
                }`,
              }}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Fast-Paste Helper */}
          <div style={{ marginBottom: 18 }}>
            <div className="flex items-center justify-between mb-xs">
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                📋 Quick Paste Firebase Config Object:
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleParseSnippet}
                disabled={!pasteSnippet.trim()}
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
                Auto-Fill Form
              </button>
            </div>
            <textarea
              placeholder={`Paste from Firebase Console, e.g.:
const firebaseConfig = {
  apiKey: "AIzaSy...",
  projectId: "kitchen-dash",
  ...
};`}
              value={pasteSnippet}
              onChange={e => setPasteSnippet(e.target.value)}
              className="form-input"
              rows={3}
              style={{ fontSize: 12, fontFamily: 'var(--font-mono)', width: '100%' }}
            />
          </div>

          {/* Form Fields */}
          <div className="form-row mb-lg">
            <div>
              <label className="form-label">
                Project ID <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. kitchen-dashboard-prod"
                value={config.projectId}
                onChange={e => setConfig({ ...config, projectId: e.target.value.trim() })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">
                API Key <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. AIzaSyB..."
                value={config.apiKey}
                onChange={e => setConfig({ ...config, apiKey: e.target.value.trim() })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row mb-lg">
            <div>
              <label className="form-label">App ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 1:123456789:web:abcdef"
                value={config.appId}
                onChange={e => setConfig({ ...config, appId: e.target.value.trim() })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Auth Domain (Optional)</label>
              <input
                type="text"
                placeholder="auto-derived if empty"
                value={config.authDomain}
                onChange={e => setConfig({ ...config, authDomain: e.target.value.trim() })}
                className="form-input"
              />
            </div>
          </div>

          {/* Sync Tools (Visible when configured) */}
          {isConfigured && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: 'var(--bg-tertiary)',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                Live Cloud Sync Tools
              </div>
              <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePushLocalToCloud}
                  disabled={syncing}
                  title="Upload all existing local items, recipes, and history into Firestore"
                  style={{ fontSize: 12 }}
                >
                  ☁️ Upload Local Data to Cloud
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePullCloudToLocal}
                  disabled={syncing}
                  title="Download remote data from Firestore to this device"
                  style={{ fontSize: 12 }}
                >
                  ⬇️ Pull Cloud Data to Device
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTest}
            disabled={testing || !config.projectId || !config.apiKey}
            style={{ marginRight: 'auto' }}
          >
            {testing ? '⏳ Testing...' : '⚡ Test Connection'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!config.projectId || !config.apiKey}
          >
            💾 Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
}
