import api from './api';

export const authService = {
  login: (email, password) =>
    api.post('/login', { email, password }),
  
  logout: () =>
    api.post('/logout'),
  
  me: () =>
    api.get('/me'),
  
  register: (userData) =>
    api.post('/register', userData),
};

export const infrastructureService = {
  getAll: () =>
    api.get('/infrastructures'),

  getAllForMap: () =>
    api.get('/infrastructures/map/all'),

  getBySite: (siteId) =>
    api.get(`/infrastructures/site/${siteId}`),

  getHierarchy: (siteId = null) =>
    api.get(`/infrastructures/hierarchy/${siteId || ''}`),

  getPopsWithChildren: () =>
    api.get('/infrastructures/pops-with-children'),

  create: (data) =>
    api.post('/infrastructures', data),

  update: (id, data) =>
    api.put(`/infrastructures/${id}`, data),

  delete: (id) =>
    api.delete(`/infrastructures/${id}`),

  uploadImage: (id, formData) =>
    api.post(`/infrastructures/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteImage: (id, index = null) =>
    api.delete(`/infrastructures/${id}/image`, {
      params: index !== null ? { index } : {}
    }),

  downloadImage: (id, index = 0) =>
    api.get(`/infrastructures/${id}/image/download`, {
      params: { index },
      responseType: 'blob',
    }),

  getImages: (id) =>
    api.get(`/infrastructures/${id}/images`),
};

export const connectionService = {
  getAll: () =>
    api.get('/connections'),
  
  create: (data) =>
    api.post('/connections', data),
  
  update: (id, data) =>
    api.put(`/connections/${id}`, data),
  
  delete: (id) =>
    api.delete(`/connections/${id}`),
};

export const infrastructureTypeService = {
  getAll: () =>
    api.get('/infrastructure-types'),

  create: (data) =>
    api.post('/infrastructure-types', data),

  update: (id, data) =>
    api.put(`/infrastructure-types/${id}`, data),

  delete: (id) =>
    api.delete(`/infrastructure-types/${id}`),
};

export const odcTypeService = {
  getAll: () =>
    api.get('/odc-types'),

  getById: (typeId) =>
    api.get(`/odc-types/${typeId}`),

  create: (data) =>
    api.post('/odc-types', data),

  update: (typeId, data) =>
    api.put(`/odc-types/${typeId}`, data),

  delete: (typeId) =>
    api.delete(`/odc-types/${typeId}`),
};

export const odpTypeService = {
  getAll: () =>
    api.get('/odp-types'),

  getById: (typeId) =>
    api.get(`/odp-types/${typeId}`),

  create: (data) =>
    api.post('/odp-types', data),

  update: (typeId, data) =>
    api.put(`/odp-types/${typeId}`, data),

  delete: (typeId) =>
    api.delete(`/odp-types/${typeId}`),
};

export const splitterService = {
  getAll: (params = {}) =>
    api.get('/splitters', { params }),

  getByInfrastructure: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/splitters`),

  getById: (splitterId) =>
    api.get(`/splitters/${splitterId}`),

  create: (data) =>
    api.post('/splitters', data),

  update: (splitterId, data) =>
    api.put(`/splitters/${splitterId}`, data),

  delete: (splitterId) =>
    api.delete(`/splitters/${splitterId}`),

  getRatios: () =>
    api.get('/splitters/ratios'),

  // Port allocation - ODC to ODP
  getAvailableOdps: (params = {}) =>
    api.get('/splitters/available-odps', { params }),

  createOdp: (data) =>
    api.post('/splitters/odp', data),

  allocatePortToOdp: (splitterId, portId, data) =>
    api.post(`/splitters/${splitterId}/ports/${portId}/allocate-odp`, data),

  // Port allocation - ODP to Client
  getAvailableClients: (params = {}) =>
    api.get('/splitters/available-clients', { params }),

  createClient: (data) =>
    api.post('/splitters/client', data),

  allocatePortToClient: (splitterId, portId, data) =>
    api.post(`/splitters/${splitterId}/ports/${portId}/allocate-client`, data),

  // Port disconnect
  disconnectPort: (splitterId, portId, force = false) =>
    api.post(`/splitters/${splitterId}/ports/${portId}/disconnect`, { force }),

  makePortAvailable: (splitterId, portId) =>
    api.post(`/splitters/${splitterId}/ports/${portId}/make-available`),
};

export const splitterPortService = {
  getBySplitter: (splitterId) =>
    api.get(`/splitters/${splitterId}/ports`),

  getStatistics: (splitterId) =>
    api.get(`/splitters/${splitterId}/ports/statistics`),

  update: (portId, data) =>
    api.put(`/splitter-ports/${portId}`, data),

  connect: (portId, data) =>
    api.post(`/splitter-ports/${portId}/connect`, data),

  disconnect: (portId) =>
    api.post(`/splitter-ports/${portId}/disconnect`),

  bulkUpdate: (ports) =>
    api.post('/splitter-ports/bulk-update', { ports }),
};

export const odcPortConnectionService = {
  // Get all port connections for an ODC
  getConnections: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/odc-port-connections`),

  // Connect splitter input to port
  connectSplitterInput: (infrastructureId, data) =>
    api.post(`/infrastructures/${infrastructureId}/odc-port-connections/splitter-input`, data),

  // Connect splitter output to port (creates cable to ODP)
  connectSplitterOutput: (infrastructureId, data) =>
    api.post(`/infrastructures/${infrastructureId}/odc-port-connections/splitter-output`, data),

  // Connect pigtail to port
  connectPigtail: (infrastructureId, data) =>
    api.post(`/infrastructures/${infrastructureId}/odc-port-connections/pigtail`, data),

  // Disconnect
  disconnect: (connectionId) =>
    api.delete(`/odc-port-connections/${connectionId}`),

  // Get available splitters (without input connected)
  getAvailableSplitters: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/odc-port-connections/available-splitters`),

  // Get available splitter ports (without output connected)
  getAvailableSplitterPorts: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/odc-port-connections/available-splitter-ports`),

  // Get available ODPs (only unconnected)
  getAvailableOdps: () =>
    api.get('/odc-port-connections/available-odps'),

  // Get ODPs connected via cable to this ODC
  getConnectedOdps: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/connected-odps`),

  // Update a connection (notes, destination ODP)
  update: (connectionId, data) =>
    api.put(`/odc-port-connections/${connectionId}`, data),
};

export const userService = {
  getAll: () =>
    api.get('/users'),
  
  create: (data) =>
    api.post('/users', data),
  
  update: (id, data) =>
    api.put(`/users/${id}`, data),
  
  delete: (id) =>
    api.delete(`/users/${id}`),
};

export const kmlImportService = {
  parseKml: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Don't set Content-Type header - axios will do it automatically with FormData
    return api.post('/kml/parse', formData);
  },

  importLines: (importData) =>
    api.post('/kml/import', importData)
};

export const portService = {
  getByInfrastructure: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/ports`),

  getSummary: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/ports/summary`),

  create: (infrastructureId, data) =>
    api.post(`/infrastructures/${infrastructureId}/ports`, data),

  update: (portId, data) =>
    api.put(`/ports/${portId}`, data),

  delete: (portId) =>
    api.delete(`/ports/${portId}`),

  bulkUpdate: (infrastructureId, ports) =>
    api.post(`/infrastructures/${infrastructureId}/ports/bulk`, { ports }),

  connectPort: (portId, data) =>
    api.post(`/ports/${portId}/connect`, data),

  disconnectPort: (portId) =>
    api.post(`/ports/${portId}/disconnect`),
};

export const rackService = {
  getAll: () =>
    api.get('/racks'),

  getById: (rackId) =>
    api.get(`/racks/${rackId}`),

  getAvailablePositions: (rackId) =>
    api.get(`/racks/${rackId}/available-positions`),

  validatePosition: (rackId, data) =>
    api.post(`/racks/${rackId}/validate-position`, data),
};

export const cableService = {
  getAll: () =>
    api.get('/cables'),

  getById: (cableId) =>
    api.get(`/cables/${cableId}`),

  create: (data) =>
    api.post('/cables', data),

  update: (cableId, data) =>
    api.put(`/cables/${cableId}`, data),

  delete: (cableId) =>
    api.delete(`/cables/${cableId}`),

  getCores: (cableId) =>
    api.get(`/cables/${cableId}/cores`),

  getCoreSummary: (cableId) =>
    api.get(`/cables/${cableId}/cores/summary`),
};

export const coreService = {
  update: (coreId, data) =>
    api.put(`/cores/${coreId}`, data),

  bulkUpdate: (cableId, cores) =>
    api.post(`/cables/${cableId}/cores/bulk`, { cores }),
};

export const cableTypeService = {
  getAll: () =>
    api.get('/cable-types'),

  getById: (typeId) =>
    api.get(`/cable-types/${typeId}`),

  create: (data) =>
    api.post('/cable-types', data),

  update: (typeId, data) =>
    api.put(`/cable-types/${typeId}`, data),

  delete: (typeId) =>
    api.delete(`/cable-types/${typeId}`),
};

export const spliceService = {
  getAll: () =>
    api.get('/splices'),

  getByJointBox: (jointBoxId) =>
    api.get(`/infrastructures/${jointBoxId}/splices`),

  getById: (spliceId) =>
    api.get(`/splices/${spliceId}`),

  create: (data) =>
    api.post('/splices', data),

  update: (spliceId, data) =>
    api.put(`/splices/${spliceId}`, data),

  delete: (spliceId) =>
    api.delete(`/splices/${spliceId}`),

  traceClient: (cableId, coreNumber) =>
    api.post('/splices/trace-client', { cable_id: cableId, core_number: coreNumber }),

  uploadImage: (spliceId, formData) =>
    api.post(`/splices/${spliceId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteImage: (spliceId) =>
    api.delete(`/splices/${spliceId}/image`),
};

export const siteService = {
  getAll: () =>
    api.get('/sites'),

  getForMap: () =>
    api.get('/sites/map'),

  getById: (siteId) =>
    api.get(`/sites/${siteId}`),

  getTree: (siteId) =>
    api.get(`/sites/tree/${siteId}`),

  getStatistics: () =>
    api.get('/sites/statistics'),

  create: (data) =>
    api.post('/sites', data),

  update: (siteId, data) =>
    api.put(`/sites/${siteId}`, data),

  delete: (siteId) =>
    api.delete(`/sites/${siteId}`),

  recalculateRadius: (siteId) =>
    api.post(`/sites/${siteId}/recalculate-radius`),
};

export const spliceTrayService = {
  getByInfrastructure: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/splice-trays`),

  create: (infrastructureId, data) =>
    api.post(`/infrastructures/${infrastructureId}/splice-trays`, data),

  update: (trayId, data) =>
    api.put(`/splice-trays/${trayId}`, data),

  delete: (trayId) =>
    api.delete(`/splice-trays/${trayId}`),
};

export const pigtailService = {
  getByInfrastructure: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/pigtails`),

  create: (infrastructureId, data) =>
    api.post(`/infrastructures/${infrastructureId}/pigtails`, data),

  update: (pigtailId, data) =>
    api.put(`/pigtails/${pigtailId}`, data),

  connectToSplitter: (pigtailId, data) =>
    api.post(`/pigtails/${pigtailId}/connect-splitter`, data),

  disconnectFromSplitter: (pigtailId) =>
    api.post(`/pigtails/${pigtailId}/disconnect-splitter`),

  delete: (pigtailId) =>
    api.delete(`/pigtails/${pigtailId}`),

  getColors: () =>
    api.get(`/pigtails/colors`),
};

export const odcSpliceService = {
  getByInfrastructure: (infrastructureId) =>
    api.get(`/infrastructures/${infrastructureId}/odc-splices`),

  create: (infrastructureId, data) =>
    api.post(`/infrastructures/${infrastructureId}/odc-splices`, data),

  update: (spliceId, data) =>
    api.put(`/odc-splices/${spliceId}`, data),

  delete: (spliceId) =>
    api.delete(`/odc-splices/${spliceId}`),
};

export const clientService = {
  getAll: (params = {}) =>
    api.get('/clients', { params }),

  getById: (clientId) =>
    api.get(`/clients/${clientId}`),

  create: (data) =>
    api.post('/clients', data),

  update: (clientId, data) =>
    api.put(`/clients/${clientId}`, data),

  delete: (clientId) =>
    api.delete(`/clients/${clientId}`),

  connect: (clientId, data) =>
    api.post(`/clients/${clientId}/connect`, data),

  disconnect: (clientId, connectionId) =>
    api.delete(`/clients/${clientId}/connections/${connectionId}`),

  getForMap: (params = {}) =>
    api.get('/clients-for-map', { params }),

  getStatistics: (params = {}) =>
    api.get('/clients/statistics', { params }),
};
