const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const config = require('./config');
const logger = require('./logger');

ffmpeg.setFfmpegPath(ffmpegStatic);

class VideoAccelerator {
  async accelerateVideo(inputPath, outputPath, factor = config.processing.accelerationFactor) {
    try {
      logger.info(`Accelerating video ${inputPath} by factor ${factor}`);

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoFilters(`setpts=PTS/${factor}`)
          .audioFilters(`atempo=${factor}`)
          .output(outputPath)
          .on('end', () => {
            logger.info(`Video accelerated, output: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('Error accelerating video:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in accelerateVideo:', error);
      throw error;
    }
  }
}

module.exports = VideoAccelerator;