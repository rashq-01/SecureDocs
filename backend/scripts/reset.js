const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const config = require('../src/config/env');
const User = require('../src/models/User.model');
const Case = require('../src/models/Case.model');
const Document = require('../src/models/Document.model');
const AuditLog = require('../src/models/AuditLog.model');
const DocumentVersion = require('../src/models/DocumentVersion.model');
const AccessRequest = require('../src/models/AccessRequest.model');
const Share = require('../src/models/Share.model');
const CaseActivity = require('../src/models/CaseActivity.model');
const { generateHash } = require('../src/services/hash.service');
const { redisClient } = require('../src/config/redis');

const logger = {
  info: (msg) => console.log(`\x1b[36m${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`),
  error: (msg) => console.error(`\x1b[31m✗ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠ ${msg}\x1b[0m`),
  header: (msg) => console.log(`\x1b[35m${msg}\x1b[0m`),
};

const resetDatabase = async () => {
  try {
    logger.header('\n╔════════════════════════════════════════════════════════════╗');
    logger.header('║                    DATABASE RESET                         ║');
    logger.header('╚════════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    logger.success('Connected to MongoDB');

    // Clear Redis
    try {
      await redisClient.flushAll();
      logger.success('Cleared Redis cache');
    } catch (error) {
      logger.warn(`Redis flush failed: ${error.message}`);
    }

    // Drop all collections
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.drop();
      logger.success(`Dropped collection: ${collection.collectionName}`);
    }

    logger.info('\n╔════════════════════════════════════════════════════════════╗');
    logger.header('║                    SEEDING DATA                          ║');
    logger.header('╚════════════════════════════════════════════════════════════╝\n');

    // Create users with hashed passwords
    const passwordHash = await bcrypt.hash('password123', 12);

    const users = await User.create([
      {
        name: 'Admin User',
        email: 'admin@mha.gov.in',
        passwordHash,
        role: 'Admin',
        department: 'Headquarters',
        isActive: true,
      },
      {
        name: 'IO Sharma',
        email: 'io@mha.gov.in',
        passwordHash,
        role: 'IO',
        department: 'Mumbai Division',
        isActive: true,
      },
      {
        name: 'Reviewer Patel',
        email: 'reviewer@mha.gov.in',
        passwordHash,
        role: 'Reviewer',
        department: 'Mumbai Division',
        isActive: true,
      },
      {
        name: 'Legal Liaison Singh',
        email: 'legal@mha.gov.in',
        passwordHash,
        role: 'LegalLiaison',
        department: 'Legal Cell',
        isActive: true,
      },
      {
        name: 'Auditor Gupta',
        email: 'auditor@mha.gov.in',
        passwordHash,
        role: 'Auditor',
        department: 'Audit Department',
        isActive: true,
      },
      {
        name: 'IO Verma',
        email: 'io2@mha.gov.in',
        passwordHash,
        role: 'IO',
        department: 'Delhi Division',
        isActive: true,
      },
    ]);

    logger.success(`Created ${users.length} users`);

    const adminUser = users.find(u => u.role === 'Admin');
    const ioUser = users.find(u => u.email === 'io@mha.gov.in');
    const io2User = users.find(u => u.email === 'io2@mha.gov.in');
    const reviewerUser = users.find(u => u.role === 'Reviewer');
    const legalUser = users.find(u => u.role === 'LegalLiaison');
    const auditorUser = users.find(u => u.role === 'Auditor');

    // Create cases
    const cases = await Case.create([
      {
        caseId: 'FIR-2026-001',
        title: 'Document Tampering Investigation',
        department: 'Mumbai Division',
        assignedOfficers: [ioUser._id],
        createdBy: adminUser._id,
        status: 'Open',
        priority: 'High',
        tags: ['tampering', 'forensic'],
        description: 'Investigation into alleged document tampering in the Mumbai division. Multiple documents found with inconsistent signatures and dates.',
      },
      {
        caseId: 'FIR-2026-002',
        title: 'Digital Evidence Chain of Custody',
        department: 'Mumbai Division',
        assignedOfficers: [ioUser._id, io2User._id],
        createdBy: adminUser._id,
        status: 'InProgress',
        priority: 'Critical',
        tags: ['digital-evidence', 'chain-of-custody'],
        description: 'Tracking digital evidence chain of custody for multiple ongoing cases. Requires strict documentation and verification.',
      },
      {
        caseId: 'FIR-2026-003',
        title: 'Cyber Crime Investigation',
        department: 'Delhi Division',
        assignedOfficers: [io2User._id],
        createdBy: adminUser._id,
        status: 'UnderReview',
        priority: 'High',
        tags: ['cyber-crime', 'digital-forensics'],
        description: 'Investigation into cyber crime incident involving financial fraud. Multiple digital artifacts to be analyzed.',
      },
      {
        caseId: 'FIR-2026-004',
        title: 'Evidence Log Audit',
        department: 'Mumbai Division',
        assignedOfficers: [ioUser._id],
        createdBy: adminUser._id,
        status: 'Open',
        priority: 'Medium',
        tags: ['audit', 'evidence-log'],
        description: 'Audit of evidence logs for cases from the past 6 months. Verify all entries and chain of custody.',
      },
    ]);

    logger.success(`Created ${cases.length} cases`);

    // Update IO with assigned cases
    ioUser.assignedCases = cases.map(c => c._id);
    await ioUser.save();
    io2User.assignedCases = [cases[1]._id, cases[2]._id];
    await io2User.save();

    // Create uploads directory if not exists
    const uploadDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.success('Created uploads directory');
    }

    // Create mock files
    const mockFiles = [
      'mock-file-1.pdf',
      'mock-file-2.pdf',
      'mock-file-3.pdf',
      'mock-file-4.pdf',
      'mock-file-5.pdf',
    ];

    const mockHash = generateHash(Buffer.from('mock file content'));

    mockFiles.forEach(file => {
      const filePath = path.join(uploadDir, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `Mock file content for ${file} - Created at ${new Date().toISOString()}`);
      }
    });

    // Create documents with different statuses and classifications
    const documents = await Document.create([
      {
        caseId: cases[0]._id,
        title: 'FIR Report - Case 001',
        documentType: 'FIR',
        classificationLevel: 'Confidential',
        fileHash: mockHash,
        filePath: path.join(uploadDir, 'mock-file-1.pdf'),
        originalFileName: 'FIR_2026_001.pdf',
        fileSize: 1024 * 100,
        uploadedBy: ioUser._id,
        status: 'UnderReview',
        currentVersion: 2,
        versionHistory: [
          { version: 1, fileHash: mockHash, uploadedBy: ioUser._id, changelog: 'Initial version', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { version: 2, fileHash: mockHash, uploadedBy: ioUser._id, changelog: 'Updated with additional evidence', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
        metadata: { pages: 5, author: 'IO Sharma', reviewedBy: 'Reviewer Patel' },
      },
      {
        caseId: cases[0]._id,
        title: 'Forensic Analysis Report',
        documentType: 'Forensic Report',
        classificationLevel: 'Restricted',
        fileHash: mockHash,
        filePath: path.join(uploadDir, 'mock-file-2.pdf'),
        originalFileName: 'forensic_report_001.pdf',
        fileSize: 1024 * 250,
        uploadedBy: ioUser._id,
        status: 'Draft',
        currentVersion: 1,
        versionHistory: [
          { version: 1, fileHash: mockHash, uploadedBy: ioUser._id, changelog: 'Initial draft', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
        metadata: { pages: 12, author: 'Forensic Lab', labCaseId: 'FL-2026-045' },
      },
      {
        caseId: cases[1]._id,
        title: 'Chain of Custody Log',
        documentType: 'Evidence Log',
        classificationLevel: 'Confidential',
        fileHash: mockHash,
        filePath: path.join(uploadDir, 'mock-file-3.pdf'),
        originalFileName: 'custody_log_002.pdf',
        fileSize: 1024 * 80,
        uploadedBy: ioUser._id,
        status: 'Approved',
        currentVersion: 3,
        versionHistory: [
          { version: 1, fileHash: mockHash, uploadedBy: ioUser._id, changelog: 'Initial log', createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { version: 2, fileHash: mockHash, uploadedBy: io2User._id, changelog: 'Added new entries', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { version: 3, fileHash: mockHash, uploadedBy: reviewerUser._id, changelog: 'Approved by reviewer', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        ],
        metadata: { entries: 15, verifiedBy: 'Reviewer Patel', lastAudit: new Date().toISOString() },
      },
      {
        caseId: cases[2]._id,
        title: 'Cyber Crime Evidence List',
        documentType: 'Evidence Log',
        classificationLevel: 'Restricted',
        fileHash: mockHash,
        filePath: path.join(uploadDir, 'mock-file-4.pdf'),
        originalFileName: 'cyber_evidence_003.pdf',
        fileSize: 1024 * 150,
        uploadedBy: io2User._id,
        status: 'UnderReview',
        currentVersion: 1,
        versionHistory: [
          { version: 1, fileHash: mockHash, uploadedBy: io2User._id, changelog: 'Initial evidence list', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
        metadata: { items: 23, caseOfficer: 'IO Verma' },
      },
      {
        caseId: cases[3]._id,
        title: 'Evidence Log Audit Report',
        documentType: 'Other',
        classificationLevel: 'General',
        fileHash: mockHash,
        filePath: path.join(uploadDir, 'mock-file-5.pdf'),
        originalFileName: 'audit_report_004.pdf',
        fileSize: 1024 * 200,
        uploadedBy: auditorUser._id,
        status: 'Approved',
        currentVersion: 2,
        versionHistory: [
          { version: 1, fileHash: mockHash, uploadedBy: auditorUser._id, changelog: 'Initial audit findings', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { version: 2, fileHash: mockHash, uploadedBy: auditorUser._id, changelog: 'Final audit report', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
        metadata: { auditPeriod: 'Jan-Mar 2026', findings: 12, recommendations: 5 },
      },
    ]);

    logger.success(`Created ${documents.length} documents`);

    // Create Document Versions
    const documentVersions = [];
    for (const doc of documents) {
      for (const version of doc.versionHistory) {
        const docVersion = await DocumentVersion.create({
          documentId: doc._id,
          version: version.version,
          fileHash: version.fileHash || mockHash,
          filePath: doc.filePath,
          originalFileName: doc.originalFileName,
          fileSize: doc.fileSize,
          uploadedBy: version.uploadedBy || doc.uploadedBy,
          changelog: version.changelog || `Version ${version.version}`,
          createdAt: version.createdAt || new Date(),
        });
        documentVersions.push(docVersion);
      }
    }
    logger.success(`Created ${documentVersions.length} document versions`);

    // Create case activities
    const caseActivities = await CaseActivity.create([
      {
        caseId: cases[0]._id,
        actorId: adminUser._id,
        action: 'Created',
        details: { caseId: cases[0].caseId, title: cases[0].title },
        ipAddress: '127.0.0.1',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        caseId: cases[0]._id,
        actorId: ioUser._id,
        action: 'MemberAdded',
        details: { addedMembers: ['IO Sharma'] },
        ipAddress: '127.0.0.1',
        createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      },
      {
        caseId: cases[0]._id,
        actorId: ioUser._id,
        action: 'DocumentUploaded',
        details: { documentTitle: 'FIR Report - Case 001' },
        ipAddress: '127.0.0.1',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        caseId: cases[0]._id,
        actorId: reviewerUser._id,
        action: 'StatusChanged',
        details: { fromStatus: 'Open', toStatus: 'UnderReview' },
        ipAddress: '127.0.0.1',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ]);

    logger.success(`Created ${caseActivities.length} case activities`);

    // Create audit logs with hash chain
    const auditLogs = await AuditLog.create([
      {
        actorId: adminUser._id,
        action: 'Login',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'Success',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        metadata: { email: adminUser.email },
      },
      {
        actorId: ioUser._id,
        action: 'DocumentUploaded',
        targetDocumentId: documents[0]._id,
        targetCaseId: cases[0]._id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'Success',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        metadata: { title: documents[0].title, fileSize: documents[0].fileSize },
      },
      {
        actorId: ioUser._id,
        action: 'DocumentViewed',
        targetDocumentId: documents[0]._id,
        targetCaseId: cases[0]._id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'Success',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        metadata: { title: documents[0].title },
      },
      {
        actorId: reviewerUser._id,
        action: 'DocumentStatusChanged',
        targetDocumentId: documents[0]._id,
        targetCaseId: cases[0]._id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'Success',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        metadata: { fromStatus: 'Draft', toStatus: 'UnderReview' },
      },
      {
        actorId: ioUser._id,
        action: 'DocumentDownloaded',
        targetDocumentId: documents[0]._id,
        targetCaseId: cases[0]._id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'Success',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        metadata: { fileName: documents[0].originalFileName },
      },
      {
        actorId: ioUser._id,
        action: 'LoginFailed',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'Failure',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        metadata: { email: ioUser.email, reason: 'Invalid password' },
      },
      {
        actorId: adminUser._id,
        action: 'UserRoleChanged',
        targetUserId: io2User._id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'Success',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        metadata: { targetEmail: io2User.email, fromRole: 'IO', toRole: 'IO' },
      },
      {
        actorId: auditorUser._id,
        action: 'Login',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        result: 'Success',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        metadata: { email: auditorUser.email },
      },
    ]);

    logger.success(`Created ${auditLogs.length} audit logs`);

    // Create access requests
    const accessRequests = await AccessRequest.create([
      {
        documentId: documents[1]._id,
        requesterId: ioUser._id,
        permissionRequested: 'VIEW',
        justification: 'Need to review forensic report for ongoing case',
        status: 'Approved',
        approverId: adminUser._id,
        approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        accessToken: 'mock_access_token_123',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        documentId: documents[3]._id,
        requesterId: ioUser._id,
        permissionRequested: 'DOWNLOAD',
        justification: 'Need to download evidence list for court submission',
        status: 'Pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ]);

    logger.success(`Created ${accessRequests.length} access requests`);

    // Create shares
    const shares = await Share.create([
      {
        documentId: documents[2]._id,
        sharedBy: ioUser._id,
        sharedWith: legalUser._id,
        permission: 'DOWNLOAD',
        shareToken: 'mock_share_token_123',
        message: 'Please review this for court submission',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        accessCount: 3,
        status: 'Active',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        documentId: documents[4]._id,
        sharedBy: auditorUser._id,
        sharedWith: adminUser._id,
        permission: 'VIEW',
        shareToken: 'mock_share_token_456',
        message: 'Audit report for review',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        accessCount: 0,
        status: 'Active',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ]);

    logger.success(`Created ${shares.length} shares`);

    // Print summary
    logger.header('\n╔════════════════════════════════════════════════════════════╗');
    logger.header('║                    SEED COMPLETE                         ║');
    logger.header('╚════════════════════════════════════════════════════════════╝\n');

    logger.info('📊 Summary:');
    logger.info(`  Users: ${users.length}`);
    logger.info(`  Cases: ${cases.length}`);
    logger.info(`  Documents: ${documents.length}`);
    logger.info(`  Document Versions: ${documentVersions.length}`);
    logger.info(`  Case Activities: ${caseActivities.length}`);
    logger.info(`  Audit Logs: ${auditLogs.length}`);
    logger.info(`  Access Requests: ${accessRequests.length}`);
    logger.info(`  Shares: ${shares.length}`);

    logger.info('\n👤 Demo Users (password: password123):');
    users.forEach(u => {
      logger.info(`  ${u.name} (${u.role}): ${u.email}`);
    });

    logger.info('\n📋 Demo Cases:');
    cases.forEach(c => {
      logger.info(`  ${c.caseId}: ${c.title} (${c.status}) - ${c.priority}`);
    });

    logger.info('\n📄 Demo Documents:');
    documents.forEach(d => {
      logger.info(`  ${d.title} (v${d.currentVersion}) - ${d.status} [${d.classificationLevel}]`);
    });

    logger.info('\n🔐 Audit Logs:');
    logger.info(`  ${auditLogs.length} audit entries with hash chain integrity`);

    logger.info('\n✅ Database reset and seeding complete!');
    logger.info('🚀 You can now start the server with: npm run dev');

    await mongoose.connection.close();
    logger.success('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error(`Reset error: ${error.message}`);
    logger.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

resetDatabase();