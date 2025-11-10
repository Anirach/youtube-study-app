const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs').promises;

class TranscriptionService {
  /**
   * Get transcript using yt-dlp
   */
  async getTranscript(videoId) {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const tempFile = `/tmp/subtitle_${videoId}`;
      
      // Use yt-dlp to get subtitles in VTT format
      const { stdout, stderr } = await exec(
        `yt-dlp --skip-download --write-auto-sub --sub-lang en --sub-format vtt --output "${tempFile}" "${url}" 2>&1`
      );

      // Read the VTT file
      let vttContent;
      try {
        vttContent = await fs.readFile(`${tempFile}.en.vtt`, 'utf8');
      } catch (e) {
        throw new Error('No transcript available for this video');
      }

      // Clean up temp file
      try {
        await fs.unlink(`${tempFile}.en.vtt`);
      } catch (e) {
        // Ignore cleanup errors
      }

      return this.parseVTT(vttContent);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    }
  }

  /**
   * Parse VTT format
   */
  parseVTT(vttContent) {
    const lines = vttContent.split('\n');
    const segments = [];
    let fullText = '';
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Look for timestamp lines (format: 00:00:00.000 --> 00:00:03.000)
      if (line.includes('-->')) {
        const [startTime, endTime] = line.split('-->').map(t => t.trim());
        const start = this.parseTime(startTime);
        const end = this.parseTime(endTime);
        
        // Get the text (next non-empty lines until blank line)
        i++;
        let text = '';
        while (i < lines.length && lines[i].trim()) {
          // Remove VTT tags like <c> </c>
          const cleanLine = lines[i].replace(/<[^>]*>/g, '').trim();
          if (cleanLine) {
            text += cleanLine + ' ';
          }
          i++;
        }
        
        text = text.trim();
        if (text) {
          segments.push({
            start,
            duration: end - start,
            text
          });
          fullText += text + ' ';
        }
      }
      i++;
    }

    return {
      fullText: fullText.trim(),
      segments,
      language: 'en',
      wordCount: fullText.split(/\s+/).filter(w => w).length
    };
  }

  /**
   * Parse VTT timestamp to seconds
   */
  parseTime(timeStr) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Check if transcript is available
   */
  async isTranscriptAvailable(videoId) {
    try {
      await this.getTranscript(videoId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Search within transcript
   */
  searchTranscript(transcript, query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    transcript.segments.forEach(segment => {
      if (segment.text.toLowerCase().includes(lowerQuery)) {
        results.push({
          timestamp: segment.start,
          text: segment.text,
          context: this.getContext(transcript.segments, segment)
        });
      }
    });

    return results;
  }

  /**
   * Get context around a segment
   */
  getContext(segments, targetSegment, contextSize = 2) {
    const index = segments.findIndex(s => s.start === targetSegment.start);
    const start = Math.max(0, index - contextSize);
    const end = Math.min(segments.length, index + contextSize + 1);

    return segments.slice(start, end).map(s => s.text).join(' ');
  }
}

module.exports = new TranscriptionService();
