const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { exec, execFile } = require('child_process');
const config = require('./config');
const logger = require('./logger');

ffmpeg.setFfmpegPath(ffmpegStatic);

class SilenceRemover {
  async removeSilence(inputPath, outputPath) {
    try {
      logger.info(`Removing silence from ${inputPath}`);

      // First, detect silence
      const silenceLog = await this.detectSilence(inputPath);
      const segments = this.parseSilenceLog(silenceLog);

      if (segments.length === 0) {
        // No silence detected, copy the file
        await this.copyFile(inputPath, outputPath);
        return outputPath;
      }

      // Create concat file for segments
      const concatFile = path.join(config.paths.tempDir, `concat_${Date.now()}.txt`);
      const concatContent = segments.map(seg => `file '${inputPath}'\ninpoint ${seg.start}\noutpoint ${seg.end}`).join('\n\n');
      fs.writeFileSync(concatFile, concatContent);

      return new Promise((resolve, reject) => {
        ffmpeg()
          .input(concatFile)
          .inputOptions(['-f concat', '-safe 0'])
          .output(outputPath)
          .on('end', () => {
            fs.unlinkSync(concatFile);
            logger.info(`Silence removed, output: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            fs.unlinkSync(concatFile);
            logger.error('Error removing silence:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in removeSilence:', error);
      throw error;
    }
  }

  async detectSilence(inputPath) {
    return new Promise((resolve, reject) => {
      execFile(ffmpegStatic, [
        '-i', inputPath,
        '-af', `silencedetect=noise=${config.processing.silenceThreshold}:d=0.5`,
        '-f', 'null',
        '-'
      ], (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stderr);
        }
      });
    });
  }

  parseSilenceLog(log) {
    const lines = log.split('\n');
    const segments = [];
    let lastEnd = 0;

    for (const line of lines) {
      if (line.includes('silence_start')) {
        const startMatch = line.match(/silence_start: (\d+\.?\d*)/);
        if (startMatch) {
          const silenceStart = parseFloat(startMatch[1]);
          segments.push({ start: lastEnd, end: silenceStart });
        }
      } else if (line.includes('silence_end')) {
        const endMatch = line.match(/silence_end: (\d+\.?\d*)/);
        if (endMatch) {
          const silenceEnd = parseFloat(endMatch[1]);
          lastEnd = silenceEnd;
        }
      }
    }

    // Add final segment if there's content after last silence
    if (lastEnd > 0) {
      segments.push({ start: lastEnd, end: null }); // null means to end
    }

    return segments.filter(seg => seg.end === null || seg.end > seg.start);
  }

  async copyFile(src, dest) {
    return new Promise((resolve, reject) => {
      fs.copyFile(src, dest, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = SilenceRemover;