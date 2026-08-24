const Document = require('../models/Document.model');
const Case = require('../models/Case.model');
const User = require('../models/User.model');
const { successResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { getAccessibleDocuments } = require('../services/document.service');

/**
 * Global Cross-Entity Search
 * GET /api/v1/search?q=<query>
 */
const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json(successResponse({ documents: [], cases: [], users: [] }, 'Search query too short'));
    }

    const regex = new RegExp(q, 'i');
    
    // 1. Search Cases
    // Scoped by RBAC: Admin/Auditor see all, IO/Reviewer/LegalLiaison see cases they are assigned to
    let caseQuery = {
      $or: [
        { title: regex },
        { caseId: regex },
        { description: regex }
      ]
    };
    
    if (['IO', 'Reviewer', 'LegalLiaison'].includes(req.user.role)) {
      caseQuery.assignedOfficers = req.user._id;
    }
    
    const caseResults = await Case.find(caseQuery).limit(5).lean();
    
    // 2. Search Documents
    // Must respect RBAC, so we get accessible document IDs first or combine logic
    const { documents: accessibleDocs } = await getAccessibleDocuments(
      req.user._id,
      req.user.role,
      req.user.department,
      { title: regex }, // pass regex to document.service filter
      { limit: 5, skip: 0 }
    );
    
    // The existing getAccessibleDocuments only filters by title. 
    // To search originalFileName or type, we must do a custom query if the service doesn't support it,
    // but using the existing service ensures RBAC is strictly followed.
    
    // 3. Search Users (Admin only)
    let userResults = [];
    if (req.user.role === 'Admin') {
      userResults = await User.find({
        $or: [
          { name: regex },
          { email: regex }
        ]
      }).select('name email role department').limit(5).lean();
    }
    
    res.json(successResponse({
      documents: accessibleDocs,
      cases: caseResults,
      users: userResults
    }, 'Search completed'));
  } catch (error) {
    logger.error(`Global search error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  globalSearch
};
