const logger = require('../utils/logger');

const applyWatermark = async (buffer, filename, email, ip, action = 'Previewed', lat = null, lng = null) => {
  const ext = filename.toLowerCase().split('.').pop();
  const date = new Date().toISOString().split('T')[0];
  
  const lines = [
    'CONFIDENTIAL',
    `${action} by ${email}`,
    `Date: ${date}`,
    `IP: ${ip}`
  ];
  if (lat && lng) {
    lines.push(`Loc: ${lat}, ${lng}`);
  }
  const watermarkText = lines.join('\n');
  const maxLineLength = Math.max(...lines.map(l => l.length));

  if (ext === 'pdf') {
    try {
      const { PDFDocument, rgb, degrees } = require('pdf-lib');
      const pdfDoc = await PDFDocument.load(buffer);
      const pages = pdfDoc.getPages();
      
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        const fontSize = Math.min(18, width / (maxLineLength * 0.55));
        const lineHeight = fontSize * 1.2;
        const textWidth = maxLineLength * fontSize * 0.5;
        
        // Approximate offset for 45-degree rotated centering
        const xOffset = textWidth * 0.35;
        const yOffset = textWidth * 0.35;

        const positions = [
          { x: width / 2, y: height * 0.2 },
          { x: width / 2, y: height * 0.5 },
          { x: width / 2, y: height * 0.8 }
        ];
        
        positions.forEach(pos => {
          page.drawText(watermarkText, {
            x: pos.x - xOffset,
            y: pos.y - yOffset,
            size: fontSize,
            lineHeight: lineHeight,
            color: rgb(1, 0, 0),
            opacity: 0.25,
            rotate: degrees(45),
          });
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
      
      const maxFontSize = Math.floor(width / (maxLineLength * 0.55));
      const fontSize = Math.max(16, Math.min(36, maxFontSize));
      
      let texts = '';
      const positions = [
        { x: width / 2, y: height * 0.2 },
        { x: width / 2, y: height * 0.5 },
        { x: width / 2, y: height * 0.8 }
      ];
      
      positions.forEach(pos => {
        const spans = lines.map((line, i) => 
          `<tspan x="${pos.x}" dy="${i === 0 ? 0 : '1.2em'}">${line}</tspan>`
        ).join('');
        texts += `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" transform="rotate(-45 ${pos.x} ${pos.y})" class="title">${spans}</text>`;
      });
      
      const svgImage = `
        <svg width="${width}" height="${height}">
          <style>
            .title { fill: rgba(255, 0, 0, 0.25); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
          </style>
          ${texts}
        </svg>
      `;
      
      const svgBuffer = Buffer.from(svgImage);
      
      return await sharp(buffer)
        .composite([
          {
            input: svgBuffer,
            gravity: 'center',
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
