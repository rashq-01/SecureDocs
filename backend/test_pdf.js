const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '/home/rashq/Desktop/SecureDocs/backend/.env' });
const { decryptBuffer } = require('./src/services/encryption.service');
const pdfParse = require('pdf-parse');
const Document = require('./src/models/Document.model');

async function testPdf() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find a PDF document
  const doc = await Document.findOne({ originalFileName: { $regex: /pdf/i } }).sort({ createdAt: -1 });
  
  if (!doc) {
    console.log("No PDF found");
    process.exit(0);
  }
  
  console.log("Testing PDF:", doc.originalFileName);
  
  try {
    const encryptedBuffer = fs.readFileSync(doc.filePath);
    const decryptedBuffer = decryptBuffer(encryptedBuffer);
    
    console.log("Decrypted buffer length:", decryptedBuffer.length);
    console.log("First 10 bytes:", decryptedBuffer.slice(0, 10).toString('hex'));
    
    const pdfData = await pdfParse(decryptedBuffer);
    console.log("Successfully parsed PDF!");
    console.log("Text preview:", pdfData.text.substring(0, 200));
  } catch (err) {
    console.error("PDF Parse Error:", err);
  }
  
  process.exit(0);
}

testPdf();
