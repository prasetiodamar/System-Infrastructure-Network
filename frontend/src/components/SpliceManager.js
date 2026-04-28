import { useState, useEffect } from 'react';
import { spliceService, cableService, portService, odcSpliceService } from '../services/services';
import './SpliceManager.css';

const SpliceManager = ({ jointBox, onClose }) => {
  const [splices, setSplices] = useState([]);
  const [cables, setCables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    cable_1_id: '',
    cable_1_core: '',
    cable_2_id: '',
    cable_2_core: '',
    splice_type: 'closure',
    splice_date: '',
    notes: '',
    client_name: '',
    client_area: '',
  });
  const [cable1Cores, setCable1Cores] = useState([]);
  const [cable2Cores, setCable2Cores] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingSplice, setEditingSplice] = useState(null);
  const [allCables, setAllCables] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedSplices, setSelectedSplices] = useState([]);
  const [traceData, setTraceData] = useState(null);
  const [tracing, setTracing] = useState(false);
  const [otbPorts, setOtbPorts] = useState([]); // For OTB port info

  // Check context type
  const isOTB = jointBox.type?.name?.toLowerCase().includes('otb');
  const isJointBox = jointBox.type?.name?.toLowerCase().includes('joint') || jointBox.type?.name?.toLowerCase().includes('box');
  const isODC = jointBox.type?.category === 'odc' || jointBox.type?.name?.toLowerCase().includes('odc');

  // Get port count for OTB (e.g., "OTB 24 Port" -> 24)
  const getOTBPortCount = () => {
    if (!isOTB) return 0;
    const match = jointBox.type?.name?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 24; // Default to 24 if not found
  };
  const otbPortCount = getOTBPortCount();

  // Generate virtual cores for OTB pigtail (1 to port count)
  const getPigtailCores = () => {
    const cores = [];
    for (let i = 1; i <= otbPortCount; i++) {
      cores.push({ core_number: i, fiber_color: getFiberColor(i), tube_color: getTubeColor(i) });
    }
    return cores;
  };

  // Helper to get fiber color
  const getFiberColor = (num) => {
    const colors = ['Blue', 'Orange', 'Green', 'Brown', 'Slate', 'White', 'Red', 'Black', 'Yellow', 'Violet', 'Rose', 'Aqua'];
    return colors[(num - 1) % 12];
  };

  // Helper to get tube color
  const getTubeColor = (num) => {
    const colors = ['Blue', 'Orange', 'Green', 'Brown', 'Slate', 'White'];
    return colors[Math.floor((num - 1) / 12) % 6];
  };

  useEffect(() => {
    loadSplices();
    loadCables();
    if (isOTB) {
      loadOtbPorts();
    }
  }, [jointBox.id]);

  // Load ports for OTB
  const loadOtbPorts = async () => {
    try {
      const response = await portService.getByInfrastructure(jointBox.id);
      console.log('OTB Ports loaded:', response.data);
      setOtbPorts(response.data);
    } catch (error) {
      console.error('Error loading OTB ports:', error);
    }
  };

  const loadSplices = async () => {
    try {
      setLoading(true);
      let response;
      if (isODC) {
        // ODC uses odc_splices table
        response = await odcSpliceService.getByInfrastructure(jointBox.id);
      } else {
        // Joint Box / Closure uses splices table
        response = await spliceService.getByJointBox(jointBox.id);
      }
      setSplices(response.data);
    } catch (error) {
      console.error('Error loading splices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCables = async () => {
    try {
      const response = await cableService.getAll();
      let relevantCables;

      if (isOTB) {
        // For OTB: filter cables that are connected to this OTB
        relevantCables = response.data.filter(cable =>
          cable.from_infrastructure_id === jointBox.id ||
          cable.to_infrastructure_id === jointBox.id
        );
      } else {
        // For Joint Box: filter cables that pass through this joint box
        relevantCables = response.data.filter(cable =>
          cable.from_infrastructure_id === jointBox.id ||
          cable.to_infrastructure_id === jointBox.id
        );
      }
      setCables(relevantCables);
      setAllCables(response.data); // Keep all cables for edit mode
    } catch (error) {
      console.error('Error loading cables:', error);
    }
  };

  // Find client info from previous splice for a given cable and core
  const findClientInfoFromPreviousSplice = (cableId, coreNumber) => {
    if (!cableId || !coreNumber) return null;

    // Find a splice where this cable+core was used as cable_2 (the output side)
    // This means it was spliced previously and has client info
    const previousSplice = splices.find(splice => {
      return splice.cable_2_id == cableId && splice.cable_2_core == coreNumber;
    });

    if (previousSplice && previousSplice.client_name) {
      return {
        client_name: previousSplice.client_name,
        client_area: previousSplice.client_area || '',
        source_otb_id: previousSplice.source_otb_id,
        source_otb_name: previousSplice.source_otb_name,
        source_port: previousSplice.source_port,
      };
    }

    // Also check if there's a splice where this cable+core was used as cable_1
    // and has source info from OTB
    const prevSpliceCable1 = splices.find(splice => {
      return splice.cable_1_id == cableId && splice.cable_1_core == coreNumber;
    });

    if (prevSpliceCable1) {
      return {
        client_name: prevSpliceCable1.client_name || '',
        client_area: prevSpliceCable1.client_area || '',
        source_otb_id: prevSpliceCable1.source_otb_id,
        source_otb_name: prevSpliceCable1.source_otb_name,
        source_port: prevSpliceCable1.source_port,
      };
    }

    return null;
  };

  // Find client info from any spliced core of a cable
  const findClientInfoFromCable = (cableId) => {
    if (!cableId) return null;

    // Find any splice where this cable was used and has client info
    const spliceWithClient = splices.find(splice => {
      const usedInCable1 = splice.cable_1_id == cableId;
      const usedInCable2 = splice.cable_2_id == cableId;
      return (usedInCable1 || usedInCable2) && splice.client_name;
    });

    if (spliceWithClient) {
      return {
        client_name: spliceWithClient.client_name,
        client_area: spliceWithClient.client_area || '',
        source_otb_id: spliceWithClient.source_otb_id,
        source_otb_name: spliceWithClient.source_otb_name,
        source_port: spliceWithClient.source_port,
      };
    }

    return null;
  };

  const handleCable1Change = async (cableId) => {
    const isJointBox = jointBox.type?.name?.toLowerCase().includes('joint') ||
                      jointBox.type?.name?.toLowerCase().includes('box');

    console.log('Cable 1 changed to:', cableId, 'isJointBox:', isJointBox);

    // For Joint Box, always clear client when cable changes
    if (isJointBox) {
      setFormData(prev => ({
        ...prev,
        cable_1_id: cableId,
        cable_1_core: '',
        client_name: '',
        client_area: '',
      }));
    } else {
      setFormData({ ...formData, cable_1_id: cableId, cable_1_core: '' });
    }

    // Load cores for the selected cable
    if (cableId) {
      try {
        const response = await cableService.getById(cableId);
        setCable1Cores(response.data.cores || []);
      } catch (error) {
        console.error('Error loading cable 1 cores:', error);
        setCable1Cores([]);
      }
    } else {
      setCable1Cores([]);
    }
  };

  // Handle OTB port selection - auto-fill client info
  const handlePortChange = async (portNumber) => {
    console.log('Port selected:', portNumber, 'Current ports:', otbPorts);

    // Find the port info first
    const port = otbPorts.find(p => p.port_number === parseInt(portNumber));
    console.log('Found port:', port);

    // Set basic data first
    let newClientName = '';
    let newClientArea = '';

    if (port) {
      if (port.status === 'allocated') {
        newClientName = port.client_name || '';
        newClientArea = port.client_area || '';
      } else {
        // Available or maintenance - set status as client_name
        newClientName = port.status;
        newClientArea = '';
      }
    }

    console.log('Setting client:', newClientName, newClientArea);

    setFormData({
      ...formData,
      cable_1_core: portNumber,
      cable_1_id: 'pigtail',
      client_name: newClientName,
      client_area: newClientArea,
    });
  };

  const handleCable2Change = async (cableId) => {
    // Don't overwrite client info - it should come from port selection only
    setFormData(prev => ({
      ...prev,
      cable_2_id: cableId,
      cable_2_core: ''
    }));

    if (cableId) {
      try {
        const response = await cableService.getById(cableId);
        setCable2Cores(response.data.cores || []);
      } catch (error) {
        console.error('Error loading cable 2 cores:', error);
        setCable2Cores([]);
      }
    } else {
      setCable2Cores([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Determine if this is an OTB (for source tracking)
      const isOTB = jointBox.type?.name?.toLowerCase().includes('otb');

      if (isODC) {
        // ODC splice: feeder cable + pigtail
        const payload = {
          splice_tray_id: parseInt(formData.splice_tray_id),
          pigtail_id: parseInt(formData.pigtail_id),
          cable_id: formData.cable_1_id ? parseInt(formData.cable_1_id) : null,
          feeder_core_number: parseInt(formData.cable_1_core),
          splice_type: formData.splice_type || 'fusion',
          loss_db: formData.loss_db ? parseFloat(formData.loss_db) : null,
          notes: formData.notes || null,
        };
        await odcSpliceService.create(jointBox.id, payload);
      } else {
        const payload = {
          ...formData,
          joint_box_infrastructure_id: jointBox.id,
          cable_1_core: parseInt(formData.cable_1_core),
          cable_2_id: formData.cable_2_id ? parseInt(formData.cable_2_id) : null,
          cable_2_core: parseInt(formData.cable_2_core),
          ...(isOTB && {
            source_otb_id: jointBox.id,
            source_otb_name: jointBox.name,
            source_port: parseInt(formData.cable_1_core),
            splice_type: 'otb',
          }),
        };
        await spliceService.create(payload);
      }
      setShowForm(false);
      setFormData({
        cable_1_id: '',
        cable_1_core: '',
        cable_2_id: '',
        cable_2_core: '',
        splice_type: 'closure',
        splice_date: '',
        notes: '',
        client_name: '',
        client_area: '',
        splice_tray_id: '',
        pigtail_id: '',
        loss_db: '',
      });
      setCable1Cores([]);
      setCable2Cores([]);
      setEditingSplice(null);
      await loadSplices();
    } catch (error) {
      console.error('Error creating splice:', error);
      alert('Error creating splice: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (spliceId, isOdcSplice) => {
    if (!window.confirm('Are you sure you want to delete this splice?')) return;
    try {
      if (isOdcSplice) {
        await odcSpliceService.delete(spliceId);
      } else {
        await spliceService.delete(spliceId);
      }
      loadSplices();
    } catch (error) {
      console.error('Error deleting splice:', error);
      alert('Error deleting splice: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = async (splice) => {
    // Load cores for both cables
    try {
      // Check if this is an OTB pigtail splice (cable_1_id equals joint box or source_otb_id is set)
      const isPigtailSplice = splice.source_otb_id || splice.cable_1_id === splice.joint_box_infrastructure_id;

      if (isPigtailSplice) {
        // For OTB pigtail: only load cable 2 cores
        const cable2Res = await cableService.getById(splice.cable_2_id);
        setCable2Cores(cable2Res.data.cores || []);
        setCable1Cores([]);

        setFormData({
          cable_1_id: 'pigtail',
          cable_1_core: splice.source_port?.toString() || splice.cable_1_core.toString(),
          cable_2_id: splice.cable_2_id.toString(),
          cable_2_core: splice.cable_2_core.toString(),
          splice_type: splice.splice_type,
          splice_date: splice.splice_date || '',
          notes: splice.notes || '',
          client_name: splice.client_name || '',
          client_area: splice.client_area || '',
        });
      } else {
        // Regular splice
        const [cable1Res, cable2Res] = await Promise.all([
          cableService.getById(splice.cable_1_id),
          cableService.getById(splice.cable_2_id)
        ]);

        setCable1Cores(cable1Res.data.cores || []);
        setCable2Cores(cable2Res.data.cores || []);

        setFormData({
          cable_1_id: splice.cable_1_id.toString(),
          cable_1_core: splice.cable_1_core.toString(),
          cable_2_id: splice.cable_2_id.toString(),
          cable_2_core: splice.cable_2_core.toString(),
          splice_type: splice.splice_type,
          splice_date: splice.splice_date || '',
          notes: splice.notes || '',
          client_name: splice.client_name || '',
          client_area: splice.client_area || '',
        });
      }

      setEditingSplice(splice);
      setShowForm(true);
    } catch (error) {
      console.error('Error loading splice data:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await spliceService.update(editingSplice.id, {
        splice_type: formData.splice_type,
        splice_date: formData.splice_date,
        notes: formData.notes,
        client_name: formData.client_name,
        client_area: formData.client_area,
      });
      setShowForm(false);
      setEditingSplice(null);
      setFormData({
        cable_1_id: '',
        cable_1_core: '',
        cable_2_id: '',
        cable_2_core: '',
        splice_type: 'closure',
        splice_date: '',
        notes: '',
        client_name: '',
        client_area: '',
      });
      setCable1Cores([]);
      setCable2Cores([]);
      // Auto-refresh after update
      loadSplices();
    } catch (error) {
      console.error('Error updating splice:', error);
      alert('Error updating splice: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingSplice(null);
    setFormData({
      cable_1_id: '',
      cable_1_core: '',
      cable_2_id: '',
      cable_2_core: '',
      splice_type: 'closure',
      splice_date: '',
      notes: '',
      client_name: '',
      client_area: '',
    });
    setCable1Cores([]);
    setCable2Cores([]);
  };

  // Filter splices based on client status and search
  const getFilteredSplices = () => {
    let result = [...splices];

    // Apply client filter
    if (filter === 'with_client') {
      result = result.filter(s => s.client_name);
    } else if (filter === 'without_client') {
      result = result.filter(s => !s.client_name);
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(s =>
        s.cable1?.name?.toLowerCase().includes(searchLower) ||
        s.cable2?.name?.toLowerCase().includes(searchLower) ||
        s.client_name?.toLowerCase().includes(searchLower) ||
        s.client_area?.toLowerCase().includes(searchLower) ||
        s.cable_1_core?.toString().includes(searchLower) ||
        s.cable_2_core?.toString().includes(searchLower) ||
        (s.is_odc_splice && s.pigtail?.color?.toLowerCase().includes(searchLower)) ||
        (s.is_odc_splice && s.spliceTray?.name?.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.splice_date || 0) - new Date(b.splice_date || 0);
        case 'date_desc':
          return new Date(b.splice_date || 0) - new Date(a.splice_date || 0);
        case 'cable_asc':
          return (a.cable1?.name || '').localeCompare(b.cable1?.name || '');
        case 'cable_desc':
          return (b.cable1?.name || '').localeCompare(a.cable1?.name || '');
        case 'client_asc':
          return (a.client_name || '').localeCompare(b.client_name || '');
        case 'client_desc':
          return (b.client_name || '').localeCompare(a.client_name || '');
        default:
          return 0;
      }
    });

    return result;
  };

  // Check for double splice warnings
  const getDoubleSpliceWarnings = () => {
    const warnings = [];
    splices.forEach(splice => {
      // Check if cable 1 core is used in another splice
      const otherSplicesUsingCable1Core = splices.filter(s =>
        s.id !== splice.id &&
        ((s.cable_1_id === splice.cable_1_id && s.cable_1_core === splice.cable_1_core) ||
         (s.cable_2_id === splice.cable_1_id && s.cable_2_core === splice.cable_1_core))
      );
      if (otherSplicesUsingCable1Core.length > 0) {
        warnings.push({
          spliceId: splice.id,
          message: `Core ${splice.cable_1_core} on ${splice.cable1?.name} is used in multiple splices!`
        });
      }

      // Check if cable 2 core is used in another splice
      const otherSplicesUsingCable2Core = splices.filter(s =>
        s.id !== splice.id &&
        ((s.cable_1_id === splice.cable_2_id && s.cable_1_core === splice.cable_2_core) ||
         (s.cable_2_id === splice.cable_2_id && s.cable_2_core === splice.cable_2_core))
      );
      if (otherSplicesUsingCable2Core.length > 0) {
        warnings.push({
          spliceId: splice.id,
          message: `Core ${splice.cable_2_core} on ${splice.cable2?.name} is used in multiple splices!`
        });
      }
    });
    return warnings;
  };

  // Check if a core is already spliced in THIS joint box (not from OTB)
  const isCoreSplicedInThisJointBox = (cableId, coreNumber) => {
    if (!cableId || !coreNumber) return false;
    return splices.some(splice => {
      // Check if this splice is at THIS joint box (not from OTB)
      // splice at OTB has source_otb_id = jointBox.id, splice at JB has no source_otb_id or different
      const isFromOTB = splice.source_otb_id && splice.source_otb_id !== jointBox.id;
      if (isFromOTB) return false; // Core from OTB can be spliced at Joint Box

      // Check if this core is used in this splice
      const usedInCable1 = splice.cable_1_id == cableId && splice.cable_1_core == coreNumber;
      const usedInCable2 = splice.cable_2_id == cableId && splice.cable_2_core == coreNumber;

      return usedInCable1 || usedInCable2;
    });
  };

  // Check if a core is spliced anywhere (for status display)
  const isCoreSplicedAnywhere = (cableId, coreNumber) => {
    if (!cableId || !coreNumber) return false;
    return splices.some(splice => {
      const usedInCable1 = splice.cable_1_id == cableId && splice.cable_1_core == coreNumber;
      const usedInCable2 = splice.cable_2_id == cableId && splice.cable_2_core == coreNumber;
      return usedInCable1 || usedInCable2;
    });
  };

  // Get display status for core dropdown
  const getCoreDisplayStatus = (cableId, coreNumber, coreStatus) => {
    if (isCoreSplicedAnywhere(cableId, coreNumber)) {
      return 'spliced';
    }
    // Only show valid core statuses, not OTB port status
    const validStatuses = ['available', 'allocated', 'spliced', 'damaged', 'reserved'];
    if (validStatuses.includes(coreStatus)) {
      return coreStatus;
    }
    return 'available';
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedSplices.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedSplices.length} splices?`)) return;

    try {
      for (const spliceId of selectedSplices) {
        await spliceService.delete(spliceId);
      }
      setSelectedSplices([]);
      // Auto-refresh disabled - user can manually refresh
      alert('Splices deleted successfully');
    } catch (error) {
      console.error('Error deleting splices:', error);
      alert('Error deleting splices');
    }
  };

  // Toggle splice selection
  const toggleSpliceSelection = (spliceId) => {
    setSelectedSplices(prev =>
      prev.includes(spliceId)
        ? prev.filter(id => id !== spliceId)
        : [...prev, spliceId]
    );
  };

  // Handle export
  const handleExport = (format) => {
    const data = getFilteredSplices();
    const exportData = data.map(s => ({
      'Cable 1': s.cable1?.name || '-',
      'Cable 1 Core': s.cable_1_core,
      'Cable 1 Path': `${s.cable1?.from_infrastructure?.name || '-'} → ${s.cable1?.to_infrastructure?.name || '-'}`,
      'Cable 2': s.cable2?.name || '-',
      'Cable 2 Core': s.cable_2_core,
      'Cable 2 Path': `${s.cable2?.from_infrastructure?.name || '-'} → ${s.cable2?.to_infrastructure?.name || '-'}`,
      'Type': s.splice_type,
      'Date': s.splice_date || '-',
      'Client': s.client_name || '-',
      'Area': s.client_area || '-',
      'Notes': s.notes || '-',
    }));

    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `splices_${jointBox.name}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'json') {
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `splices_${jointBox.name}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  // Calculate summary counts
  const getSummary = () => {
    const total = splices.length;
    if (isODC) {
      // ODC: count by cable presence
      const withCable = splices.filter(s => s.cable_id || s.cable_1_id).length;
      const withoutCable = total - withCable;
      return { total, withClient: withCable, withoutClient: withoutCable };
    }
    const withClient = splices.filter(s => s.client_name).length;
    const withoutClient = total - withClient;
    return { total, withClient, withoutClient };
  };

  // Trace client from a splice
  const handleTraceClient = async (splice, side) => {
    setTracing(true);
    try {
      const cableId = side === 1 ? splice.cable_1_id : splice.cable_2_id;
      const coreNumber = side === 1 ? splice.cable_1_core : splice.cable_2_core;

      const response = await spliceService.traceClient(cableId, coreNumber);
      setTraceData({
        side,
        splice,
        ...response.data,
      });
    } catch (error) {
      console.error('Error tracing client:', error);
      alert('Error tracing client: ' + (error.response?.data?.error || error.message));
    } finally {
      setTracing(false);
    }
  };

  const getCoreColorStyle = (color) => {
    const colorLower = color?.toLowerCase();
    const colorMap = {
      // English colors
      'blue': '#0066cc',
      'orange': '#ff6600',
      'green': '#00cc00',
      'brown': '#8B4513',
      'gray': '#808080',
      'grey': '#808080',
      'white': '#f0f0f0',
      'red': '#cc0000',
      'black': '#1a1a1a',
      'yellow': '#e6c200',
      'purple': '#800080',
      'pink': '#ff66b2',
      'aqua': '#00cccc',
      'cyan': '#00cccc',
      // Indonesian colors
      'biru': '#0066cc',
      'biru muda': '#87CEEB',
      'oren': '#ff6600',
      'hijau': '#00cc00',
      'merah': '#cc0000',
      'kuning': '#e6c200',
      'hitam': '#1a1a1a',
      'putih': '#f0f0f0',
      'coklat': '#8B4513',
      'abu': '#808080',
      'abu-abu': '#808080',
      'ungu': '#800080',
      'merah muda': '#ff66b2',
      // Additional colors
      'sky': '#87CEEB',
      'skyblue': '#87CEEB',
      'violet': '#8B00FF',
      'gold': '#FFD700',
      'lime': '#32CD32',
      'maroon': '#800000',
      'navy': '#000080',
      'olive': '#808000',
      'silver': '#C0C0C0',
      'teal': '#008080',
      'magenta': '#FF00FF',
      'coral': '#FF7F50',
      'turquoise': '#40E0D0',
      'beige': '#F5F5DC',
      'cream': '#FFFDD0',
      'ivory': '#FFFFF0',
      'khaki': '#C3B091',
      'lavender': '#E6E6FA',
      'salmon': '#FA8072',
      'tan': '#D2B48C',
    };
    const result = colorMap[colorLower] || '#808080';
    return result;
  };

  // Get text color based on background brightness
  const getTextColor = (color) => {
    const darkColors = ['black', 'brown', 'navy', 'maroon', 'olive', 'purple', 'red', 'green', 'teal', 'lime', 'gold', 'hitam', 'coklat', 'ungu', 'merah', 'hijau', 'biru'];
    return darkColors.includes(color?.toLowerCase()) ? '#ffffff' : '#000000';
  };

  if (loading) {
    return (
      <div className="splice-manager">
        <div className="loading">Loading splices...</div>
      </div>
    );
  }

  return (
    <div className="splice-manager">
      {/* Header */}
      <div className="splice-manager-header">
        <div>
          <h2>Splice Manager</h2>
          <p className="splice-manager-subtitle">
            {jointBox.name} - {isODC ? 'Splice Feeder → Pigtail' : isOTB ? 'OTB Port Management' : 'Manage fiber splices'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { loadSplices(); loadCables(); }}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151'
            }}
            title="Refresh data"
          >
            ↻ Refresh
          </button>
          {!isODC && (
          <button className="add-splice-btn" onClick={() => {
            const newFormData = {
              cable_1_id: '',
              cable_1_core: '',
              cable_2_id: '',
              cable_2_core: '',
              splice_type: isOTB ? 'otb' : 'closure',
              splice_date: new Date().toISOString().split('T')[0],
              notes: '',
              client_name: '',
              client_area: '',
            };
            setFormData(newFormData);
            setCable1Cores([]);
            setCable2Cores([]);
            setEditingSplice(null);
            setShowForm(true);
          }}>
            + Add Splice
          </button>
          )}
          <button
            onClick={onClose}
            style={{ background: '#f3f4f6', border: 'none', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: '#4b5563', padding: '8px 16px', borderRadius: '6px' }}
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Summary with Filter Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <div className="splice-summary">
          <div className="summary-card" style={{ borderTopColor: '#6b7280' }}>
            <div className="summary-label">Total</div>
            <div className="summary-value">{getSummary().total}</div>
          </div>
          {isODC ? (
            <>
              <div className="summary-card" style={{ borderTopColor: '#22c55e' }}>
                <div className="summary-label">Feeder Core</div>
                <div className="summary-value">{getSummary().withClient}</div>
              </div>
              <div className="summary-card" style={{ borderTopColor: '#7c3aed' }}>
                <div className="summary-label">Splice Tray</div>
                <div className="summary-value">{getSummary().withoutClient}</div>
              </div>
            </>
          ) : (
            <>
              <div className="summary-card" style={{ borderTopColor: '#22c55e' }}>
                <div className="summary-label">With Client</div>
                <div className="summary-value">{getSummary().withClient}</div>
              </div>
              <div className="summary-card" style={{ borderTopColor: '#f59e0b' }}>
                <div className="summary-label">Without Client</div>
                <div className="summary-value">{getSummary().withoutClient}</div>
              </div>
            </>
          )}
        </div>

        {/* Search Input */}
        <div style={{ marginTop: '12px' }}>
          <input
            type="text"
            placeholder="Search by cable name, client, or core number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          {search && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Found {getFilteredSplices().length} result(s)
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isODC ? (
            // ODC: simpler filter by splice tray
            [
              { key: 'all', label: 'All', count: getSummary().total },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  background: filter === f.key ? '#1f2937' : '#f3f4f6',
                  color: filter === f.key ? 'white' : '#6b7280',
                }}
              >
                {f.label} ({f.count})
              </button>
            ))
          ) : (
            [
              { key: 'all', label: 'All', count: getSummary().total },
              { key: 'with_client', label: 'With Client', count: getSummary().withClient },
              { key: 'without_client', label: 'Without Client', count: getSummary().withoutClient },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  background: filter === f.key ? '#1f2937' : '#f3f4f6',
                  color: filter === f.key ? 'white' : '#6b7280',
                }}
              >
                {f.label} ({f.count})
              </button>
            ))
          )}
        </div>

        {/* Sort Dropdown */}
        <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              cursor: 'pointer',
              background: 'white',
            }}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="cable_asc">Cable (A-Z)</option>
            <option value="cable_desc">Cable (Z-A)</option>
            <option value="client_asc">Client (A-Z)</option>
            <option value="client_desc">Client (Z-A)</option>
          </select>

        {/* Export & Bulk Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleExport('csv')}
            style={{
              padding: '6px 12px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            style={{
              padding: '6px 12px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            Export JSON
          </button>
          {selectedSplices.length > 0 && (
            <button
              onClick={handleBulkDelete}
              style={{
                padding: '6px 12px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              Delete Selected ({selectedSplices.length})
            </button>
          )}
        </div>
      </div>

      {traceData && (
        <div className="modal-overlay" onClick={() => setTraceData(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button data-testid="close-trace-modal" style={{ position: 'absolute', top: '8px', right: '8px', background: '#f3f4f6', border: 'none', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: '#4b5563', padding: '6px 12px', borderRadius: '6px' }} onClick={() => setTraceData(null)}>Tutup</button>
            <h3 style={{ marginTop: 0 }}>Client Trace Information</h3>
            <div style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '12px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Path</div>
                <div style={{ fontWeight: '600' }}>
                  {traceData.side === 1 ? 'Cable 1 → ' : 'Cable 2 → '}
                  Splice at {jointBox.name}
                </div>
              </div>
              {traceData.found ? (
                <>
                  <div style={{ marginBottom: '12px', padding: '12px', background: '#dcfce7', borderRadius: '8px', border: '1px solid #22c55e' }}>
                    <div style={{ fontSize: '12px', color: '#16a34a', marginBottom: '4px' }}>Connected to OTB</div>
                    <div style={{ fontWeight: '600' }}>{traceData.source_otb_name}</div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>Port: {traceData.source_port}</div>
                  </div>
                  {traceData.client_name && (
                    <div style={{ marginBottom: '12px', padding: '12px', background: '#dbeafe', borderRadius: '8px', border: '1px solid #2563eb' }}>
                      <div style={{ fontSize: '12px', color: '#2563eb', marginBottom: '4px' }}>Client Info</div>
                      <div style={{ fontWeight: '600' }}>{traceData.client_name}</div>
                      {traceData.client_area && <div style={{ fontSize: '13px' }}>{traceData.client_area}</div>}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ marginBottom: '12px', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                  <div style={{ fontSize: '12px', color: '#d97706', marginBottom: '4px' }}>Not Connected</div>
                  <div style={{ fontSize: '13px' }}>{traceData.message || 'Cable not connected to any OTB'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Splice Form */}
      {showForm && (
        <form className="splice-form" onSubmit={editingSplice ? handleUpdate : handleSubmit}>
          <h3>{editingSplice ? 'Edit Splice' : 'Add New Splice'}</h3>

          <div className="form-section">
            <div className="form-section-title">{isOTB ? 'Port (Pigtail Incoming)' : 'Cable 1 (Incoming)'}</div>
            <div className="form-row">
              {isOTB ? (
                // OTB: Show port selection instead of cable
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Port Number</label>
                  <select
                    value={formData.cable_1_core}
                    onChange={(e) => handlePortChange(e.target.value)}
                    required
                    disabled={!!editingSplice}
                  >
                    <option value="">Select port...</option>
                    {getPigtailCores().map(core => {
                      const port = otbPorts.find(p => p.port_number === core.core_number);
                      const status = port?.status || 'available';
                      const client = port?.client_name || '';
                      return (
                        <option key={core.core_number} value={core.core_number}>
                          Port {core.core_number} - {status}{client ? ` (${client})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                // Joint Box: Show cable selection
                <>
                  <div className="form-group">
                    <label>Select Cable</label>
                    <select
                      value={formData.cable_1_id}
                      onChange={(e) => handleCable1Change(e.target.value)}
                      required
                      disabled={!!editingSplice}
                    >
                      <option value="">Select cable...</option>
                      {(editingSplice ? allCables : cables).map(cable => (
                        <option key={cable.id} value={cable.id}>
                          {cable.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Core Number</label>
                    <select
                      value={formData.cable_1_core}
                      onChange={(e) => {
                        const coreNum = e.target.value;
                        const isJointBox = jointBox.type?.name?.toLowerCase().includes('joint') ||
                                          jointBox.type?.name?.toLowerCase().includes('box');

                        console.log('Core changed:', coreNum, 'cable:', formData.cable_1_id, 'isJointBox:', isJointBox);

                        // For Joint Box, trace client from Port
                        if (isJointBox && formData.cable_1_id && formData.cable_1_id !== 'pigtail') {
                          console.log('Calling trace for cable:', formData.cable_1_id, 'core:', coreNum);
                          spliceService.traceClient(parseInt(formData.cable_1_id), parseInt(coreNum))
                            .then(traceRes => {
                              console.log('Trace result:', traceRes.data);
                              if (traceRes.data && traceRes.data.found) {
                                setFormData(prev => ({
                                  ...prev,
                                  cable_1_core: coreNum,
                                  client_name: traceRes.data.client_name || '',
                                  client_area: traceRes.data.client_area || '',
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  cable_1_core: coreNum,
                                  client_name: '',
                                  client_area: '',
                                }));
                              }
                            })
                            .catch(err => console.log('Trace client failed:', err));
                        } else {
                          setFormData({ ...formData, cable_1_core: coreNum });
                        }
                      }}
                      required
                      disabled={!formData.cable_1_id || !!editingSplice}
                    >
                      <option value="">Select core...</option>
                      {cable1Cores
                        .map(core => (
                          <option key={core.id} value={core.core_number} disabled={editingSplice ? false : isCoreSplicedInThisJointBox(parseInt(formData.cable_1_id), core.core_number)}>
                            Core {core.core_number} - {core.tube_color}/{core.fiber_color} ({getCoreDisplayStatus(parseInt(formData.cable_1_id), core.core_number, core.status)})
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="splice-connector">
            <span>SPLICE</span>
          </div>

          <div className="form-section">
            <div className="form-section-title">Cable 2 (Outgoing)</div>
            <div className="form-row">
              <div className="form-group">
                <label>Select Cable</label>
                <select
                  value={formData.cable_2_id}
                  onChange={(e) => handleCable2Change(e.target.value)}
                  required
                  disabled={!!editingSplice}
                >
                  <option value="">Select cable...</option>
                  {(editingSplice ? allCables : cables)
                    .filter(cable => cable.id !== parseInt(formData.cable_1_id))
                    .map(cable => (
                      <option key={cable.id} value={cable.id}>
                        {cable.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label>Core Number</label>
                <select
                  value={formData.cable_2_core}
                  onChange={(e) => {
                    const coreNum = e.target.value;
                    // For OTB: don't change client info - it comes from port only
                    // For Joint Box: trace client from cable_1
                    const isJointBox = jointBox.type?.name?.toLowerCase().includes('joint') ||
                                      jointBox.type?.name?.toLowerCase().includes('box');

                    if (isJointBox && formData.cable_1_id && formData.cable_1_id !== 'pigtail') {
                      // For Joint Box, trace client from cable_1
                      spliceService.traceClient(parseInt(formData.cable_1_id), parseInt(formData.cable_1_core))
                        .then(traceRes => {
                          if (traceRes.data && traceRes.data.found && traceRes.data.client_name) {
                            setFormData(prev => ({
                              ...prev,
                              cable_2_core: coreNum,
                              client_name: traceRes.data.client_name,
                              client_area: traceRes.data.client_area || '',
                            }));
                          }
                        })
                        .catch(err => console.log('Trace client failed:', err));
                    } else {
                      // For OTB: just set cable_2_core, don't change client info
                      setFormData(prev => ({ ...prev, cable_2_core: coreNum }));
                    }
                  }}
                  required
                  disabled={!formData.cable_2_id || !!editingSplice}
                >
                  <option value="">Select core...</option>
                  {cable2Cores
                    .map(core => (
                      <option key={core.id} value={core.core_number} disabled={editingSplice ? false : isCoreSplicedInThisJointBox(parseInt(formData.cable_2_id), core.core_number)}>
                        Core {core.core_number} - {core.tube_color}/{core.fiber_color} ({getCoreDisplayStatus(parseInt(formData.cable_2_id), core.core_number, core.status)})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Splice Details</div>
            <div className="form-row">
              <div className="form-group">
                <label>Splice Type</label>
                <select
                  value={formData.splice_type}
                  onChange={(e) => setFormData({ ...formData, splice_type: e.target.value })}
                  required
                >
                  {isOTB && <option value="otb">OTB</option>}
                  <option value="closure">Closure</option>
                  <option value="tray">Tray</option>
                  <option value="termination">Termination</option>
                  <option value="odp">ODP</option>
                  <option value="odc">ODC</option>
                  <option value="rozet">Rozet</option>
                </select>
              </div>
              <div className="form-group">
                <label>Splice Date</label>
                <input
                  type="date"
                  value={formData.splice_date}
                  onChange={(e) => setFormData({ ...formData, splice_date: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Client Information (Optional)</div>
            <div className="form-row">
              <div className="form-group">
                <label>Client Name</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Enter client name..."
                />
              </div>
              <div className="form-group">
                <label>Client Area</label>
                <input
                  type="text"
                  value={formData.client_area}
                  onChange={(e) => setFormData({ ...formData, client_area: e.target.value })}
                  placeholder="Enter client area..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancelEdit} disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : (editingSplice ? 'Update Splice' : 'Add Splice')}
            </button>
          </div>
        </form>
      )}

      {/* Splice List */}
      <div className="splices-list">
        {getFilteredSplices().length === 0 ? (
          <div className="no-splices">
            <p>{isODC ? 'Belum ada splice feeder. Gunakan tab Feeder di OdcManager untuk menambah splice.' : 'No splices found. Click "Add Splice" to create one.'}</p>
          </div>
        ) : (
          getFilteredSplices().map(splice => (
            <div key={splice.id} className="splice-card" style={{ borderLeft: getDoubleSpliceWarnings().some(w => w.spliceId === splice.id) ? '4px solid #dc2626' : undefined }}>
              {/* Selection Checkbox */}
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedSplices.includes(splice.id)}
                  onChange={() => toggleSpliceSelection(splice.id)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
              </div>
              <div className="splice-connection">
                {/* Cable 1 */}
                <div className="splice-end">
                  <div className="splice-cable-name">
                    {splice.cable1?.name || (splice.source_otb_id ? `Port ${splice.source_port || splice.cable_1_core}` : 'Unknown Cable')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                    {splice.cable1 ? (splice.cable1?.from_infrastructure?.name || '—') + ' → ' + (splice.cable1?.to_infrastructure?.name || '—') : (splice.source_otb_id ? splice.source_otb_name : '—')}
                  </div>
                  <div className="splice-core-info">
                    <span className="core-number">
                      Core {splice.cable_1_core}
                    </span>
                    {splice.core1_info && (
                      <div className="core-colors">
                        <span
                          className="color-badge tube"
                          style={{
                            backgroundColor: getCoreColorStyle(splice.core1_info.tube_color),
                            color: getTextColor(splice.core1_info.tube_color)
                          }}
                        >
                          {splice.core1_info.tube_color}
                        </span>
                        <span
                          className="color-badge fiber"
                          style={{
                            backgroundColor: getCoreColorStyle(splice.core1_info.fiber_color),
                            color: getTextColor(splice.core1_info.fiber_color)
                          }}
                        >
                          {splice.core1_info.fiber_color}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cable 2 */}
                <div className="splice-end">
                  {splice.is_odc_splice ? (
                    <>
                      {/* ODC splice: show pigtail info */}
                      <div className="splice-cable-name">
                        {splice.pigtail ? `Pigtail ${splice.pigtail.color}` : 'Pigtail'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                        {splice.spliceTray ? splice.spliceTray.name || `Tray ${splice.spliceTray.tray_number}` : '—'}
                      </div>
                      <div className="splice-core-info">
                        {splice.pigtail?.color && (
                          <span
                            className="color-badge fiber"
                            style={{
                              backgroundColor: getCoreColorStyle(splice.pigtail.color),
                              color: getTextColor(splice.pigtail.color)
                            }}
                          >
                            {splice.pigtail.color}
                          </span>
                        )}
                        {splice.pigtail?.port_number && (
                          <span className="core-number">Port {splice.pigtail.port_number}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="splice-cable-name">
                        {splice.cable2?.name || 'Unknown Cable'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                        {splice.cable2?.from_infrastructure?.name || '—'} → {splice.cable2?.to_infrastructure?.name || '—'}
                      </div>
                      <div className="splice-core-info">
                        <span className="core-number">
                          Core {splice.cable_2_core}
                        </span>
                        {splice.core2_info && (
                          <div className="core-colors">
                            <span
                              className="color-badge tube"
                              style={{
                                backgroundColor: getCoreColorStyle(splice.core2_info.tube_color),
                                color: getTextColor(splice.core2_info.tube_color)
                              }}
                            >
                              {splice.core2_info.tube_color}
                            </span>
                            <span
                              className="color-badge fiber"
                              style={{
                                backgroundColor: getCoreColorStyle(splice.core2_info.fiber_color),
                                color: getTextColor(splice.core2_info.fiber_color)
                              }}
                            >
                              {splice.core2_info.fiber_color}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="splice-details">
                <span className="splice-type">{splice.splice_type || (splice.is_odc_splice ? 'Fusion' : 'Closure')}</span>
                {splice.created_at && (
                  <span className="splice-date">
                    {new Date(splice.created_at).toLocaleDateString()}
                  </span>
                )}
                {splice.loss_db && (
                  <span className="splice-date" style={{ color: '#059669' }}>
                    {splice.loss_db} dB
                  </span>
                )}
                {splice.is_odc_splice ? (
                  <>
                    {splice.spliceTray && (
                      <span className="splice-date" style={{ color: '#7c3aed' }}>
                        {splice.spliceTray.name || `Tray ${splice.spliceTray.tray_number}`}
                      </span>
                    )}
                    {splice.pigtail?.port_number && (
                      <span className="splice-date">
                        Port Pigtail: {splice.pigtail.port_number}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {splice.client_name && (
                      <span className="splice-date" style={{ color: '#4f46e5', fontWeight: '600' }}>
                        Client: {splice.client_name}
                      </span>
                    )}
                    {!splice.client_name && (
                      <span className="splice-date" style={{ color: '#f59e0b' }}>
                        No client assigned
                      </span>
                    )}
                  </>
                )}
                {splice.notes && (
                  <span className="splice-date" style={{ fontStyle: 'italic' }}>
                    {splice.notes}
                  </span>
                )}

                {/* Trace Buttons */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleTraceClient(splice, 1)}
                    disabled={tracing}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f0fdf4',
                      color: '#16a34a',
                      border: '1px solid #22c55e',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '500',
                    }}
                  >
                    Trace Cable 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTraceClient(splice, 2)}
                    disabled={tracing}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f0fdf4',
                      color: '#16a34a',
                      border: '1px solid #22c55e',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '500',
                    }}
                  >
                    Trace Cable 2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(splice)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(splice.id, !!splice.is_odc_splice)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SpliceManager;
