import React, { useState, useEffect } from 'react';
import {
  spliceTrayService,
  pigtailService,
  splitterService,
  splitterPortService,
  cableService,
  infrastructureService,
  portService,
  odcSpliceService,
  odcPortConnectionService
} from '../services/services';
import {
  Plus, X, Trash2, Pencil, Network, Cable, Box, Link, ChevronRight, Plug, ArrowRight
} from 'lucide-react';
import './OdcManager.css';

const OdcManager = ({ infrastructure, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [spliceTrays, setSpliceTrays] = useState([]);
  const [pigtails, setPigtails] = useState([]);
  const [splitters, setSplitters] = useState([]);
  const [cables, setCables] = useState([]);
  const [ports, setPorts] = useState([]);
  const [splices, setSplices] = useState([]);
  const [odcPortConnections, setOdcPortConnections] = useState([]);

  // Colors for pigtails
  const colors = [
    { value: 'Blue', hex: '#0077BE' },
    { value: 'Orange', hex: '#FFA500' },
    { value: 'Green', hex: '#008A00' },
    { value: 'Brown', hex: '#8B4513' },
    { value: 'Slate', hex: '#708090' },
    { value: 'White', hex: '#F5F5F5' },
    { value: 'Red', hex: '#FF0000' },
    { value: 'Black', hex: '#000000' },
    { value: 'Yellow', hex: '#FFFF00' },
    { value: 'Violet', hex: '#EE82EE' },
    { value: 'Rose', hex: '#FF007F' },
    { value: 'Aqua', hex: '#00FFFF' },
  ];

  // Ratios for splitter
  const ratios = [
    { value: '1:2', label: '1:2 (2 Ports)', port_count: 2 },
    { value: '1:4', label: '1:4 (4 Ports)', port_count: 4 },
    { value: '1:8', label: '1:8 (8 Ports)', port_count: 8 },
    { value: '1:16', label: '1:16 (16 Ports)', port_count: 16 },
    { value: '1:32', label: '1:32 (32 Ports)', port_count: 32 },
  ];

  useEffect(() => {
    loadAllData();
  }, [infrastructure.id]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [traysRes, pigtailsRes, splittersRes, cablesRes, portsRes, splicesRes, odcConnRes] = await Promise.all([
        spliceTrayService.getByInfrastructure(infrastructure.id),
        pigtailService.getByInfrastructure(infrastructure.id),
        splitterService.getByInfrastructure(infrastructure.id),
        cableService.getAll(),
        portService.getByInfrastructure(infrastructure.id),
        odcSpliceService.getByInfrastructure(infrastructure.id),
        odcPortConnectionService.getConnections(infrastructure.id).catch(() => ({ data: { connections: [], all_ports: [], available_ports: [] } })),
      ]);

      setSpliceTrays(traysRes.data);
      setPigtails(pigtailsRes.data);
      setSplitters(splittersRes.data);
      setCables(cablesRes.data);
      setPorts(portsRes.data);
      setSplices(splicesRes.data);
      console.log('[DEBUG] loadAllData - splices received:', splicesRes.data);
      setOdcPortConnections(odcConnRes.data);
    } catch (error) {
      console.error('Error loading ODC data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const getStats = () => {
    const totalPorts = ports.length;
    const usedPorts = odcPortConnections.connections?.length || 0;
    const pigtailsInTray = pigtails.length;
    const splicedPigtails = pigtails.filter(p => p.status === 'spliced').length;
    const splitterCount = splitters.length;
    const totalSplitterPorts = splitters.reduce((sum, s) => sum + (s.port_count || 0), 0);
    const usedSplitterPorts = splitters.reduce((sum, s) => sum + (s.used_ports_count || 0), 0);

    return {
      totalPorts,
      usedPorts,
      availablePorts: totalPorts - Math.ceil(usedPorts / 2),
      spliceTrays: spliceTrays.length,
      pigtailsInTray,
      splicedPigtails,
      splitterCount,
      totalSplitterPorts,
      usedSplitterPorts,
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="odc-manager">
        <div className="odc-loading">Memuat Manajemen ODC...</div>
      </div>
    );
  }

  return (
    <div className="odc-manager">
      <div className="odc-header">
        <div>
          <h2>{infrastructure.name}</h2>
          <p>Optical Distribution Cabinet - Kelola Koneksi Port</p>
        </div>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      {/* Tab Navigation */}
      <div className="odc-tabs">
        <button
          className={`odc-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`odc-tab ${activeTab === 'feeder' ? 'active' : ''}`}
          onClick={() => setActiveTab('feeder')}
        >
          <Box size={14} /> Tray & Pigtail
        </button>
        <button
          className={`odc-tab ${activeTab === 'splitters' ? 'active' : ''}`}
          onClick={() => setActiveTab('splitters')}
        >
          <Network size={14} /> Splitters
        </button>
        <button
          className={`odc-tab ${activeTab === 'portodc' ? 'active' : ''}`}
          onClick={() => setActiveTab('portodc')}
        >
          <Plug size={14} /> Port ODC
        </button>
        <button
          className={`odc-tab ${activeTab === 'distribution' ? 'active' : ''}`}
          onClick={() => setActiveTab('distribution')}
        >
          <Cable size={14} /> Distribusi
        </button>
      </div>

      {/* Tab Content */}
      <div className="odc-content">
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} infrastructure={infrastructure} />
        )}

        {activeTab === 'feeder' && (
          <FeederTab
            spliceTrays={spliceTrays}
            pigtails={pigtails}
            splices={splices}
            ports={ports}
            cables={cables}
            colors={colors}
            infrastructureId={infrastructure.id}
            infrastructureName={infrastructure.name}
            splitters={splitters}
            odcPortConnections={odcPortConnections}
            onRefresh={loadAllData}
            loadAllData={loadAllData}
          />
        )}

        {activeTab === 'splitters' && (
          <SplittersTab
            splitters={splitters}
            pigtails={pigtails}
            cables={cables}
            ratios={ratios}
            infrastructureId={infrastructure.id}
            infrastructureName={infrastructure.name}
            odcPortConnections={odcPortConnections}
            onRefresh={loadAllData}
            loadAllData={loadAllData}
          />
        )}

        {activeTab === 'portodc' && (
          <PortOdcTab
            ports={ports}
            odcPortConnections={odcPortConnections}
            splitters={splitters}
            cables={cables}
            pigtails={pigtails}
            splices={splices}
            infrastructureId={infrastructure.id}
            infrastructureName={infrastructure.name}
            onRefresh={loadAllData}
            loadAllData={loadAllData}
          />
        )}

        {activeTab === 'distribution' && (
          <DistributionTab
            splitters={splitters}
            cables={cables}
            odcPortConnections={odcPortConnections}
            infrastructureId={infrastructure.id}
            infrastructureName={infrastructure.name}
            onRefresh={loadAllData}
            loadAllData={loadAllData}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab
const OverviewTab = ({ stats, infrastructure }) => (
  <div className="overview-tab">
    <div className="flow-diagram">
      <h3>Alur Sinyal ODC</h3>
      <div className="flow-steps">
        <div className="flow-step">
          <div className="flow-icon feeder">F</div>
          <div className="flow-info">
            <strong>Feeder</strong>
            <span>Kabel dari POP</span>
          </div>
        </div>
        <ChevronRight className="flow-arrow" />
        <div className="flow-step">
          <div className="flow-icon splice">S</div>
          <div className="flow-info">
            <strong>Splice Tray</strong>
            <span>Pigtail</span>
          </div>
        </div>
        <ChevronRight className="flow-arrow" />
        <div className="flow-step">
          <div className="flow-icon portodc">P</div>
          <div className="flow-info">
            <strong>Port ODC</strong>
            <span>Barel</span>
          </div>
        </div>
        <ChevronRight className="flow-arrow" />
        <div className="flow-step">
          <div className="flow-icon splitter">SP</div>
          <div className="flow-info">
            <strong>Splitter</strong>
            <span>Distribusi</span>
          </div>
        </div>
        <ChevronRight className="flow-arrow" />
        <div className="flow-step">
          <div className="flow-icon distribution">D</div>
          <div className="flow-info">
            <strong>Distribusi</strong>
            <span>Ke ODP</span>
          </div>
        </div>
      </div>
    </div>

    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon ports">
          <Box size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.totalPorts}</span>
          <span className="stat-label">Port ODC</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon available">
          <Plug size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.availablePorts}</span>
          <span className="stat-label">Tersedia</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon used">
          <Network size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.splitterCount}</span>
          <span className="stat-label">Splitters</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon allocated">
          <Cable size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.usedSplitterPorts}/{stats.totalSplitterPorts}</span>
          <span className="stat-label">Port Splitter</span>
        </div>
      </div>
    </div>

    <div className="info-banner">
      <strong>Petunjuk Alur:</strong><br/>
      1. <strong>Tray & Pigtail</strong> - Kelola splice tray dan pigtail<br/>
      2. <strong>Splitters</strong> - Tambahkan splitter<br/>
      3. <strong>Port ODC</strong> - Colok splitter ke port ODC<br/>
      4. <strong>Distribusi</strong> - Alokasikan output splitter ke ODP
    </div>
  </div>
);

// Feeder Tab
const FeederTab = ({ spliceTrays, pigtails, splices, ports, cables, colors, infrastructureId, splitters, odcPortConnections, onRefresh, loadAllData }) => {
  const [trayForm, setTrayForm] = useState({ name: '', tray_number: '' });
  const [pigtailForm, setPigtailForm] = useState({ splice_tray_id: '', port_number: '', color: 'Blue', fiber_type: 'SMF', notes: '' });
  const [showTrayForm, setShowTrayForm] = useState(false);
  const [showPigtailForm, setShowPigtailForm] = useState(false);
  const [showSpliceForm, setShowSpliceForm] = useState(false);
  const [spliceForm, setSpliceForm] = useState({ splice_tray_id: '', cable_id: '', core_number: '', pigtail_id: '' });
  const [selectedTrayForSplice, setSelectedTrayForSplice] = useState(null);
  const [cableCores, setCableCores] = useState([]);
  const [loadingCores, setLoadingCores] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [selectedPigtail, setSelectedPigtail] = useState(null);
  const [connectForm, setConnectForm] = useState({ port_id: '' });
  const [connectingPort, setConnectingPort] = useState(false);

  const handleAddTray = async (e) => {
    e.preventDefault();
    try {
      await spliceTrayService.create(infrastructureId, trayForm);
      setTrayForm({ name: '', tray_number: '' });
      setShowTrayForm(false);
      await onRefresh?.();
    } catch (error) {
      alert('Gagal menambah tray: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteTray = async (id) => {
    if (!window.confirm('Hapus tray ini?')) return;
    try {
      await spliceTrayService.delete(id);
      await onRefresh?.();
    } catch (error) {
      alert('Gagal menghapus: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAddPigtail = async (e) => {
    e.preventDefault();
    try {
      await pigtailService.create(infrastructureId, {
        ...pigtailForm,
        splice_tray_id: pigtailForm.splice_tray_id ? parseInt(pigtailForm.splice_tray_id) : null,
        port_number: pigtailForm.port_number ? parseInt(pigtailForm.port_number) : null,
      });
      setPigtailForm({ splice_tray_id: '', port_number: '', color: 'Blue', fiber_type: 'SMF', notes: '' });
      setShowPigtailForm(false);
      await onRefresh?.();
    } catch (error) {
      alert('Gagal menambah pigtail: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeletePigtail = async (id) => {
    if (!window.confirm('Hapus pigtail ini?')) return;
    try {
      await pigtailService.delete(id);
      await onRefresh?.();
    } catch (error) {
      alert('Gagal menghapus: ' + (error.response?.data?.error || error.message));
    }
  };

  const openSpliceForm = (tray) => {
    setSelectedTrayForSplice(tray);
    setSpliceForm({ splice_tray_id: tray.id, cable_id: '', core_number: '', pigtail_id: '' });
    setCableCores([]);
    setShowSpliceForm(true);
  };

  const handleSaveSplice = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        splice_tray_id: spliceForm.splice_tray_id ? parseInt(spliceForm.splice_tray_id) : null,
        cable_id: spliceForm.cable_id ? parseInt(spliceForm.cable_id) : null,
        feeder_core_number: spliceForm.core_number ? parseInt(spliceForm.core_number) : null,
        pigtail_id: spliceForm.pigtail_id ? parseInt(spliceForm.pigtail_id) : null,
      };
      console.log('[DEBUG] Saving splice with payload:', payload);
      const res = await odcSpliceService.create(infrastructureId, payload);
      console.log('[DEBUG] Splice created, response:', res.data);
      setShowSpliceForm(false);
      setSpliceForm({ splice_tray_id: '', cable_id: '', core_number: '', pigtail_id: '' });
      setSelectedTrayForSplice(null);
      console.log('[DEBUG] Calling onRefresh to reload...');
      await onRefresh?.();
      console.log('[DEBUG] Refresh complete');
    } catch (error) {
      console.error('[DEBUG] Splice save error:', error.response?.data || error.message);
      alert('Gagal menyimpan splice: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteSplice = async (spliceId) => {
    if (!window.confirm('Hapus splice ini?')) return;
    try {
      await odcSpliceService.delete(spliceId);
      await onRefresh?.();
    } catch (error) {
      alert('Gagal menghapus splice: ' + (error.response?.data?.error || error.message));
    }
  };

  const openConnectForm = (pigtail) => {
    setSelectedPigtail(pigtail);
    setConnectForm({ port_id: '' });
    setShowConnectForm(true);
  };

  const handleConnectToPort = async (e) => {
    e.preventDefault();
    if (!connectForm.port_id) {
      alert('Pilih port terlebih dahulu');
      return;
    }
    setConnectingPort(true);
    try {
      await odcPortConnectionService.connectPigtail(infrastructureId, {
        port_id: parseInt(connectForm.port_id),
        pigtail_id: selectedPigtail.id,
      });
      setShowConnectForm(false);
      setSelectedPigtail(null);
      setConnectForm({ port_id: '' });
      await onRefresh?.();
    } catch (error) {
      alert('Gagal menghubungkan ke port: ' + (error.response?.data?.error || error.message));
    } finally {
      setConnectingPort(false);
    }
  };

  const handleDisconnectFromPort = async (pigtailId) => {
    if (!window.confirm('Putuskan koneksi pigtail dari port?')) return;
    try {
      // Find the connection for this pigtail
      const connectionsRes = await odcPortConnectionService.getConnections(infrastructureId);
      const connection = connectionsRes.data.connections?.find(
        c => c.pigtail_id === pigtailId && c.connection_type === 'pigtail'
      );
      if (connection) {
        await odcPortConnectionService.disconnect(connection.id);
        await onRefresh?.();
      }
    } catch (error) {
      alert('Gagal memutuskan koneksi: ' + (error.response?.data?.error || error.message));
    }
  };

  // Load cores when cable changes in splice form
  const handleCableChange = async (cableId) => {
    setSpliceForm({ ...spliceForm, cable_id: cableId, core_number: '' });
    setCableCores([]);
    if (!cableId) return;
    setLoadingCores(true);
    try {
      const res = await cableService.getCores(cableId);
      setCableCores(res.data || []);
    } catch (error) {
      console.error('Error loading cores:', error);
    } finally {
      setLoadingCores(false);
    }
  };

  return (
    <div className="feeder-tab">
      <div className="info-banner">
        <strong>Alur Feeder:</strong> Kabel Feeder (POP) → Splice Tray → Pigtail → Port ODC (Barel)
      </div>

      <div className="section">
        <div className="section-header">
          <h3><Box size={16} /> Splice Tray & Splice ({spliceTrays.length})</h3>
          <button className="btn btn-sm btn-primary" onClick={() => setShowTrayForm(true)}>
            <Plus size={14} /> Tambah Tray
          </button>
        </div>

        {showTrayForm && (
          <form className="inline-form" onSubmit={handleAddTray}>
            <input
              type="text"
              placeholder="Nama Tray (misal: Tray 1)"
              value={trayForm.name}
              onChange={(e) => setTrayForm({ ...trayForm, name: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="No. Tray"
              value={trayForm.tray_number}
              onChange={(e) => setTrayForm({ ...trayForm, tray_number: e.target.value })}
              style={{ width: '80px' }}
            />
            <button type="submit" className="btn btn-sm btn-primary">Simpan</button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowTrayForm(false)}>Batal</button>
          </form>
        )}

        <div className="trays-list">
          {spliceTrays.length === 0 ? (
            <p className="empty-text">Belum ada splice tray. Tambahkan tray untuk mulai membuat splice.</p>
          ) : (
            spliceTrays.map(tray => {
              const traySplices = splices.filter(s => s.splice_tray_id === tray.id);
              const trayPigtails = pigtails.filter(p => p.splice_tray_id === tray.id);
              const splicedPigtailIds = traySplices.map(s => s.pigtail_id);
              const availablePigtails = trayPigtails.filter(p => !splicedPigtailIds.includes(p.id));

              return (
                <div key={tray.id} className="tray-card">
                  <div className="tray-header">
                    <div className="tray-info">
                      <strong>{tray.name || `Tray ${tray.tray_number || ''}`}</strong>
                      <span>{traySplices.length} splices</span>
                    </div>
                    <div className="tray-actions">
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => openSpliceForm(tray)}
                        title="Tambah Splice"
                      >
                        <Plus size={12} /> Splice
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => handleDeleteTray(tray.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {traySplices.length > 0 && (
                    <div className="tray-splices">
                      {traySplices.map(splice => {
                        // Data sudah preload dari backend (splice.cable, splice.pigtail)
                        console.log('[DEBUG] FeederTab rendering splice:', splice.id, {
                          cable: splice.cable,
                          pigtail: splice.pigtail,
                          feeder_core_number: splice.feeder_core_number,
                          splice_tray_id: splice.splice_tray_id,
                        });
                        const cable = splice.cable;
                        const pigtail = splice.pigtail;
                        const tray = spliceTrays.find(t => t.id === splice.splice_tray_id);
                        const fromName = cable?.from_infrastructure?.name;
                        const toName = cable?.to_infrastructure?.name;
                        const pigColor = pigtail?.color;
                        return (
                          <div key={splice.id} className="splice-item">
                            <div className="splice-feeder">
                              <div className="splice-label">FEEDER</div>
                              <div className="splice-cable-name">{cable?.name || '—'}</div>
                              {fromName || toName ? (
                                <div className="splice-cable-route">
                                  {fromName && <span className="route-from">{fromName}</span>}
                                  {fromName && toName && <ArrowRight size={10} />}
                                  {toName && <span className="route-to">{toName}</span>}
                                </div>
                              ) : null}
                              <div className="splice-core-info">
                                <span className="core-badge">Core {splice.feeder_core_number ?? '—'}</span>
                              </div>
                            </div>
                            <div className="splice-connector">
                              <ArrowRight size={14} />
                            </div>
                            <div className="splice-pigtail-info">
                              <div className="splice-label">PIGTAIL</div>
                              <span
                                className="splice-pigtail-badge"
                                style={{
                                  backgroundColor: (getPigtailColor(pigColor) || '#999') + '22',
                                  borderColor: getPigtailColor(pigColor) || '#999',
                                  color: getPigtailColor(pigColor) || '#999',
                                }}
                              >
                                <span className="pigtail-dot" style={{ backgroundColor: getPigtailColor(pigColor) || '#999' }} />
                                {pigColor || '—'}
                              </span>
                              <span className="splice-tray-label">{tray?.name || `Tray ${tray?.tray_number}`}</span>
                            </div>
                            <button
                              className="btn-icon btn-danger btn-xs"
                              onClick={() => handleDeleteSplice(splice.id)}
                              title="Hapus Splice"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Splice Form Modal */}
      {showSpliceForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Tambah Splice - {selectedTrayForSplice?.name || `Tray ${selectedTrayForSplice?.tray_number || ''}`}</h3>
              <button className="btn-close" onClick={() => setShowSpliceForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveSplice}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Pilih Kabel Feeder</label>
                  <select
                    value={spliceForm.cable_id}
                    onChange={(e) => handleCableChange(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Kabel --</option>
                    {cables
                      .filter(cable =>
                        parseInt(cable.from_infrastructure_id) === infrastructureId ||
                        parseInt(cable.to_infrastructure_id) === infrastructureId
                      )
                      .map(cable => (
                        <option key={cable.id} value={cable.id}>{cable.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="form-group">
                  <label>Pilih Core</label>
                  <select
                    value={spliceForm.core_number}
                    onChange={(e) => setSpliceForm({ ...spliceForm, core_number: e.target.value })}
                    required
                    disabled={!spliceForm.cable_id || loadingCores}
                  >
                    <option value="">-- Pilih Core --</option>
                    {loadingCores ? (
                      <option value="">Memuat cores...</option>
                    ) : (
                      cableCores.map(core => (
                        <option key={core.core_number} value={core.core_number}>
                          Core {core.core_number} {core.status === 'used' ? `(${core.status})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Pilih Pigtail (Warna)</label>
                  <select
                    value={spliceForm.pigtail_id}
                    onChange={(e) => setSpliceForm({ ...spliceForm, pigtail_id: e.target.value })}
                    required
                  >
                    <option value="">-- Pilih Pigtail --</option>
                    {pigtails
                      .filter(p => p.splice_tray_id === parseInt(spliceForm.splice_tray_id))
                      .filter(p => !splices.some(s => s.pigtail_id === p.id))
                      .map(pigtail => (
                        <option key={pigtail.id} value={pigtail.id}>
                          {pigtail.color} {pigtail.port_number ? `(Port ${pigtail.port_number})` : ''}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">Simpan Splice</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSpliceForm(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <h3><Network size={16} /> Pigtails ({pigtails.length})</h3>
          <button className="btn btn-sm btn-primary" onClick={() => setShowPigtailForm(true)}>
            <Plus size={14} /> Tambah Pigtail
          </button>
        </div>

        {showPigtailForm && (
          <form className="inline-form" onSubmit={handleAddPigtail}>
            <select
              value={pigtailForm.splice_tray_id}
              onChange={(e) => setPigtailForm({ ...pigtailForm, splice_tray_id: e.target.value })}
              required
            >
              <option value="">-- Pilih Tray --</option>
              {spliceTrays.map(tray => (
                <option key={tray.id} value={tray.id}>
                  {tray.name || `Tray ${tray.tray_number || ''}`}
                </option>
              ))}
            </select>
            <select
              value={pigtailForm.color}
              onChange={(e) => setPigtailForm({ ...pigtailForm, color: e.target.value })}
            >
              {colors.map(c => (
                <option key={c.value} value={c.value}>{c.value}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Port No."
              value={pigtailForm.port_number}
              onChange={(e) => setPigtailForm({ ...pigtailForm, port_number: e.target.value })}
              style={{ width: '80px' }}
            />
            <button type="submit" className="btn btn-sm btn-primary">Simpan</button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowPigtailForm(false)}>Batal</button>
          </form>
        )}

        <div className="pigtails-grid">
          {pigtails.length === 0 ? (
            <p className="empty-text">Belum ada pigtail</p>
          ) : (
            pigtails.map(pigtail => {
              const isSpliced = splices.some(s => s.pigtail_id === pigtail.id);
              const tray = spliceTrays.find(t => t.id === pigtail.splice_tray_id);
              const isConnected = odcPortConnections?.connections?.some(
                c => c.pigtail_id === pigtail.id && c.connection_type === 'pigtail'
              );
              const connection = odcPortConnections?.connections?.find(
                c => c.pigtail_id === pigtail.id && c.connection_type === 'pigtail'
              );
              return (
                <div key={pigtail.id} className={`pigtail-card ${isSpliced ? 'spliced' : pigtail.status} ${isConnected ? 'connected' : ''}`}>
                  <div
                    className="pigtail-color"
                    style={{ backgroundColor: getPigtailColor(pigtail.color) }}
                  />
                  <div className="pigtail-info">
                    <strong>{pigtail.color}</strong>
                    <span>{tray ? tray.name || `Tray ${tray.tray_number || ''}` : 'Belum ada tray'}</span>
                    {isConnected ? (
                      <span className="status-badge connected">Port {connection?.port?.port_number || ''}</span>
                    ) : (
                      <span className={`status-badge ${isSpliced ? 'spliced' : ''}`}>
                        {isSpliced ? 'Belum Terhubung' : 'Belum'}
                      </span>
                    )}
                  </div>
                  <div className="pigtail-actions">
                    {isSpliced && !isConnected && (
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => openConnectForm(pigtail)}
                        title="Hubungkan ke Port"
                      >
                        Hubungkan
                      </button>
                    )}
                    {isSpliced && isConnected && (
                      <button
                        className="btn btn-xs btn-secondary"
                        onClick={() => handleDisconnectFromPort(pigtail.id)}
                        title="Putuskan dari Port"
                      >
                        Putus
                      </button>
                    )}
                    {!isSpliced && (
                      <button
                        className="btn-icon btn-danger btn-xs"
                        onClick={() => handleDeletePigtail(pigtail.id)}
                        title="Hapus Pigtail"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Connect Pigtail to Port Modal */}
      {showConnectForm && selectedPigtail && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Hubungkan Pigtail ke Port ODC</h3>
              <button className="btn-close" onClick={() => setShowConnectForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleConnectToPort}>
              <div className="modal-body">
                <div className="connect-info">
                  <div className="connect-pigtail">
                    <span
                      className="pigtail-dot"
                      style={{ backgroundColor: getPigtailColor(selectedPigtail.color) }}
                    />
                    <strong>{selectedPigtail.color}</strong>
                    <span>→</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Pilih Port ODC</label>
                  <select
                    value={connectForm.port_id}
                    onChange={(e) => setConnectForm({ ...connectForm, port_id: e.target.value })}
                    required
                  >
                    <option value="">-- Pilih Port --</option>
                    {odcPortConnections?.available_ports?.map(port => (
                      <option key={port.id} value={port.id}>
                        Port {port.port_number} {port.status !== 'available' ? `(${port.status})` : ''}
                      </option>
                    ))}
                    {odcPortConnections?.all_ports?.filter(port => {
                      const usedPositions = odcPortConnections?.connections
                        ?.filter(c => c.port_id === port.id)
                        ?.length || 0;
                      return usedPositions < 2;
                    }).filter(port => !odcPortConnections?.available_ports?.some(p => p.id === port.id))
                      .map(port => (
                        <option key={port.id} value={port.id}>
                          Port {port.port_number}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={connectingPort}>
                  {connectingPort ? 'Menghubungkan...' : 'Hubungkan'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowConnectForm(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Splitters Tab
const SplittersTab = ({ splitters, pigtails, cables, ratios, infrastructureId, infrastructureName, odcPortConnections, onRefresh, loadAllData }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', ratio: '1:8', notes: '' });

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await splitterService.create({
        ...form,
        infrastructure_id: infrastructureId,
      });
      setShowForm(false);
      setForm({ name: '', ratio: '1:8', notes: '' });
      await onRefresh?.();
    } catch (error) {
      alert('Gagal menambah splitter: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus splitter ini?')) return;
    try {
      await splitterService.delete(id);
      await onRefresh?.();
    } catch (error) {
      alert('Gagal menghapus: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="splitters-tab">
      <div className="info-banner">
        <strong>Alur Splitter:</strong> Port ODC (Barel) → INPUT Splitter → OUTPUT Ports → Port ODC (Output) → Kabel → ODP
      </div>

      <div className="section">
        <div className="section-header">
          <h3><Network size={16} /> Splitters ({splitters.length})</h3>
          <button className="btn btn-sm btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Tambah Splitter
          </button>
        </div>

        {showForm && (
          <form className="inline-form" onSubmit={handleAdd}>
            <input
              type="text"
              placeholder="Nama Splitter (misal: SPL-01)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <select
              value={form.ratio}
              onChange={(e) => setForm({ ...form, ratio: e.target.value })}
            >
              {ratios.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-sm btn-primary">Simpan</button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
          </form>
        )}

        <div className="splitters-list">
          {splitters.length === 0 ? (
            <p className="empty-text">Belum ada splitter. Tambahkan splitter untuk mulai mendistribusikan sinyal.</p>
          ) : (
            splitters.map(splitter => (
              <div key={splitter.id} className="splitter-card">
                <div className="splitter-header">
                  <div className="splitter-info">
                    <strong>{splitter.name}</strong>
                    <span className="ratio-badge">{splitter.ratio}</span>
                  </div>
                  <div className="splitter-stats">
                    <span className="available">{splitter.available_ports_count || 0} tersedia</span>
                    <span className="used">{splitter.used_ports_count || 0} terpakai</span>
                  </div>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(splitter.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="splitter-ports-layout">
                  {/* INPUT Port */}
                  <div className="splitter-input-section">
                    <span className="input-label">INPUT</span>
                    {(() => {
                      const inputConn = odcPortConnections?.connections?.find(c => c.splitter_id === splitter.id && c.connection_type === 'splitter_input');
                      const portNumber = inputConn?.port?.port_number;
                      const pigtailInfo = inputConn?.pigtail;
                      return (
                        <div className={`splitter-input-port ${inputConn ? 'connected' : 'empty'}`}>
                          {inputConn ? (
                            <>
                              <span className="input-connected">
                                <Plug size={12} /> Port {portNumber}
                              </span>
                              {pigtailInfo && (
                                <span className="input-pigtail">
                                  <span className="pigtail-dot" style={{ backgroundColor: getPigtailColor(pigtailInfo.color) }}></span>
                                  {pigtailInfo.color}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="input-empty">Belum Terhubung</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="splitter-ports-divider">
                    <ArrowRight size={16} />
                  </div>

                  {/* OUTPUT Ports */}
                  <div className="splitter-ports-grid">
                    {splitter.ports?.map(port => {
                      const isUsed = port.destination_infrastructure_id;
                      return (
                        <div key={port.id} className={`splitter-port-item ${isUsed ? 'used' : 'available'}`}>
                          <span className="port-num">P{port.port_number}</span>
                          {isUsed ? (
                            <span className="port-dest">
                              → {port.destination?.name || 'ODP'}
                            </span>
                          ) : (
                            <span className="port-empty">Kosong</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="splitter-help">
                  <small>Hubungkan INPUT dan OUTPUT di tab Port ODC</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Port ODC Tab - NEW
const PortOdcTab = ({ ports, odcPortConnections, splitters, cables, pigtails, splices, infrastructureId, infrastructureName, onRefresh, loadAllData }) => {
  const [showConnectModal, setShowConnectModal] = useState(null);
  const [availableSplitters, setAvailableSplitters] = useState([]);
  const [availableSplitterPorts, setAvailableSplitterPorts] = useState([]);
  const [availableOdps, setAvailableOdps] = useState([]);
  const [connectType, setConnectType] = useState('splitter_input'); // splitter_input, splitter_output, pigtail
  const [selectedSplitter, setSelectedSplitter] = useState(null);
  const [selectedSplitterPort, setSelectedSplitterPort] = useState(null);
  const [showCreateOdp, setShowCreateOdp] = useState(false);

  // Edit connection state
  const [showEditModal, setShowEditModal] = useState(null); // holds connection being edited
  const [editForm, setEditForm] = useState({ notes: '', new_odp_id: '' });
  const [editOdps, setEditOdps] = useState([]);
  const [connectForm, setConnectForm] = useState({
    port_id: '',
    splitter_id: '',
    splitter_port_id: '',
    odp_id: '',
    pigtail_id: '',
    create_odp: false,
    new_odp_name: '',
    new_odp_latitude: '',
    new_odp_longitude: '',
    new_odp_address: '',
  });

  useEffect(() => {
    loadAvailableData();
  }, [showConnectModal, connectType]);

  const loadAvailableData = async () => {
    if (!showConnectModal) return;
    try {
      const [splittersRes, portsRes, odpsRes] = await Promise.all([
        odcPortConnectionService.getAvailableSplitters(infrastructureId),
        Promise.resolve({ data: ports }),
        connectType === 'splitter_output' || connectType === 'splitter_input'
          ? odcPortConnectionService.getConnectedOdps(infrastructureId)
          : Promise.resolve({ data: [] }),
      ]);
      // Use API data, or fallback to props if API returns empty
      const apiSplitters = Array.isArray(splittersRes.data) ? splittersRes.data : [];
      const notConnected = splitters.filter(s =>
        !odcPortConnections?.connections?.some(c => c.splitter_id === s.id && c.connection_type === 'splitter_input')
      );
      setAvailableSplitters(apiSplitters.length > 0 ? apiSplitters : notConnected);

      // Use API ODPs, or fallback to all infrastructures filtered as ODP
      if (odpsRes.data && odpsRes.data.length > 0) {
        setAvailableOdps(odpsRes.data);
      } else {
        // Fallback: get all infrastructures and filter for ODP type
        try {
          const allInfra = await infrastructureService.getAll();
          // Filter untuk ODP - Anda mungkin perlu menyesuaikan ini berdasarkan struktur data Anda
          const odpList = allInfra.data.filter(i => i.type?.category === 'odp' && i.id !== infrastructureId);
          setAvailableOdps(odpList);
        } catch (e) {
          console.error('Error loading ODPs from fallback:', e);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to props splitters if API fails
      const notConnected = splitters.filter(s =>
        !odcPortConnections?.connections?.some(c => c.splitter_id === s.id && c.connection_type === 'splitter_input')
      );
      setAvailableSplitters(notConnected);

      // Try fallback for ODPs
      try {
        const allInfra = await infrastructureService.getAll();
        const odpList = allInfra.data.filter(i => i.type?.category === 'odp' && i.id !== infrastructureId);
        setAvailableOdps(odpList);
      } catch (e) {
        console.error('Error loading ODPs from fallback:', e);
      }
    }
  };

  const handleSplitterSelect = async (splitterId) => {
    setSelectedSplitter(splitterId);
    setConnectForm({ ...connectForm, splitter_id: splitterId });
    try {
      const res = await odcPortConnectionService.getAvailableSplitterPorts(infrastructureId);
      setAvailableSplitterPorts(res.data.filter(sp => sp.splitter_id === parseInt(splitterId)));
    } catch (error) {
      console.error('Error loading splitter ports:', error);
    }
  };

  const handleOpenConnect = (port, type) => {
    setShowConnectModal(port);
    setConnectType(type);
    setSelectedSplitter(null);
    setSelectedSplitterPort(null);
    setShowCreateOdp(false);
    setConnectForm({
      port_id: port.id,
      splitter_id: '',
      splitter_port_id: '',
      odp_id: '',
      pigtail_id: '',
      create_odp: false,
      new_odp_name: '',
      new_odp_latitude: '',
      new_odp_longitude: '',
      new_odp_address: '',
    });
  };

  const handleConnect = async () => {
    try {
      if (connectType === 'pigtail') {
        if (!connectForm.pigtail_id) {
          alert('Pilih pigtail');
          return;
        }
        const result = await odcPortConnectionService.connectPigtail(infrastructureId, {
          port_id: connectForm.port_id,
          pigtail_id: parseInt(connectForm.pigtail_id),
        });
        alert('Berhasil menghubungkan pigtail ke port');
      } else if (connectType === 'splitter_input') {
        if (!connectForm.splitter_id) {
          alert('Pilih splitter');
          return;
        }
        const result = await odcPortConnectionService.connectSplitterInput(infrastructureId, {
          port_id: connectForm.port_id,
          splitter_id: parseInt(connectForm.splitter_id),
        });
        alert(result.data.message || 'Berhasil menghubungkan splitter input');
      } else {
        if (!connectForm.splitter_port_id) {
          alert('Pilih port splitter');
          return;
        }
        if (connectForm.create_odp) {
          if (!connectForm.new_odp_name) {
            alert('Nama ODP harus diisi');
            return;
          }
        } else if (!connectForm.odp_id) {
          alert('Pilih ODP');
          return;
        }

        const result = await odcPortConnectionService.connectSplitterOutput(infrastructureId, {
          port_id: connectForm.port_id,
          splitter_port_id: parseInt(connectForm.splitter_port_id),
          ...(connectForm.create_odp ? {
            create_odp: {
              name: connectForm.new_odp_name,
              latitude: connectForm.new_odp_latitude || null,
              longitude: connectForm.new_odp_longitude || null,
              address: connectForm.new_odp_address || null,
            }
          } : { odp_id: parseInt(connectForm.odp_id) }),
        });
        alert(result.data.message || 'Berhasil mengalokasikan ke ODP');
      }
      setShowConnectModal(null);
      await onRefresh?.();
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData?.warning) {
        if (window.confirm(`${errorData.error}\n\nApakah Anda ingin memutus koneksi lama?`)) {
          if (errorData.existing_connection) {
            try {
              await odcPortConnectionService.disconnect(errorData.existing_connection.id);
              handleConnect(); // Retry
            } catch (e) {
              alert('Gagal: ' + (e.response?.data?.error || e.message));
            }
          }
        }
      } else {
        alert('Gagal: ' + (errorData?.error || error.message));
      }
    }
  };

  const handleDisconnect = async (connectionId) => {
    if (!window.confirm('Putus sambungan ini?')) return;
    try {
      await odcPortConnectionService.disconnect(connectionId);
      await onRefresh?.();
    } catch (error) {
      alert('Gagal: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleOpenEdit = async (connection) => {
    setShowEditModal(connection);
    setEditForm({
      notes: connection.notes || '',
      new_odp_id: connection.output_info?.destination_name
        ? connection.splitterPort?.destination_infrastructure_id || ''
        : '',
    });
    // Load available ODPs for reassignment
    if (connection.connection_type === 'splitter_output') {
      try {
        const odpsRes = await odcPortConnectionService.getConnectedOdps(infrastructureId);
        setEditOdps(odpsRes.data || []);
      } catch {
        setEditOdps([]);
      }
    }
  };

  const handleEdit = async () => {
    if (!showEditModal) return;
    try {
      await odcPortConnectionService.update(showEditModal.id, {
        notes: editForm.notes,
        ...(showEditModal.connection_type === 'splitter_output' && editForm.new_odp_id
          ? { new_odp_id: parseInt(editForm.new_odp_id) }
          : {}),
      });
      alert('Koneksi berhasil diperbarui');
      setShowEditModal(null);
      await onRefresh?.();
    } catch (error) {
      if (error.response?.data?.warning) {
        alert(error.response.data.error);
      } else {
        alert('Gagal: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  // Group connections by port
  const connectionsByPort = {};
  if (odcPortConnections.connections) {
    odcPortConnections.connections.forEach(conn => {
      if (!connectionsByPort[conn.port_id]) {
        connectionsByPort[conn.port_id] = [];
      }
      connectionsByPort[conn.port_id].push(conn);
    });
  }

  return (
    <div className="port-odc-tab">
      <div className="info-banner">
        <strong>Port ODC:</strong> Setiap port bisa maksimal 2 koneksi (A + B). Pilih: Pigtail (dari Splice Tray), INPUT Splitter, atau OUTPUT Splitter → ODP.
      </div>

      <div className="section">
        <h3><Plug size={16} /> Port ODC ({ports.length})</h3>
        <p className="section-desc">Klik tombol + pada posisi A atau B untuk menghubungkan: Pigtail, INPUT Splitter, atau OUTPUT Splitter → ODP.</p>

        {ports.length === 0 ? (
          <p className="empty-text">Tidak ada port ODC. Pastikan ODC memiliki port yang dikonfigurasi.</p>
        ) : (
          <>
            {/* Sort ports by port_number */}
            {(() => {
              const sortedPorts = [...ports].sort((a, b) => a.port_number - b.port_number);
              const leftPorts = sortedPorts.filter(p => p.port_number <= 12);
              const rightPorts = sortedPorts.filter(p => p.port_number > 12);

              const renderPortCard = (port) => {
                const portConnections = connectionsByPort[port.id] || [];
                const connectionA = portConnections.find(c => c.position === 1);
                const connectionB = portConnections.find(c => c.position === 2);
                const isConnected = portConnections.length > 0;

                return (
                  <div key={port.id} className={`odc-port-card ${isConnected ? 'connected' : ''}`}>
                    <div className="odc-port-header">
                      <div className="port-info">
                        <span className="port-num">P{port.port_number}</span>
                        <span className={`port-status ${portConnections.length === 2 ? 'full' : portConnections.length > 0 ? 'active' : 'empty'}`}>
                          {portConnections.length === 2 ? 'PENUH' : portConnections.length > 0 ? `${portConnections.length}/2` : 'KOSONG'}
                        </span>
                      </div>
                      <div className="port-actions">
                        <button
                          className="btn-add-small"
                          onClick={() => handleOpenConnect(port, portConnections.length === 0 ? 'pigtail' : portConnections.length === 1 ? (connectionA ? 'splitter_output' : 'splitter_input') : 'pigtail')}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="odc-port-body">
                      {/* A */}
                      <div className={`conn-slot ${connectionA ? 'filled' : ''}`}>
                        <span className="slot-label">A</span>
                        {connectionA ? (
                          <div className="conn-data">
                            <div className="conn-primary">
                              {connectionA.connection_type === 'pigtail' && (
                                <>
                                  <span className="color-dot" style={{ backgroundColor: getPigtailColor(connectionA.pigtail?.color) }}></span>
                                  <span className="conn-name">{connectionA.pigtail?.color}</span>
                                  {connectionA.pigtail?.tray_name && <span className="conn-sub">{connectionA.pigtail.tray_name}</span>}
                                  {connectionA.splice_info && (
                                    <div className="conn-source">
                                      <ArrowRight size={10} /> {connectionA.splice_info.cable_name} <span className="core-chip">C{connectionA.splice_info.core_number}</span>
                                    </div>
                                  )}
                                </>
                              )}
                              {connectionA.connection_type === 'splitter_input' && (
                                <>
                                  <span className="conn-name">{connectionA.splitter?.name}</span>
                                  <span className="conn-sub">IN</span>
                                </>
                              )}
                              {connectionA.connection_type === 'splitter_output' && (
                                <>
                                  <span className="conn-name">{connectionA.output_info?.destination_name || 'ODP'}</span>
                                  <span className="conn-sub">P{connectionA.output_info?.port_number}</span>
                                </>
                              )}
                            </div>
                            <div className="conn-actions">
                              <button className="btn-edit" onClick={() => handleOpenEdit(connectionA)} title="Edit"><Pencil size={11} /></button>
                              <button className="btn-x" onClick={() => handleDisconnect(connectionA.id)}><X size={12} /></button>
                            </div>
                          </div>
                        ) : (
                          <span className="empty-text">+ Hubungkan</span>
                        )}
                      </div>

                      {/* B */}
                      <div className={`conn-slot ${connectionB ? 'filled' : ''}`}>
                        <span className="slot-label">B</span>
                        {connectionB ? (
                          <div className="conn-data">
                            <div className="conn-primary">
                              {connectionB.connection_type === 'pigtail' && (
                                <>
                                  <span className="color-dot" style={{ backgroundColor: getPigtailColor(connectionB.pigtail?.color) }}></span>
                                  <span className="conn-name">{connectionB.pigtail?.color}</span>
                                  {connectionB.pigtail?.tray_name && <span className="conn-sub">{connectionB.pigtail.tray_name}</span>}
                                  {connectionB.splice_info && (
                                    <div className="conn-source">
                                      <ArrowRight size={10} /> {connectionB.splice_info.cable_name} <span className="core-chip">C{connectionB.splice_info.core_number}</span>
                                    </div>
                                  )}
                                </>
                              )}
                              {connectionB.connection_type === 'splitter_input' && (
                                <>
                                  <span className="conn-name">{connectionB.splitter?.name}</span>
                                  <span className="conn-sub">IN</span>
                                </>
                              )}
                              {connectionB.connection_type === 'splitter_output' && (
                                <>
                                  <span className="conn-name">{connectionB.output_info?.destination_name || 'ODP'}</span>
                                  <span className="conn-sub">P{connectionB.output_info?.port_number}</span>
                                </>
                              )}
                            </div>
                            <div className="conn-actions">
                              <button className="btn-edit" onClick={() => handleOpenEdit(connectionB)} title="Edit"><Pencil size={11} /></button>
                              <button className="btn-x" onClick={() => handleDisconnect(connectionB.id)}><X size={12} /></button>
                            </div>
                          </div>
                        ) : (
                          <span className="empty-text">+ Hubungkan</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div className="odc-ports-2col">
                  {/* Left Column: Port 1-12 */}
                  <div className="odc-port-col">
                    {leftPorts.map(port => renderPortCard(port))}
                    {leftPorts.length === 0 && <p className="empty-col">Tidak ada port 1-12</p>}
                  </div>
                  {/* Right Column: Port 13-24 */}
                  <div className="odc-port-col">
                    {rightPorts.map(port => renderPortCard(port))}
                    {rightPorts.length === 0 && <p className="empty-col">Tidak ada port 13+</p>}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Edit Connection Modal */}
      {showEditModal && (
        <div className="connect-modal-overlay" onClick={() => setShowEditModal(null)}>
          <div className="connect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="connect-modal-header">
              <h4>
                <Pencil size={16} />
                Edit Koneksi — Port {showEditModal.port?.port_number} ({showEditModal.connection_type === 'pigtail' ? 'Pigtail' : showEditModal.connection_type === 'splitter_input' ? 'INPUT Splitter' : 'OUTPUT Splitter'})
              </h4>
              <button className="btn-close" onClick={() => setShowEditModal(null)}>×</button>
            </div>
            <div className="connect-modal-body">
              {/* Current info display */}
              {showEditModal.connection_type === 'pigtail' && (
                <div className="edit-info-row">
                  <span className="color-dot" style={{ backgroundColor: getPigtailColor(showEditModal.pigtail?.color) }}></span>
                  <span className="conn-name">{showEditModal.pigtail?.color}</span>
                  {showEditModal.pigtail?.tray_name && <span className="conn-sub">{showEditModal.pigtail.tray_name}</span>}
                </div>
              )}
              {showEditModal.connection_type === 'splitter_input' && (
                <div className="edit-info-row">
                  <span className="conn-name">{showEditModal.splitter?.name}</span>
                  <span className="conn-sub">IN</span>
                </div>
              )}
              {showEditModal.connection_type === 'splitter_output' && (
                <div className="edit-info-row">
                  <span className="conn-name">{showEditModal.output_info?.destination_name || 'ODP'}</span>
                  <span className="conn-sub">P{showEditModal.output_info?.port_number}</span>
                </div>
              )}

              <div className="edit-divider"></div>

              {/* Notes field — available for all types */}
              <div className="form-group">
                <label>Catatan</label>
                <textarea
                  rows={2}
                  placeholder="Tambahkan catatan (opsional)"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              {/* Change destination ODP — only for splitter_output */}
              {showEditModal.connection_type === 'splitter_output' && (
                <div className="form-group">
                  <label>Ubah Tujuan ODP</label>
                  <select
                    value={editForm.new_odp_id}
                    onChange={(e) => setEditForm({ ...editForm, new_odp_id: e.target.value })}
                  >
                    <option value="">-- Tidak berubah --</option>
                    {editOdps.map(odp => (
                      <option key={odp.id} value={odp.id}>{odp.name}</option>
                    ))}
                  </select>
                  {editOdps.length === 0 && (
                    <small className="text-warning">Tidak ada ODP lain yang terhubung</small>
                  )}
                </div>
              )}

              <div className="connect-modal-actions">
                <button className="btn btn-primary" onClick={handleEdit}>
                  <Pencil size={14} /> Simpan Perubahan
                </button>
                <button className="btn btn-secondary" onClick={() => setShowEditModal(null)}>
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="connect-modal-overlay" onClick={() => setShowConnectModal(null)}>
          <div className="connect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="connect-modal-header">
              <h4>
                <Plug size={16} />
                Hubungkan ke Port {showConnectModal.port_number}
              </h4>
              <button className="btn-close" onClick={() => setShowConnectModal(null)}>×</button>
            </div>

            <div className="connect-modal-body">
              <div className="connection-type-selector">
                <button
                  className={`type-btn ${connectType === 'pigtail' ? 'active' : ''}`}
                  onClick={() => setConnectType('pigtail')}
                >
                  <Network size={14} /> Pigtail
                </button>
                <button
                  className={`type-btn ${connectType === 'splitter_input' ? 'active' : ''}`}
                  onClick={() => setConnectType('splitter_input')}
                >
                  <ArrowRight size={14} /> INPUT Splitter
                </button>
                <button
                  className={`type-btn ${connectType === 'splitter_output' ? 'active' : ''}`}
                  onClick={() => setConnectType('splitter_output')}
                >
                  <ArrowRight size={14} /> OUTPUT Splitter → ODP
                </button>
              </div>

              {connectType === 'pigtail' ? (
                <div className="form-group">
                  <label>Pilih Pigtail (dari Splice Tray)</label>
                  <select
                    value={connectForm.pigtail_id}
                    onChange={(e) => setConnectForm({ ...connectForm, pigtail_id: e.target.value })}
                  >
                    <option value="">-- Pilih Pigtail --</option>
                    {pigtails
                      .filter(p => splices.some(s => s.pigtail_id === p.id)) // Hanya pigtail yang sudah di-splice
                      .filter(p => !odcPortConnections?.connections?.some(c => c.pigtail_id === p.id && c.connection_type === 'pigtail')) // Hanya yang belum terhubung
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.color} {p.port_number ? `(Port ${p.port_number})` : ''}
                        </option>
                      ))
                    }
                  </select>
                  {pigtails.filter(p => splices.some(s => s.pigtail_id === p.id)).filter(p => !odcPortConnections?.connections?.some(c => c.pigtail_id === p.id && c.connection_type === 'pigtail')).length === 0 && (
                    <small className="text-warning">Semua pigtail sudah terhubung atau belum di-splice</small>
                  )}
                </div>
              ) : connectType === 'splitter_input' ? (
                <div className="form-group">
                  <label>Pilih Splitter (INPUT)</label>
                  <select
                    value={connectForm.splitter_id}
                    onChange={(e) => handleSplitterSelect(e.target.value)}
                  >
                    <option value="">-- Pilih Splitter --</option>
                    {availableSplitters.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.ratio})
                      </option>
                    ))}
                  </select>
                  {availableSplitters.length === 0 && (
                    <small className="text-warning">Semua splitter sudah memiliki INPUT</small>
                  )}
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Pilih Splitter</label>
                    <select
                      value={connectForm.splitter_id}
                      onChange={(e) => handleSplitterSelect(e.target.value)}
                    >
                      <option value="">-- Pilih Splitter --</option>
                      {splitters.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.ratio})
                        </option>
                      ))}
                    </select>
                  </div>

                  {connectForm.splitter_id && (
                    <div className="form-group">
                      <label>Pilih Output Port</label>
                      <select
                        value={connectForm.splitter_port_id}
                        onChange={(e) => setConnectForm({ ...connectForm, splitter_port_id: e.target.value })}
                      >
                        <option value="">-- Pilih Port Output --</option>
                        {availableSplitterPorts
                          .filter(sp => sp.splitter_id === parseInt(connectForm.splitter_id))
                          .map(sp => (
                            <option key={sp.id} value={sp.id}>
                              Port {sp.port_number} {sp.destination ? `- ${sp.destination.name}` : '(Kosong)'}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <div className="form-group-header">
                      <label>Tujuan ODP</label>
                      <button
                        type="button"
                        className={`btn-toggle ${showCreateOdp ? 'active' : ''}`}
                        onClick={() => {
                          setShowCreateOdp(!showCreateOdp);
                          setConnectForm({ ...connectForm, create_odp: !showCreateOdp, odp_id: '' });
                        }}
                      >
                        {showCreateOdp ? 'Pilih Existing' : '+ Buat ODP Baru'}
                      </button>
                    </div>

                    {showCreateOdp ? (
                      <div className="create-odp-form">
                        <input
                          type="text"
                          placeholder="Nama ODP (misal: ODP-05)"
                          value={connectForm.new_odp_name}
                          onChange={(e) => setConnectForm({ ...connectForm, new_odp_name: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Alamat (opsional)"
                          value={connectForm.new_odp_address}
                          onChange={(e) => setConnectForm({ ...connectForm, new_odp_address: e.target.value })}
                        />
                        <div className="coord-row">
                          <input
                            type="text"
                            placeholder="Latitude"
                            value={connectForm.new_odp_latitude}
                            onChange={(e) => setConnectForm({ ...connectForm, new_odp_latitude: e.target.value })}
                          />
                          <input
                            type="text"
                            placeholder="Longitude"
                            value={connectForm.new_odp_longitude}
                            onChange={(e) => setConnectForm({ ...connectForm, new_odp_longitude: e.target.value })}
                          />
                        </div>
                      </div>
                    ) : (
                      <select
                        value={connectForm.odp_id}
                        onChange={(e) => setConnectForm({ ...connectForm, odp_id: e.target.value })}
                      >
                        <option value="">-- Pilih ODP --</option>
                        {availableOdps.map(odp => (
                          <option key={odp.id} value={odp.id}>{odp.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              )}

              <div className="connect-modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleConnect}
                  disabled={
                    connectType === 'pigtail' ? !connectForm.pigtail_id :
                    connectType === 'splitter_input' ? !connectForm.splitter_id :
                    (!connectForm.splitter_port_id || (!connectForm.odp_id && !connectForm.create_odp))
                  }
                >
                  <Plug size={14} /> Hubungkan
                </button>
                <button className="btn btn-secondary" onClick={() => setShowConnectModal(null)}>
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Distribution Tab
const DistributionTab = ({ splitters, cables, odcPortConnections, infrastructureId, infrastructureName, onRefresh, loadAllData }) => {
  // This tab shows the overview of all splitter allocations
  const getAllocations = () => {
    const allocations = [];
    splitters.forEach(splitter => {
      splitter.ports?.forEach(port => {
        if (port.destination_infrastructure_id) {
          allocations.push({
            splitter: splitter.name,
            splitterRatio: splitter.ratio,
            portNumber: port.port_number,
            cableName: `${infrastructureName}-P${port.port_number}`,
            destination: port.destination?.name || 'ODP',
            odpId: port.destination_infrastructure_id,
          });
        }
      });
    });
    return allocations;
  };

  const allocations = getAllocations();

  return (
    <div className="distribution-tab">
      <div className="info-banner">
        <strong>Distribusi:</strong> Overview alokasi splitter port ke ODP. Kabel dibuat otomatis saat menghubungkan di Port ODC.
      </div>

      <div className="section">
        <h3><Cable size={16} /> Alokasi Distribusi ({allocations.length})</h3>

        <div className="allocations-list">
          {allocations.length === 0 ? (
            <p className="empty-text">
              Belum ada alokasi. Buka tab Port ODC untuk menghubungkan splitter output ke ODP.
            </p>
          ) : (
            allocations.map((alloc, idx) => (
              <div key={idx} className="allocation-card">
                <div className="allocation-header">
                  <div className="allocation-splitter">
                    <Network size={14} />
                    <strong>{alloc.splitter}</strong>
                    <span className="ratio-badge">{alloc.splitterRatio}</span>
                  </div>
                  <ArrowRight size={14} />
                  <div className="allocation-odp">
                    <Box size={14} />
                    <strong>{alloc.destination}</strong>
                  </div>
                </div>
                <div className="allocation-details">
                  <span className="port-info">
                    Port {alloc.portNumber}
                  </span>
                  <span className="cable-name">
                    <Cable size={12} /> {alloc.cableName}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section">
        <h3><Network size={16} /> Status Splitters</h3>
        <div className="splitters-status">
          {splitters.map(splitter => {
            const totalPorts = splitter.port_count;
            const usedPorts = splitter.used_ports_count || 0;
            const availablePorts = totalPorts - usedPorts;

            return (
              <div key={splitter.id} className="splitter-status-card">
                <div className="splitter-status-header">
                  <strong>{splitter.name}</strong>
                  <span className="ratio-badge">{splitter.ratio}</span>
                </div>
                <div className="splitter-status-bar">
                  <div
                    className="used-bar"
                    style={{ width: `${(usedPorts / totalPorts) * 100}%` }}
                  />
                </div>
                <div className="splitter-status-info">
                  <span className="used">{usedPorts} terpakai</span>
                  <span className="available">{availablePorts} tersedia</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper function
const getPigtailColor = (colorName) => {
  const colors = {
    'Blue': '#0077BE',
    'Orange': '#FFA500',
    'Green': '#008A00',
    'Brown': '#8B4513',
    'Slate': '#708090',
    'White': '#F5F5F5',
    'Red': '#FF0000',
    'Black': '#000000',
    'Yellow': '#FFFF00',
    'Violet': '#EE82EE',
    'Rose': '#FF007F',
    'Aqua': '#00FFFF',
  };
  return colors[colorName] || '#999';
};

export default OdcManager;
