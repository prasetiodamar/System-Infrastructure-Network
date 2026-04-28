import React, { useState, useEffect } from 'react';
import {
  portService,
  cableService,
  infrastructureService,
  splitterService,
  splitterPortService,
} from '../services/services';
import {
  Plus, X, Trash2, Network, Cable, Box, Link, ChevronRight, User, ArrowRight
} from 'lucide-react';
import './OdpManager.css';

const OdpManager = ({ infrastructure, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [splitters, setSplitters] = useState([]);
  const [cables, setCables] = useState([]);
  const [odcs, setOdcs] = useState([]);
  const [splitterConnections, setSplitterConnections] = useState([]);

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

      // Load splitters for this ODP and all cables and infrastructure
      const [splittersRes, cablesRes, infraRes] = await Promise.all([
        splitterService.getByInfrastructure(infrastructure.id),
        cableService.getAll(),
        infrastructureService.getAll(),
      ]);

      // Get ODCs
      const odcList = infraRes.data.filter(i =>
        i.type?.name?.toLowerCase().includes('odc')
      );

      // For each ODC, get splitter ports that connect to this ODP
      const connectionsPromises = odcList.map(async (odc) => {
        try {
          const odcSplittersRes = await splitterService.getByInfrastructure(odc.id);
          const odcSplitters = odcSplittersRes.data;

          // Find splitter ports that connect to this ODP
          const connectedPorts = [];
          for (const splitter of odcSplitters) {
            if (splitter.ports) {
              const portsConnectedToThisOdp = splitter.ports.filter(
                p => p.destination_infrastructure_id === infrastructure.id
              );
              if (portsConnectedToThisOdp.length > 0) {
                connectedPorts.push({
                  splitter,
                  ports: portsConnectedToThisOdp
                });
              }
            }
          }

          return {
            odc,
            connections: connectedPorts
          };
        } catch (e) {
          console.error('Error loading splitter for ODC:', odc.id, e);
          return { odc, connections: [] };
        }
      });

      const connectionsResults = await Promise.all(connectionsPromises);

      setSplitters(splittersRes.data);
      setCables(cablesRes.data);
      setOdcs(odcList);
      setSplitterConnections(connectionsResults);
    } catch (error) {
      console.error('Error loading ODP data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const getStats = () => {
    let totalPorts = 0;
    let usedPorts = 0;
    splitters.forEach(s => {
      totalPorts += s.port_count || 0;
      usedPorts += s.used_ports_count || 0;
    });
    return {
      splitters: splitters.length,
      totalPorts,
      availablePorts: totalPorts - usedPorts,
      usedPorts,
      connectedFromOdc: splitterConnections.reduce((sum, item) => {
        return sum + item.connections.reduce((s, c) => s + c.ports.length, 0);
      }, 0),
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="odp-manager">
        <div className="odp-loading">Memuat Manajemen ODP...</div>
      </div>
    );
  }

  return (
    <div className="odp-manager">
      <div className="odp-header">
        <div>
          <h2>{infrastructure.name}</h2>
          <p>Optical Distribution Point - Titik Distribusi ke Pelanggan</p>
        </div>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      {/* Tab Navigation */}
      <div className="odp-tabs">
        <button
          className={`odp-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`odp-tab ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <Cable size={14} /> Koneksi dari ODC
        </button>
        <button
          className={`odp-tab ${activeTab === 'splitters' ? 'active' : ''}`}
          onClick={() => setActiveTab('splitters')}
        >
          <Network size={14} /> Splitters
        </button>
      </div>

      {/* Tab Content */}
      <div className="odp-content">
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} infrastructure={infrastructure} />
        )}

        {activeTab === 'connections' && (
          <ConnectionsTab
            cables={cables}
            infrastructure={infrastructure}
            splitterConnections={splitterConnections}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'splitters' && (
          <SplittersTab
            splitters={splitters}
            cables={cables}
            ratios={ratios}
            infrastructureId={infrastructure.id}
            infrastructureName={infrastructure.name}
            onRefresh={loadAllData}
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
      <h3>Alur Sinyal ODP</h3>
      <div className="flow-steps">
        <div className="flow-step">
          <div className="flow-icon odc">ODC</div>
          <div className="flow-info">
            <strong>ODC</strong>
            <span>Feeder → Splitter</span>
          </div>
        </div>
        <ChevronRight className="flow-arrow" />
        <div className="flow-step">
          <div className="flow-icon distribution">D</div>
          <div className="flow-info">
            <strong>Distribution Cable</strong>
            <span>12C / 24C</span>
          </div>
        </div>
        <ChevronRight className="flow-arrow" />
        <div className="flow-step">
          <div className="flow-icon odp">ODP</div>
          <div className="flow-info">
            <strong>ODP</strong>
            <span>Splitter → Port</span>
          </div>
        </div>
        <ChevronRight className="flow-arrow" />
        <div className="flow-step">
          <div className="flow-icon customer">C</div>
          <div className="flow-info">
            <strong>Pelanggan</strong>
            <span>ONT / Rumah</span>
          </div>
        </div>
      </div>
    </div>

    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon ports">
          <Network size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.splitters}</span>
          <span className="stat-label">Splitters</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon ports">
          <Box size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.totalPorts}</span>
          <span className="stat-label">Total Port</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon available">
          <Box size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.availablePorts}</span>
          <span className="stat-label">Tersedia</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon allocated">
          <User size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{stats.usedPorts}</span>
          <span className="stat-label">Terpakai</span>
        </div>
      </div>
    </div>

    {/* Petunjuk Alur */}
    <div className="info-banner" style={{ marginTop: '20px' }}>
      <strong>Petunjuk Alur:</strong><br/>
      1. <strong>Koneksi dari ODC</strong> - Lihat kabel yang masuk dari ODC<br/>
      2. <strong>Splitters</strong> - Tambahkan splitter dan hubungkan port ke pelanggan
    </div>
  </div>
);

// Connections Tab - Show connection from ODC
const ConnectionsTab = ({ cables, infrastructure, splitterConnections, onRefresh }) => {
  // Get cables connected to this ODP
  const connectedCables = cables.filter(c =>
    c.from_infrastructure_id === infrastructure.id ||
    c.to_infrastructure_id === infrastructure.id
  );

  const totalConnected = splitterConnections.reduce((sum, item) => {
    return sum + item.connections.reduce((s, c) => s + c.ports.length, 0);
  }, 0);

  return (
    <div className="connections-tab">
      <div className="info-banner">
        <strong>Alur Koneksi:</strong><br/>
        ODC (Splitter OUTPUT) → Kabel Distribusi → ODP → Splitter ODP → Pelanggan
      </div>

      {/* ODC Connections */}
      <div className="section">
        <h3><Cable size={16} /> Koneksi dari ODC ({totalConnected} port terhubung)</h3>

        {splitterConnections.map((item) => (
          item.connections.length > 0 && (
            <div key={item.odc.id} className="odc-connection-card">
              <div className="odc-header">
                <div className="odc-icon">
                  <Network size={20} />
                </div>
                <div className="odc-info">
                  <strong>{item.odc.name}</strong>
                  <span>ODC</span>
                </div>
                <div className="odc-ports-count">
                  {item.connections.reduce((sum, c) => sum + c.ports.length, 0)} port(s)
                </div>
              </div>

              <div className="odc-connections-list">
                {item.connections.map((conn) => (
                  <div key={conn.splitter.id} className="splitter-connection">
                    <div className="splitter-label">
                      <strong>{conn.splitter.name}</strong>
                      <span className="ratio-badge">{conn.splitter.ratio}</span>
                    </div>

                    <div className="port-mappings">
                      {conn.ports.map(port => {
                        const cable = cables.find(c => c.id === port.cable_id);
                        return (
                          <div key={port.id} className="port-mapping">
                            <span className="splitter-port">ODC SP-{port.port_number}</span>
                            <ArrowRight size={12} className="arrow" />
                            {cable ? (
                              <>
                                <span className="cable-name">{cable.name}</span>
                                <span className="core-badge">Core {port.core_number}</span>
                              </>
                            ) : (
                              <span className="no-cable">Belum terhubung</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}

        {totalConnected === 0 && (
          <p className="empty-text">
            Belum ada koneksi dari ODC. Sambungkan splitter port di ODC ke kabel distribusi terlebih dahulu.
          </p>
        )}
      </div>

      {/* Cable List */}
      <div className="section">
        <h3><Box size={16} /> Kabel Terhubung ({connectedCables.length})</h3>

        <div className="connections-list">
          {connectedCables.length === 0 ? (
            <p className="empty-text">Belum ada kabel yang terhubung ke ODP ini.</p>
          ) : (
            connectedCables.map(cable => {
              const isIncoming = cable.to_infrastructure_id === infrastructure.id;
              return (
                <div key={cable.id} className="connection-card">
                  <div className="connection-icon">
                    <Cable size={20} />
                  </div>
                  <div className="connection-info">
                    <strong>{cable.name}</strong>
                    <span>{cable.core_count}C</span>
                    <span className={`direction-badge ${isIncoming ? 'incoming' : 'outgoing'}`}>
                      {isIncoming ? '← Masuk' : '→ Keluar'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// Splitters Tab - Manage splitters at ODP level
const SplittersTab = ({ splitters, cables, ratios, infrastructureId, infrastructureName, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedPort, setSelectedPort] = useState(null);
  const [selectedSplitter, setSelectedSplitter] = useState(null);
  const [availableClients, setAvailableClients] = useState([]);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [form, setForm] = useState({ name: '', ratio: '1:8', notes: '' });
  const [connectForm, setConnectForm] = useState({
    client_id: '',
    create_client: false,
    // New client fields
    new_client_name: '',
    new_client_phone: '',
    new_client_email: '',
    new_client_address: '',
    new_client_package: '',
    new_client_monthly_fee: '',
  });

  useEffect(() => {
    loadAvailableClients();
  }, []);

  const loadAvailableClients = async () => {
    try {
      const res = await splitterService.getAvailableClients();
      setAvailableClients(res.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // Get cables connected to this ODP
  const connectedCables = cables.filter(c =>
    c.from_infrastructure_id === infrastructureId ||
    c.to_infrastructure_id === infrastructureId
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await splitterService.create({
        ...form,
        infrastructure_id: infrastructureId,
      });
      setShowForm(false);
      setForm({ name: '', ratio: '1:8', notes: '' });
      onRefresh();
    } catch (error) {
      alert('Gagal menambah splitter: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus splitter ini?')) return;
    try {
      await splitterService.delete(id);
      onRefresh();
    } catch (error) {
      alert('Gagal menghapus: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleOpenAllocate = (port, splitter) => {
    setSelectedPort(port);
    setSelectedSplitter(splitter);
    setConnectForm({
      client_id: port.destination_client_id?.toString() || '',
      create_client: false,
      new_client_name: '',
      new_client_phone: '',
      new_client_email: '',
      new_client_address: '',
      new_client_package: '',
      new_client_monthly_fee: '',
    });
    setShowCreateClient(false);
  };

  const handleToggleCreateClient = () => {
    setShowCreateClient(!showCreateClient);
    if (!showCreateClient) {
      setConnectForm({
        ...connectForm,
        client_id: '',
        create_client: true,
      });
    } else {
      setConnectForm({
        ...connectForm,
        create_client: false,
      });
    }
  };

  const handleAllocate = async () => {
    if (!selectedSplitter) return;

    let data;

    try {
      if (connectForm.create_client) {
        if (!connectForm.new_client_name) {
          alert('Nama pelanggan harus diisi');
          return;
        }
        data = {
          create_client: {
            name: connectForm.new_client_name,
            phone: connectForm.new_client_phone || null,
            email: connectForm.new_client_email || null,
            address: connectForm.new_client_address || null,
            package_type: connectForm.new_client_package || null,
            monthly_fee: connectForm.new_client_monthly_fee || null,
          },
        };
      } else {
        // Use existing client
        if (!connectForm.client_id) {
          alert('Pilih pelanggan');
          return;
        }
        data = {
          client_id: parseInt(connectForm.client_id),
        };
      }

      const result = await splitterService.allocatePortToClient(selectedSplitter.id, selectedPort.id, data);

      setSelectedPort(null);
      setSelectedSplitter(null);
      onRefresh();
      loadAvailableClients();
      alert(result.data.message || 'Alokasi berhasil!');
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData?.warning) {
        // Conflict
        const confirmMsg = `${errorData.error}\n\nPelanggan sudah dialokasikan ke port lain: ${errorData.conflicting_port?.splitter_name} Port ${errorData.conflicting_port?.port_number}\n\nApakah Anda ingin memutus koneksi lama dan mengalokasikan ke yang baru?`;
        if (window.confirm(confirmMsg)) {
          try {
            await splitterService.disconnectPort(
              errorData.conflicting_port?.id ? selectedSplitter.id : selectedSplitter.id,
              errorData.conflicting_port?.id,
              true
            );
            // Retry allocation
            await handleAllocateRetry(data);
          } catch (retryError) {
            alert('Gagal: ' + (retryError.response?.data?.error || retryError.message));
          }
        }
      } else {
        alert('Gagal mengalokasikan: ' + (errorData?.error || error.message));
      }
    }
  };

  const handleAllocateRetry = async (data) => {
    try {
      await splitterService.allocatePortToClient(selectedSplitter.id, selectedPort.id, data);
      setSelectedPort(null);
      setSelectedSplitter(null);
      onRefresh();
      loadAvailableClients();
    } catch (error) {
      alert('Gagal: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDisconnect = async (splitterId, portId) => {
    if (!window.confirm('Putus sambungan port ini?')) return;

    try {
      await splitterService.disconnectPort(splitterId, portId, true);
      onRefresh();
      loadAvailableClients();
    } catch (error) {
      alert('Gagal memutus: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="splitters-tab">
      <div className="info-banner">
        <strong>Alur di ODP:</strong><br/>
        Kabel Distribusi (dari ODC) → Splice Tray → Pigtail → INPUT Splitter ODP → OUTPUT Ports → Pelanggan
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
            <p className="empty-text">
              Belum ada splitter. Tambahkan splitter untuk mulai menghubungkan ke pelanggan.
            </p>
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

                <div className="splitter-ports">
                  {splitter.ports?.map(port => {
                    const isAllocated = port.destination_client_id;
                    return (
                      <div
                        key={port.id}
                        className={`splitter-port ${isAllocated ? 'allocated' : 'available'}`}
                        onClick={() => handleOpenAllocate(port, splitter)}
                      >
                        <span>P{port.port_number}</span>
                        {isAllocated ? (
                          <small className="client-name">{port.client_name || 'Pelanggan'}</small>
                        ) : (
                          <small className="available-text">Kosong</small>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Port Allocation Modal */}
      {selectedPort && selectedSplitter && (
        <div className="port-modal-overlay" onClick={() => setSelectedPort(null)}>
          <div className="port-modal" onClick={(e) => e.stopPropagation()}>
            <div className="port-modal-header">
              <h4>👤 Alokasi Port {selectedPort.port_number} ke Pelanggan</h4>
              <button className="btn-close" onClick={() => setSelectedPort(null)}>×</button>
            </div>

            <div className="port-modal-body">
              {selectedPort.destination_client_id && (
                <div className="current-allocation">
                  <span className="label">Saat ini:</span>
                  <span className="value">
                    {selectedPort.client_name || 'Pelanggan'}
                    {selectedPort.client_area && ` - ${selectedPort.client_area}`}
                  </span>
                </div>
              )}

              <div className="form-group">
                <div className="form-group-header">
                  <label>Pilih Pelanggan</label>
                  <button
                    type="button"
                    className={`btn-toggle ${showCreateClient ? 'active' : ''}`}
                    onClick={handleToggleCreateClient}
                  >
                    {showCreateClient ? 'Pilih Pelanggan Existing' : '+ Buat Pelanggan Baru'}
                  </button>
                </div>

                {showCreateClient ? (
                  <div className="create-client-form">
                    <input
                      type="text"
                      placeholder="Nama Pelanggan *"
                      value={connectForm.new_client_name}
                      onChange={(e) => setConnectForm({ ...connectForm, new_client_name: e.target.value })}
                    />
                    <div className="form-row-2">
                      <input
                        type="text"
                        placeholder="Telepon"
                        value={connectForm.new_client_phone}
                        onChange={(e) => setConnectForm({ ...connectForm, new_client_phone: e.target.value })}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={connectForm.new_client_email}
                        onChange={(e) => setConnectForm({ ...connectForm, new_client_email: e.target.value })}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Alamat"
                      value={connectForm.new_client_address}
                      onChange={(e) => setConnectForm({ ...connectForm, new_client_address: e.target.value })}
                    />
                    <div className="form-row-2">
                      <input
                        type="text"
                        placeholder="Paket (misal: 10Mbps)"
                        value={connectForm.new_client_package}
                        onChange={(e) => setConnectForm({ ...connectForm, new_client_package: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Biaya Bulanan"
                        value={connectForm.new_client_monthly_fee}
                        onChange={(e) => setConnectForm({ ...connectForm, new_client_monthly_fee: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <select
                    value={connectForm.client_id}
                    onChange={(e) => setConnectForm({ ...connectForm, client_id: e.target.value })}
                  >
                    <option value="">-- Pilih Pelanggan --</option>
                    {availableClients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.address ? `(${client.address.substring(0, 30)}...)` : ''}
                      </option>
                    ))}
                    {availableClients.length === 0 && (
                      <option value="" disabled>Tidak ada pelanggan tersedia. Buat pelanggan baru.</option>
                    )}
                  </select>
                )}
              </div>

              <div className="port-modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleAllocate}
                  disabled={connectForm.create_client ? !connectForm.new_client_name : !connectForm.client_id}
                >
                  <User size={14} /> Alokasikan
                </button>
                {selectedPort.destination_client_id && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDisconnect(selectedSplitter.id, selectedPort.id)}
                  >
                    ❌ Putus
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setSelectedPort(null)}>
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

export default OdpManager;
