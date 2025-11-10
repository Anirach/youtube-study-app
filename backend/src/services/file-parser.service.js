/**
 * File Parser Service
 * Extracts text content from various file types
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class FileParserService {
  /**
   * Parse file and extract text content
   */
  async parseFile(filePath, mimeType) {
    try {
      console.log(`Parsing file: ${filePath} (${mimeType})`);

      // Text files
      if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        return await this.parseTextFile(filePath);
      }

      // PDF files
      if (mimeType === 'application/pdf') {
        return await this.parsePDF(filePath);
      }

      // Word documents
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          mimeType === 'application/msword') {
        return await this.parseWord(filePath);
      }

      // Images (OCR)
      if (mimeType.startsWith('image/')) {
        return await this.parseImage(filePath);
      }

      throw new Error(`Unsupported file type: ${mimeType}`);
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error(`Failed to parse file: ${error.message}`);
    }
  }

  /**
   * Parse text file
   */
  async parseTextFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      text: content,
      metadata: {
        type: 'text',
        length: content.length
      }
    };
  }

  /**
   * Parse PDF using pdftotext (poppler-utils)
   */
  async parsePDF(filePath) {
    return new Promise((resolve, reject) => {
      const outputPath = filePath + '.txt';
      
      // Use pdftotext command (requires poppler-utils)
      const process = spawn('pdftotext', ['-layout', filePath, outputPath]);

      let stderr = '';
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`pdftotext failed: ${stderr}`));
          return;
        }

        try {
          const text = await fs.readFile(outputPath, 'utf-8');
          await fs.unlink(outputPath); // Clean up temp file
          
          resolve({
            text: text.trim(),
            metadata: {
              type: 'pdf',
              length: text.length
            }
          });
        } catch (error) {
          reject(error);
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn pdftotext: ${error.message}`));
      });
    });
  }

  /**
   * Parse Word document using python-docx
   */
  async parseWord(filePath) {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
from docx import Document

try:
    doc = Document('${filePath}')
    text = '\\n'.join([para.text for para in doc.paragraphs])
    print(text)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

      const process = spawn('python3', ['-c', pythonScript]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Word parsing failed: ${stderr}`));
          return;
        }

        resolve({
          text: stdout.trim(),
          metadata: {
            type: 'word',
            length: stdout.length
          }
        });
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to parse Word document: ${error.message}`));
      });
    });
  }

  /**
   * Parse image using Tesseract OCR
   */
  async parseImage(filePath) {
    return new Promise((resolve, reject) => {
      const process = spawn('tesseract', [filePath, 'stdout', '-l', 'eng+tha']);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Tesseract OCR failed: ${stderr}`));
          return;
        }

        resolve({
          text: stdout.trim(),
          metadata: {
            type: 'image',
            length: stdout.length,
            ocr: true
          }
        });
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to run OCR: ${error.message}`));
      });
    });
  }

  /**
   * Get supported file types
   */
  getSupportedTypes() {
    return [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
  }
}

module.exports = new FileParserService();

