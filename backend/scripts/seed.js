const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../src/config/env');
const User = require('../src/models/User.model');
const Case = require('../src/models/Case.model');
const Document = require('../src/models/Document.model');
const AuditLog = require('../src/models/AuditLog.model');
const { generateHash } = require('../src/services/hash.service');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const logger = {
  info: (msg) => console.log(`\x1b[36m${msg}\x1b[0m`),
  error: (msg) => console.error(`\x1b[31m${msg}\x1b[0m`),
};

const seedData = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Case.deleteMany({});
    await Document.deleteMany({});
    await AuditLog.deleteMany({});
    logger.info('Cleared existing data');

    // Create users with properly hashed passwords
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
    ]);

    logger.info(`Created ${users.length} users`);

    // Create sample documents (with mock hash)
    const mockHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    
    // Create empty mock files
    const mockFiles = [
      'mock-file-1.pdf',
      'mock-file-2.pdf', 
      'mock-file-3.pdf'
    ];
    
    mockFiles.forEach(file => {
      const filePath = path.join(uploadDir, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'Mock file content for demonstration');
      }
    });

    // Find the IO and Reviewer
    const ioUser = users.find(u => u.role === 'IO');
    const reviewerUser = users.find(u => u.role === 'Reviewer');
    const adminUser = users.find(u => u.role === 'Admin');

    // Create cases
    const cases = await Case.create([
      {
        caseId: 'FIR-2026-001',
        title: 'Document Tampering Investigation',
        department: 'Mumbai Division',
        assignedOfficers: [ioUser._id],
        createdBy: adminUser._id,
        status: 'Open',
        description: 'Investigation into alleged document tampering in the Mumbai division.',
      },
      {
        caseId: 'FIR-2026-002',
        title: 'Digital Evidence Chain of Custody',
        department: 'Mumbai Division',
        assignedOfficers: [ioUser._id],
        createdBy: adminUser._id,
        status: 'Open',
        description: 'Tracking digital evidence chain of custody for ongoing cases.',
      },
    ]);

    logger.info(`Created ${cases.length} cases`);

    // Update IO with assigned cases
    ioUser.assignedCases = cases.map(c => c._id);
    await ioUser.save();

    // Create sample documents
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
        version: 1,
        metadata: { pages: 5, author: 'IO Sharma' },
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
        version: 1,
        metadata: { pages: 12, author: 'Forensic Lab' },
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
        version: 1,
        metadata: { entries: 15, verifiedBy: 'Reviewer Patel' },
      },
    ]);

    logger.info(`Created ${documents.length} documents`);

    // Create audit logs
    const auditLogs = await AuditLog.create([
      {
        actorId: adminUser._id,
        action: 'Login',
        ipAddress: '127.0.0.1',
        result: 'Success',
        timestamp: new Date(Date.now() - 3600000),
        metadata: { loginMethod: 'password' },
      },
      {
        actorId: ioUser._id,
        action: 'Upload',
        targetDocumentId: documents[0]._id,
        targetCaseId: cases[0]._id,
        ipAddress: '127.0.0.1',
        result: 'Success',
        timestamp: new Date(Date.now() - 1800000),
        metadata: { title: documents[0].title, fileSize: documents[0].fileSize },
      },
      {
        actorId: ioUser._id,
        action: 'View',
        targetDocumentId: documents[0]._id,
        targetCaseId: cases[0]._id,
        ipAddress: '127.0.0.1',
        result: 'Success',
        timestamp: new Date(Date.now() - 900000),
      },
      {
        actorId: reviewerUser._id,
        action: 'StatusChange',
        targetDocumentId: documents[0]._id,
        targetCaseId: cases[0]._id,
        ipAddress: '127.0.0.1',
        result: 'Success',
        timestamp: new Date(Date.now() - 300000),
        metadata: { fromStatus: 'Draft', toStatus: 'UnderReview' },
      },
      {
        actorId: adminUser._id,
        action: 'Login',
        ipAddress: '127.0.0.1',
        result: 'Success',
        timestamp: new Date(Date.now() - 200000),
        metadata: { loginMethod: 'password' },
      },
    ]);

    logger.info(`Created ${auditLogs.length} audit logs`);

    logger.info('\n=== SEED COMPLETE ===');
    logger.info('\nDemo Users:');
    users.forEach(u => {
      logger.info(`  ${u.name} (${u.role}): ${u.email} / password123`);
    });
    logger.info('\nDemo Cases:');
    cases.forEach(c => {
      logger.info(`  ${c.caseId}: ${c.title}`);
    });
    logger.info('\nDemo Documents:');
    documents.forEach(d => {
      logger.info(`  ${d.title} (${d.status})`);
    });

    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error(`Seed error: ${error.message}`);
    logger.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedData();