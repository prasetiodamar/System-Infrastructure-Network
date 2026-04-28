import api from './api';

export const libreNMSService = {
  // Get all devices - via backend proxy (bypass SSL issues)
  getDevices: () =>
    api.get('/librenms/devices'),

  // Get device ports - via backend proxy
  getDevicePorts: (hostname) =>
    api.get(`/librenms/devices/${hostname}/ports`),

  // Get device sensors (transceivers DDM data)
  getDeviceSensors: (hostname) =>
    api.get(`/librenms/devices/${hostname}/sensors`),

  // Get all device categories
  getCategories: () =>
    api.get('/librenms/categories'),

  // Update a single device category
  updateCategory: (deviceId, category) =>
    api.put('/librenms/categories', { device_id: deviceId, category }),

  // Bulk update categories
  bulkUpdateCategories: (categories) =>
    api.post('/librenms/categories/bulk', { categories }),

  // Delete a device category
  deleteCategory: (deviceId) =>
    api.delete(`/librenms/categories/${deviceId}`),

  // Get all device-site mappings
  getDeviceSites: () =>
    api.get('/librenms/device-sites'),

  // Update device site mapping
  updateDeviceSite: (deviceId, siteId) =>
    api.put('/librenms/device-sites', { device_id: deviceId, site_id: siteId }),
};

export default libreNMSService;
