# YouTube to TikTok Automation

A modular Node.js system for automating the processing of YouTube videos for TikTok upload.

## Features

- Monitors YouTube channel for new videos
- Downloads latest videos automatically
- Processes videos: removes silence, accelerates, reduces resolution
- Divides into sliding window parts
- Uses Gemini AI for cut suggestions and content generation
- Generates final TikTok-ready video with titles and captions
- Uploads to TikTok automatically
- **Rate Limiting**: Prevents API abuse with minimum intervals between calls
- **Quota Protection**: Automatically stops when API limits are reached
- **Error Handling**: Intelligent retry logic and monitoring pause on failures

## Installation

1. Clone the repository
2. Run `npm install`
3. Copy `.env` and fill in your API keys and configurations

## API Setup

Before running the system, you need to obtain API keys from the following services:

### YouTube Data API v3
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Set `YOUTUBE_API_KEY` in your `.env` file

### Google Gemini API
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create an API key
4. Set `GEMINI_API_KEY` in your `.env` file

### TikTok API
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a developer account
3. Register your application
4. Get Client Key and Client Secret
5. Set `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` in your `.env` file

## Configuration

Edit the `.env` file with your credentials:

- YOUTUBE_API_KEY: Your YouTube Data API v3 key
- GEMINI_API_KEY: Your Google Gemini API key
- TIKTOK_CLIENT_KEY: TikTok API client key
- TIKTOK_CLIENT_SECRET: TikTok API client secret
- LOG_QUIET: Set to `true` to reduce verbose logging (default: false)

### Additional Configuration

In `src/config.js`, you can configure:

- **Channels to monitor**: Add YouTube channel IDs or full URLs in the `channels` array
- **Test videos**: Add video IDs or full YouTube URLs in the `testVideos` array for development/testing
- **Gemini models**: Configure which Gemini models to use (`flash` and `pro`)
- **AI prompts**: Customize the prompts used for video analysis and content generation
- **Development mode**: Set `processTestVideosFirst: true` to process test videos before monitoring

Example configuration in `src/config.js`:
```javascript
channels: [
  'UCIgXqqCK0L8KfJ0Q9rcYqA', // Channel ID
  'https://www.youtube.com/@examplechannel' // Full URL
],
testVideos: [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Full URL
  'jNQXAC9IVRw' // Video ID only
],
models: {
  flash: 'gemini-2.5-flash',
  pro: 'gemini-2.5-pro'
},
prompts: {
  cutAnalysis: 'Custom prompt for video cut analysis...',
  titleAndCaptions: 'Custom prompt for title and captions...'
}
```

## Usage

Run `npm start` to start monitoring and processing.

## Architecture

The system is modular with separate classes for each functionality:

- `VideoDownloader`: Handles YouTube monitoring and downloading
- `SilenceRemover`: Removes silent parts using FFmpeg
- `VideoAccelerator`: Speeds up video
- `ResolutionReducer`: Reduces to 480p
- `SlidingWindowDivider`: Divides video into overlapping parts
- `GeminiFlashAnalyzer`: Analyzes parts for cut suggestions
- `GeminiProGenerator`: Generates titles and captions
- `FinalCutGenerator`: Creates final video with overlays
- `TikTokUploader`: Uploads to TikTok

## Testing

Run `npm test` to execute unit tests.

## Troubleshooting

### YouTube API Quota Exceeded
If you see quota exceeded errors:
1. Check your YouTube API key in `.env`
2. Verify the channel ID is correct
3. Monitor your API usage in Google Cloud Console
4. The system will automatically pause monitoring when quota is exceeded
5. **Rate Limiting**: System includes automatic rate limiting (1 second minimum between API calls)
6. **Quota Protection**: Monitoring stops completely when quota is exceeded to prevent further charges

### Verbose Logging
To reduce log spam:
1. Set `LOG_QUIET=true` in `.env`
2. Change `LOG_LEVEL=warn` to show only warnings and errors
3. Check logs in `./logs/app.log`

### Common Issues
- **Invalid Channel ID**: Verify the YouTube channel ID format
- **API Authentication**: Ensure all API keys are valid and have proper permissions
- **FFmpeg Not Found**: Make sure FFmpeg is installed and accessible

## Requirements

- Node.js
- FFmpeg
- API keys for YouTube, Gemini, TikTok