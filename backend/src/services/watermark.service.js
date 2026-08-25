const logger = require('../utils/logger');

const applyWatermark = async (buffer, filename, email, ip, action = 'Previewed') => {
  const ext = filename.toLowerCase().split('.').pop();
  const date = new Date().toISOString().split('T')[0];
  const watermarkText = `CONFIDENTIAL - ${action} by ${email} on ${date}. IP: ${ip}`;

  if (ext === 'pdf') {
    try {
      const { PDFDocument, rgb, degrees } = require('pdf-lib');
      const pdfDoc = await PDFDocument.load(buffer);
      const pages = pdfDoc.getPages();
      
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        
        page.drawText(watermarkText, {
          x: 10,
          y: 10,
          size: Math.min(12, width / (watermarkText.length * 0.6)), // scale down if needed
          color: rgb(1, 0, 0), // pure red
          opacity: 0.8, // 20% transparency
          rotate: degrees(0),
        });
      });
      
      return Buffer.from(await pdfDoc.save());
    } catch (err) {
      logger.error('PDF watermarking failed: ' + err.message);
      return buffer;
    }
  } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    try {
      let sharp;
      try {
        sharp = require('sharp');
      } catch (e) {
        logger.warn('sharp library not installed, skipping image watermark. Run: npm install sharp');
        return buffer;
      }
      
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 800;
      
      // Calculate font size relative to image width so it always fits
      const maxFontSize = Math.floor(width / (watermarkText.length * 0.6));
      const fontSize = Math.max(12, Math.min(24, maxFontSize));
      
      const svgImage = `
        <svg width="${width}" height="${height}">
          <style>
            .title { fill: rgba(255, 0, 0, 0.8); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
          </style>
          <text x="10" y="${height - 10}" text-anchor="start" class="title">${watermarkText}</text>
        </svg>
      `;
      
      const svgBuffer = Buffer.from(svgImage);
      
      return await sharp(buffer)
        .composite([
          {
            input: svgBuffer,
            gravity: 'southwest',
          }
        ])
        .toBuffer();
    } catch (err) {
      logger.error('Image watermarking failed: ' + err.message);
      return buffer;
    }
  }

  return buffer;
};

module.exports = {
  applyWatermark,
};
