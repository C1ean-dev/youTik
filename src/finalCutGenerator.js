const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

ffmpeg.setFfmpegPath(ffmpegStatic);

class FinalCutGenerator {
  async generateFinalCut(clipPaths, outputPath, title, captions) {
    try {
      logger.info(`Generating final cut with ${clipPaths.length} clips`);

      // Create concat file
      const concatFile = path.join(config.paths.tempDir, `final_concat_${Date.now()}.txt`);
      const concatContent = clipPaths.map(clip => `file '${clip}'`).join('\n');
      fs.writeFileSync(concatFile, concatContent);

      // Build drawtext filters
      const filters = this.buildTextFilters(title, captions);

      return new Promise((resolve, reject) => {
        let command = ffmpeg()
          .input(concatFile)
          .inputOptions(['-f concat', '-safe 0']);

        if (filters.length > 0) {
          command = command.videoFilters(filters);
        }

        command
          .output(outputPath)
          .outputOptions(['-c:v libx264', '-c:a aac'])
          .on('end', () => {
            fs.unlinkSync(concatFile);
            logger.info(`Final cut generated: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            fs.unlinkSync(concatFile);
            logger.error('Error generating final cut:', err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error in generateFinalCut:', error);
      throw error;
    }
  }

  buildTextFilters(title, captions) {
    const filters = [];

    // Add title at the beginning
    if (title) {
      filters.push(`drawtext=text='${title}':x=(w-text_w)/2:y=50:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.5:enable='between(t,0,5)'`);
    }

    // Add captions (simplified, add one caption per second or something)
    captions.forEach((caption, index) => {
      const start = 5 + index * 3; // Start after title, 3 seconds per caption
      const end = start + 3;
      filters.push(`drawtext=text='${caption}':x=(w-text_w)/2:y=h-100:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.5:enable='between(t,${start},${end})'`);
    });

    return filters;
  }
}

module.exports = FinalCutGenerator;