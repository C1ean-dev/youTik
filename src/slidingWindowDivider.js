const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

ffmpeg.setFfmpegPath(ffmpegStatic);

class SlidingWindowDivider {
  async getVideoDuration(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
  }

  calculateSegments(duration) {
    const parts = config.processing.slidingWindowParts;
    const stepPercent = config.processing.slidingWindowStepPercent / 100;
    const partDuration = duration / parts;
    const step = partDuration * stepPercent;

    const segments = [];
    for (let i = 0; i < parts; i++) {
      const start = i * (partDuration - step);
      const end = start + partDuration;
      segments.push({ start, end: Math.min(end, duration) });
    }
    return segments;
  }

  async divideIntoParts(inputPath, outputDir) {
    try {
      logger.info(`Dividing ${inputPath} into sliding window parts`);

      const duration = await this.getVideoDuration(inputPath);
      const segments = this.calculateSegments(duration);

      const partPaths = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const outputPath = path.join(outputDir, `part_${i}.mp4`);
        await this.cutSegment(inputPath, outputPath, segment.start, segment.end);
        partPaths.push(outputPath);
      }

      logger.info(`Video divided into ${partPaths.length} parts`);
      return partPaths;
    } catch (error) {
      logger.error('Error in divideIntoParts:', error);
      throw error;
    }
  }

  async cutSegment(inputPath, outputPath, start, end) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(end - start)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }
}

module.exports = SlidingWindowDivider;