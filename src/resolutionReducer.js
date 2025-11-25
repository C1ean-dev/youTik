const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const config = require('./config');
const logger = require('./logger');

ffmpeg.setFfmpegPath(ffmpegStatic);

class ResolutionReducer {
  async reduceResolution(inputPath, outputPath, resolution = config.processing.targetResolution) {
    try {
      logger.info(`Reducing resolution of ${inputPath} to ${resolution}`);

      const [width, height] = resolution.split('x').map(Number);

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoFilters(`scale=${width}:${height}`)
          .output(outputPath)
          .on('end', () => {
            logger.info(`Resolution reduced, output: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('Error reducing resolution:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in reduceResolution:', error);
      throw error;
    }
  }
}

module.exports = ResolutionReducer;