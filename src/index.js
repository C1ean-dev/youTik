const VideoDownloader = require('./downloader');
const SilenceRemover = require('./silenceRemover');
const VideoAccelerator = require('./accelerator');
const ResolutionReducer = require('./resolutionReducer');
const SlidingWindowDivider = require('./slidingWindowDivider');
const GeminiFlashAnalyzer = require('./geminiFlash');
const GeminiProGenerator = require('./geminiPro');
const FinalCutGenerator = require('./finalCutGenerator');
const TikTokUploader = require('./tiktokUploader');
const config = require('./config');
const logger = require('./logger');
const path = require('path');
const fs = require('fs');

class VideoProcessor {
  constructor() {
    this.downloader = new VideoDownloader();
    this.silenceRemover = new SilenceRemover();
    this.accelerator = new VideoAccelerator();
    this.resolutionReducer = new ResolutionReducer();
    this.divider = new SlidingWindowDivider();
    this.flashAnalyzer = new GeminiFlashAnalyzer();
    this.proGenerator = new GeminiProGenerator();
    this.cutGenerator = new FinalCutGenerator();
    this.uploader = new TikTokUploader();
  }

  async processVideo(videoPath) {
    try {
      logger.info(`Starting processing for ${videoPath}`);

      // Step 1: Remove silence
      const noSilencePath = path.join(config.paths.tempDir, `no_silence_${Date.now()}.mp4`);
      await this.silenceRemover.removeSilence(videoPath, noSilencePath);

      // Step 2: Accelerate
      const acceleratedPath = path.join(config.paths.tempDir, `accelerated_${Date.now()}.mp4`);
      await this.accelerator.accelerateVideo(noSilencePath, acceleratedPath);

      // Step 3: Reduce resolution
      const reducedPath = path.join(config.paths.tempDir, `reduced_${Date.now()}.mp4`);
      await this.resolutionReducer.reduceResolution(acceleratedPath, reducedPath);

      // Step 4: Divide into parts
      const partsDir = path.join(config.paths.tempDir, `parts_${Date.now()}`);
      fs.mkdirSync(partsDir);
      const partPaths = await this.divider.divideIntoParts(reducedPath, partsDir);

      // Step 5: Analyze each part with Gemini Flash
      const allSuggestions = [];
      for (const partPath of partPaths) {
        const suggestions = await this.flashAnalyzer.analyzeVideoForCuts(partPath);
        allSuggestions.push(...suggestions);
      }

      // Select top suggestions (simplified, take first few)
      const selectedClips = allSuggestions.slice(0, 3).map(sugg => ({ start: sugg.start, end: sugg.end }));

      // For simplicity, assume we cut the original reduced video with these timestamps
      const selectedClipPaths = [];
      for (let i = 0; i < selectedClips.length; i++) {
        const clip = selectedClips[i];
        const clipPath = path.join(config.paths.tempDir, `clip_${i}.mp4`);
        await this.divider.cutSegment(reducedPath, clipPath, clip.start, clip.end);
        selectedClipPaths.push(clipPath);
      }

      // Step 6: Generate title and captions for the final video (using first clip)
      const { title, captions } = await this.proGenerator.generateTitleAndCaptions(selectedClipPaths[0]);

      // Step 7: Generate final cut
      const finalPath = path.join(config.paths.outputDir, `final_${Date.now()}.mp4`);
      await this.cutGenerator.generateFinalCut(selectedClipPaths, finalPath, title, captions);

      // Step 8: Upload to TikTok
      await this.uploader.uploadVideo(finalPath, title, captions);

      // Cleanup temp files
      this.cleanup([videoPath, noSilencePath, acceleratedPath, reducedPath, ...partPaths, ...selectedClipPaths]);

      logger.info('Processing completed successfully');
    } catch (error) {
      logger.error('Error in processing:', error);
      // Retry logic could be added here
    }
  }

  cleanup(paths) {
    paths.forEach(p => {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    });
  }

  async start() {
    logger.info('Starting YouTube to TikTok automation...');

    const operationMode = config.development.operationMode;
    logger.info(`Operation mode: ${operationMode}`);

    // Process test videos if in test mode or both
    if ((operationMode === 'test' || operationMode === 'both') && config.development.processTestVideosFirst) {
      logger.info('Processing test videos...');
      const testVideos = await this.downloader.processTestVideos();
      for (const videoPath of testVideos) {
        await this.processVideo(videoPath);
      }
    }

    // Start monitoring if in monitor mode or both
    if (operationMode === 'monitor' || operationMode === 'both') {
      // Callback for when new videos are downloaded
      const onNewVideos = async (results) => {
        for (const result of results) {
          try {
            await this.processVideo(result.outputPath);
          } catch (error) {
            logger.error(`Error processing video ${result.videoId} from channel ${result.channelId}:`, error);
          }
        }
      };

      // Start monitoring for new videos
      this.downloader.startMonitoring(null, onNewVideos);

      logger.info(`Monitoring started. Checking every ${config.youtube.monitoringIntervalMinutes} minutes.`);
    } else {
      logger.info('Monitoring disabled by operation mode configuration.');
    }

    // If only test mode and no test videos to process, exit
    if (operationMode === 'test' && !config.development.processTestVideosFirst) {
      logger.info('Test mode enabled but processTestVideosFirst is disabled. Nothing to do.');
    }
  }
}

// Start the processor
const processor = new VideoProcessor();
processor.start().catch(error => {
  logger.error('Failed to start processor:', error);
  process.exit(1);
});

module.exports = VideoProcessor;