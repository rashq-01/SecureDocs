const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const documentRoutes = require('./document.routes');
const caseRoutes = require('./case.routes');
const auditRoutes = require('./audit.routes');
const adminRoutes = require('./admin.routes');
const versionRoutes = require('./version.routes');
const permissionRoutes = require('./permission.routes');
const accessRequestRoutes = require('./accessRequest.routes');
const shareRoutes = require('./share.routes');
const securityRoutes = require('./security.routes');
const searchRoutes = require('./search.routes');

// Mount routes with version prefix
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/cases', caseRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/admin', adminRoutes);

// Mount version routes under documents
router.use('/documents', versionRoutes);
// Mount permission routes under documents
router.use('/documents', permissionRoutes);

// Mount other routes
router.use('/access-requests', accessRequestRoutes);
router.use('/shares', shareRoutes);
router.use('/security', securityRoutes);
router.use('/search', searchRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;