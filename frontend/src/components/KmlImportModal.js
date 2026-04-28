import React, { useState } from 'react';
import { kmlImportService, infrastructureTypeService } from '../services/services';
import './KmlImportModal.css';

const KmlImportModal = ({ onImportSuccess, onClose }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedLines, setParsedLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState({});
  const [typeId, setTypeId] = useState('');
  const [types, setTypes] = useState([]);
  const [step, setStep] = useState('upload'); // upload, preview, confirm
  const [fileName, setFileName] = useState('');

  React.useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const res = await infrastructureTypeService.getAll();
      setTypes(res.data);
      // Pre-select Kabel type
      const kabelType = res.data.find(t => t.name === 'Kabel');
      if (kabelType) {
        setTypeId(kabelType.id.toString());
      }
    } catch (error) {
      console.error('Error loading types:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  const handleUploadAndParse = async () => {
    if (!file) {
      setError('Please select a KML or KMZ file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await kmlImportService.parseKml(file);
      const lines = response.data.lines || [];
      setParsedLines(lines);

      // Initialize all lines as selected
      const selected = {};
      lines.forEach((_, idx) => {
        selected[idx] = true;
      });
      setSelectedLines(selected);

      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.message || 'Error parsing KML file');
    } finally {
      setLoading(false);
    }
  };

  const toggleLineSelection = (index) => {
    setSelectedLines(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleAllLines = (checked) => {
    const newSelected = {};
    parsedLines.forEach((_, idx) => {
      newSelected[idx] = checked;
    });
    setSelectedLines(newSelected);
  };

  const handleConfirmImport = async () => {
    if (!typeId) {
      setError('Please select an Infrastructure Type');
      return;
    }

    const selectedIndices = Object.keys(selectedLines).filter(idx => selectedLines[idx]);
    if (selectedIndices.length === 0) {
      setError('Please select at least one line to import');
      return;
    }

    setStep('confirm');
  };

  const handleFinalImport = async () => {
    const selectedIndices = Object.keys(selectedLines).filter(idx => selectedLines[idx]);
    const importData = {
      type_id: parseInt(typeId),
      lines: selectedIndices.map(idx => parsedLines[idx])
    };

    setLoading(true);
    setError('');

    try {
      await kmlImportService.importLines(importData);
      setError('');
      // Call success handler
      onImportSuccess(importData);
    } catch (err) {
      setError(err.response?.data?.message || 'Error importing lines');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCount = () => {
    return Object.values(selectedLines).filter(v => v).length;
  };

  return (
    <div className="kml-import-modal-overlay">
      <div className="kml-import-modal">
        <div className="modal-header">
          <h2>Import KML/KMZ Cable Routes</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {step === 'upload' && (
            <div className="upload-section">
              <div className="upload-area">
                <input
                  type="file"
                  accept=".kml,.kmz"
                  onChange={handleFileChange}
                  className="file-input"
                  id="kml-file-input"
                />
                <label htmlFor="kml-file-input" className="file-label">
                  <div className="file-icon">📄</div>
                  <div className="file-text">
                    <p className="file-title">
                      {fileName ? `Selected: ${fileName}` : 'Click to select KML/KMZ file'}
                    </p>
                    <p className="file-description">or drag and drop</p>
                  </div>
                </label>
              </div>

              <div className="info-section">
                <h4>ℹ️ Supported Formats</h4>
                <ul>
                  <li><strong>.KML files:</strong> Direct KML files from Google Earth</li>
                  <li><strong>.KMZ files:</strong> Compressed KML files (automatically extracted)</li>
                  <li><strong>LineStrings:</strong> Cable routes (paths)</li>
                  <li><strong>Points:</strong> Infrastructure locations</li>
                </ul>
              </div>

              <div className="info-section">
                <h4>📋 How to Export from Google Earth</h4>
                <ol>
                  <li>Draw your placemarks/lines in Google Earth</li>
                  <li>Right-click on the folder containing your routes</li>
                  <li>Select "Save place as..."</li>
                  <li>Choose KMZ format and save</li>
                  <li>Upload the file here</li>
                </ol>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="preview-section">
              <div className="preview-controls">
                <div className="control-row">
                  <label>Infrastructure Type:</label>
                  <select
                    value={typeId}
                    onChange={(e) => setTypeId(e.target.value)}
                    className="type-select"
                  >
                    <option value="">Select Type</option>
                    {types.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="select-all-row">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={parsedLines.length > 0 && getSelectedCount() === parsedLines.length}
                    onChange={(e) => toggleAllLines(e.target.checked)}
                  />
                  <label htmlFor="select-all">
                    Select All ({getSelectedCount()} of {parsedLines.length})
                  </label>
                </div>
              </div>

              <div className="lines-list">
                <table className="lines-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Select</th>
                      <th>Name</th>
                      <th>Points</th>
                      <th>Cable Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedLines.map((line, idx) => (
                      <tr key={idx} className={selectedLines[idx] ? 'selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedLines[idx] || false}
                            onChange={() => toggleLineSelection(idx)}
                          />
                        </td>
                        <td className="name-cell">{line.name}</td>
                        <td>{line.coordinates?.length || 0}</td>
                        <td>
                          {line.cable_length ? `${(line.cable_length / 1000).toFixed(2)} km` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="confirm-section">
              <div className="confirm-summary">
                <h3>Import Summary</h3>
                <div className="summary-item">
                  <span>Type:</span>
                  <strong>{types.find(t => t.id === parseInt(typeId))?.name}</strong>
                </div>
                <div className="summary-item">
                  <span>Lines to Import:</span>
                  <strong>{getSelectedCount()} lines</strong>
                </div>
                <div className="summary-item">
                  <span>Total Points:</span>
                  <strong>
                    {Object.keys(selectedLines)
                      .filter(idx => selectedLines[idx])
                      .reduce((sum, idx) => sum + (parsedLines[idx].coordinates?.length || 0), 0)}
                  </strong>
                </div>
                <div className="summary-item">
                  <span>Total Cable Length:</span>
                  <strong>
                    {(Object.keys(selectedLines)
                      .filter(idx => selectedLines[idx])
                      .reduce((sum, idx) => sum + (parsedLines[idx].cable_length || 0), 0) / 1000).toFixed(2)} km
                  </strong>
                </div>
              </div>

              <div className="confirm-note">
                <p>ℹ️ The selected cables will be imported as cable infrastructure (LineString type).</p>
                <p>You can edit them later in the Infrastructure Management panel.</p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'upload' && (
            <>
              <button
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUploadAndParse}
                disabled={!file || loading}
              >
                {loading ? 'Parsing...' : 'Parse KML/KMZ'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setParsedLines([]);
                  setFileName('');
                }}
              >
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={getSelectedCount() === 0 || !typeId}
              >
                Next: Review
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setStep('preview')}
                disabled={loading}
              >
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleFinalImport}
                disabled={loading}
              >
                {loading ? 'Importing...' : 'Confirm Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KmlImportModal;
