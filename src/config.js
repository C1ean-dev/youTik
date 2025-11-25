require('dotenv').config();

module.exports = {
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
    channelId: process.env.YOUTUBE_CHANNEL_ID,
    // Additional channels to monitor (can be channel IDs or full URLs)
    channels: [
      'UCIgXqqCK0L8KfJ0Q9rcYqA', // Example channel
      // Add more channels here or from env
    ],
    // Test videos for development (can be video IDs or full YouTube URLs)
    testVideos: [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
      'https://youtu.be/9bZkp7q19f0', // Another test video
      'jNQXAC9IVRw', // Video ID only
    ],
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    models: {
      flash: 'gemini-2.5-flash',
      pro: 'gemini-2.5-pro'
    },
    prompts: {
      cutAnalysis: `Analise este vídeo e sugira cortes de no maximo 1 minuto com momentos de alto engajamento, como picos de ação ou humor. Forneça timestamps exatos (início e fim) para cada sugestão de corte.`,
      titleAndCaptions: `Gere um título viral e legendas criativas para este clipe de vídeo, focando em engajamento no TikTok. Forneça o título em uma linha e as legendas como uma lista de frases curtas.`
    }
  },
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  },
  paths: {
    tempDir: process.env.TEMP_DIR,
    outputDir: process.env.OUTPUT_DIR,
  },
  processing: {
    silenceThreshold: process.env.SILENCE_THRESHOLD,
    accelerationFactor: parseFloat(process.env.ACCELERATION_FACTOR),
    targetResolution: process.env.TARGET_RESOLUTION,
    slidingWindowParts: parseInt(process.env.SLIDING_WINDOW_PARTS),
    slidingWindowStepPercent: parseInt(process.env.SLIDING_WINDOW_STEP_PERCENT),
    finalVideoDuration: parseInt(process.env.FINAL_VIDEO_DURATION),
  },
  development: {
    mode: process.env.DEVELOPMENT_MODE === 'true',
    processTestVideosFirst: process.env.PROCESS_TEST_VIDEOS_FIRST === 'true',
  },
  logging: {
    level: process.env.LOG_LEVEL,
    file: process.env.LOG_FILE,
    quiet: process.env.LOG_QUIET === 'true', // Reduce verbose logging
  }
};