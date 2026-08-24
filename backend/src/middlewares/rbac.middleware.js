const { hasPermission } = require('../utils/permissionMatrix');
const { errorResponse, ErrorCodes } = require('../utils/apiResponse');
const Document = require('../models/Document.model');
const Case = require('../models/Case.model');
const logger = require('../utils/logger');
const { writeAuditLog } = require('../services/audit.service');

/**
 * Check if user has permission for an action
 * This middleware checks both global role permissions and document-level access
 */
const rbacCheck = (action, options = {}) => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      
      if (!user) {
        return res.status(401).json(errorResponse(
          ErrorCodes.AUTH_TOKEN_MISSING,
          'User not authenticated',
          401
        ));
      }

      // Check global permission for the action
      if (!hasPermission(user.role, action)) {
        logger.warn(`RBAC denied: ${user.role} cannot perform ${action}`);
        
        // Log the denied access attempt
        await writeAuditLog({
          actorId: user._id,
          action: 'UnauthorizedAccessAttempt',
          targetDocumentId: req.params.id || req.body.documentId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          result: 'Failure',
          metadata: { 
            action: action,
            role: user.role,
            reason: 'Insufficient permissions',
            severity: 'HIGH'
          },
        }).catch(() => {});

        return res.status(403).json(errorResponse(
          ErrorCodes.RBAC_DENIED,
          `You do not have permission to ${action} documents`,
          403
        ));
      }

      // Check document-level access if documentId is present
      if (options.checkDocument !== false) {
        const documentId = req.params.id || req.body.documentId || req.query.documentId;
        
        if (documentId) {
        const document = await Document.findById(documentId).populate('caseId');
        if (!document) {
          return res.status(404).json(errorResponse(
            ErrorCodes.DOCUMENT_NOT_FOUND,
            'Document not found',
            404
          ));
        }

        // Check if user has explicitly been granted access via document permissions
        const explicitPermissions = document.permissions?.get(user._id.toString()) || [];
        const requiredAction = action.toUpperCase();
        
        let canAccess = false;
        if (explicitPermissions.includes(requiredAction)) {
          canAccess = true;
        } else {
          switch (user.role) {
            case 'Admin':
              canAccess = true;
              break;
            case 'IO': {
              const caseData = await Case.findById(document.caseId);
              if (caseData) {
                canAccess = caseData.assignedOfficers.some(
                  id => id.toString() === user._id.toString()
                );
              }
              break;
            }
            case 'Reviewer': {
              const caseData = await Case.findById(document.caseId);
              if (caseData) {
                canAccess = caseData.department === user.department;
              }
              break;
            }
            case 'Auditor':
              canAccess = true; // Auditors can see metadata but not content
              break;
            case 'LegalLiaison':
              canAccess = document.status === 'Approved';
              break;
            default:
              canAccess = false;
          }
        }

        if (!canAccess) {
          logger.warn(`Document access denied: ${user.role} cannot access doc ${documentId}`);
          
          await writeAuditLog({
            actorId: user._id,
            action: 'UnauthorizedAccessAttempt',
            targetDocumentId: documentId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            result: 'Failure',
            metadata: { 
              action: action,
              reason: 'Document-level access denied',
              severity: 'HIGH'
            },
          }).catch(() => {});

          return res.status(403).json(errorResponse(
            ErrorCodes.RBAC_DENIED,
            'You do not have access to this document',
            403
          ));
        }

        // Attach document to request for downstream use
        req.document = document;
      }
      }

      next();
    } catch (error) {
      logger.error(`RBAC error: ${error.message}`);
      logger.error(error.stack);
      return res.status(500).json(errorResponse(
        ErrorCodes.SERVER_ERROR,
        'Authorization check failed',
        500
      ));
    }
  };
};

/**
 * Check if user has a specific role
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    const { user } = req;
    
    if (!user) {
      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_MISSING,
        'User not authenticated',
        401
      ));
    }

    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    if (!roleArray.includes(user.role)) {
      return res.status(403).json(errorResponse(
        ErrorCodes.RBAC_DENIED,
        `This action requires one of these roles: ${roleArray.join(', ')}`,
        403
      ));
    }

    next();
  };
};

module.exports = {
  rbacCheck,
  requireRole,
};