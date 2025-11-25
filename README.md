# YouTube to TikTok Automation

A modular Node.js system for automating the processing of YouTube videos for TikTok upload.

## Features

- **Multi-Channel Monitoring**: Monitors multiple YouTube channels for new videos
- **Flexible Channel Input**: Supports channel IDs, handles (@username), and full URLs
- **Automatic Downloads**: Downloads latest videos from monitored channels
- **Video Processing Pipeline**: Removes silence, accelerates, reduces resolution
- **AI-Powered Editing**: Uses Gemini AI for intelligent cut suggestions and content generation
- **TikTok Optimization**: Generates final videos with titles and captions optimized for TikTok
- **Automated Upload**: Uploads processed videos to TikTok automatically
- **Operation Modes**: Choose between monitoring, testing, or both modes
- **Rate Limiting**: Prevents API abuse with configurable intervals between calls
- **Quota Protection**: Automatically stops when YouTube API limits are reached
- **Intelligent Error Handling**: Retry logic with exponential backoff and monitoring pause
- **Configurable Settings**: Extensive environment variable configuration for all aspects

## Installation

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your API keys and configurations
   ```bash
   cp .env.example .env
   ```

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

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

#### API Credentials
- `YOUTUBE_API_KEY`: Your YouTube Data API v3 key
- `GEMINI_API_KEY`: Your Google Gemini API key
- `TIKTOK_CLIENT_KEY`: TikTok API client key
- `TIKTOK_CLIENT_SECRET`: TikTok API client secret

#### YouTube Configuration
- `YOUTUBE_CHANNEL_ID`: Primary YouTube channel ID (optional if using channels array)
- `YOUTUBE_MONITORING_INTERVAL_MINUTES`: How often to check for new videos (default: 5)
- `YOUTUBE_MIN_API_INTERVAL_MS`: Minimum milliseconds between API calls (default: 1000)
- `YOUTUBE_MAX_MONITORING_INTERVAL_MINUTES`: Max backoff interval on errors (default: 60)
- `YOUTUBE_CONSECUTIVE_ERRORS_THRESHOLD`: Errors before increasing interval (default: 3)

#### Operation Mode
- `OPERATION_MODE`: Choose operation mode
  - `monitor`: Only monitor channels for new videos
  - `test`: Only process test videos
  - `both`: Monitor channels AND process test videos (default)

#### File Paths
- `TEMP_DIR`: Directory for temporary files (default: ./temp)
- `OUTPUT_DIR`: Directory for final output videos (default: ./output)

#### Processing Settings
- `SILENCE_THRESHOLD`: Silence detection threshold (default: -30dB)
- `ACCELERATION_FACTOR`: Video speed multiplier (default: 2.0)
- `TARGET_RESOLUTION`: Output resolution (default: 854x480)
- `SLIDING_WINDOW_PARTS`: Number of parts to divide video into (default: 10)
- `SLIDING_WINDOW_STEP_PERCENT`: Overlap percentage between parts (default: 10)
- `FINAL_VIDEO_DURATION`: Target duration in seconds (default: 60)

#### Development & Logging
- `DEVELOPMENT_MODE`: Enable development features (default: true)
- `PROCESS_TEST_VIDEOS_FIRST`: Process test videos before monitoring (default: true)
- `LOG_LEVEL`: Logging level (default: info)
- `LOG_FILE`: Log file path (default: ./logs/app.log)
- `LOG_QUIET`: Reduce verbose logging (default: false)

### Channel Configuration

Configure channels to monitor in `src/config.js`:

```javascript
channels: [
  // Multiple input formats supported:
  'UC1234567890abcdef',                    // Channel ID
  '@FlowPodcast',                          // Handle only
  'https://www.youtube.com/@FlowPodcast',  // Full URL
  'https://www.youtube.com/channel/UC123'  // Legacy URL format
],
```

### Test Videos Configuration

Configure test videos for development:

```javascript
testVideos: [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Full YouTube URL
  'jNQXAC9IVRw',                                 // Video ID only
  'https://youtu.be/9bZkp7q19f0'                 // Short URL
],
```

### AI Configuration

Customize Gemini models and prompts in `src/config.js`:

```javascript
models: {
  flash: 'gemini-2.5-flash',
  pro: 'gemini-2.5-pro'
},
prompts: {
  cutAnalysis: 'Analyze this video and suggest cuts under 1 minute with high engagement moments...',
  titleAndCaptions: 'Generate a viral TikTok title and captions for this video clip...'
}
```

## Usage

### Basic Usage

Run `npm start` to start the system with default configuration (monitoring + testing).

### Operation Modes

Choose what the system should do using the `OPERATION_MODE` environment variable:

#### Monitor Mode (Production)
Only monitor channels for new videos and process them automatically:
```bash
OPERATION_MODE=monitor npm start
```

#### Test Mode (Development)
Only process test videos for development and testing:
```bash
OPERATION_MODE=test npm start
```

#### Both Mode (Default)
Process test videos first, then start monitoring:
```bash
OPERATION_MODE=both npm start
# or simply:
npm start
```

### Examples

```bash
# Development with test videos only
OPERATION_MODE=test PROCESS_TEST_VIDEOS_FIRST=true npm start

# Production monitoring with custom interval
OPERATION_MODE=monitor YOUTUBE_MONITORING_INTERVAL_MINUTES=10 npm start

# Quick test run
OPERATION_MODE=test npm start
```

## Multi-Channel Monitoring

The system supports monitoring multiple YouTube channels simultaneously. Configure channels in `src/config.js`:

### Supported Channel Formats

```javascript
channels: [
  // 1. Channel Handle (recommended)
  '@FlowPodcast',
  '@MrBeast',

  // 2. Full YouTube URLs
  'https://www.youtube.com/@FlowPodcast',
  'https://www.youtube.com/@TechReviews',

  // 3. Channel IDs (direct)
  'UC1234567890abcdef',
  'UC987654321fedcba',

  // 4. Legacy channel URLs
  'https://www.youtube.com/channel/UC1234567890abcdef'
],
```

### How Channel Resolution Works

1. **Handles (@username)**: Automatically resolved to channel IDs using YouTube API
2. **URLs**: Extracted handle or channel ID from the URL
3. **Direct IDs**: Used as-is for maximum efficiency

### Channel Tracking

- Each channel maintains its own "last video" tracking
- New videos from any monitored channel trigger the processing pipeline
- Failed resolutions are logged but don't stop other channels

### Best Practices

- Use handles (`@ChannelName`) for readability and maintainability
- Mix different formats as needed
- Monitor up to 10-15 channels per instance (API quota considerations)
- Test channel configurations in test mode first

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

### YouTube API Issues

#### Quota Exceeded
If you see quota exceeded errors:
1. Check your YouTube API key in `.env`
2. Monitor your API usage in Google Cloud Console
3. The system automatically pauses monitoring when quota is exceeded
4. **Rate Limiting**: Configurable minimum intervals between API calls (default: 1 second)
5. **Quota Protection**: Monitoring stops completely to prevent further charges

#### Channel Resolution Failures
If channels can't be resolved:
1. Verify the handle format: `@ChannelName` (without spaces)
2. Check if the channel exists and is public
3. Try using the full URL format instead
4. Some channels may have custom URLs that don't follow standard patterns

#### Invalid Channel References
Common issues:
- **Wrong format**: Use `@handle` or full URLs, not just usernames
- **Private channels**: Only public channels can be monitored
- **Deleted channels**: Verify the channel still exists
- **Custom URLs**: Some channels use custom URLs that may not resolve correctly

### Operation Mode Issues

#### Test Mode Not Working
If test videos aren't processing:
1. Ensure `PROCESS_TEST_VIDEOS_FIRST=true` in `.env`
2. Check that `testVideos` array is populated in `config.js`
3. Verify video URLs/IDs are valid and accessible

#### Monitor Mode Not Starting
If monitoring doesn't start:
1. Check `OPERATION_MODE` is set to `monitor` or `both`
2. Verify `channels` array has valid entries in `config.js`
3. Ensure YouTube API key has proper permissions
4. Check API quota hasn't been exceeded

### Performance & Configuration

#### Slow Channel Resolution
- Channel resolution on startup can take time for many channels
- Consider using direct channel IDs for faster startup
- Handles are resolved once and cached per session

#### Memory Usage
- Processing multiple channels simultaneously increases memory usage
- Consider running separate instances for different channel groups
- Monitor system resources when processing many videos

### Verbose Logging
To reduce log spam:
1. Set `LOG_QUIET=true` in `.env`
2. Change `LOG_LEVEL=warn` to show only warnings and errors
3. Check logs in `./logs/app.log`

### Common Issues
- **Invalid Channel ID**: Verify YouTube channel ID/handle format
- **API Authentication**: Ensure all API keys are valid and have proper permissions
- **FFmpeg Not Found**: Make sure FFmpeg is installed and accessible
- **File Permissions**: Ensure write access to temp and output directories
- **Network Issues**: Check internet connectivity for API calls and downloads

## Advanced Configuration

### Rate Limiting & API Management

The system includes sophisticated rate limiting to prevent API abuse:

- **Minimum API Interval**: Configurable delay between YouTube API calls
- **Error Backoff**: Exponential backoff on consecutive failures
- **Quota Protection**: Automatic shutdown when API limits are reached
- **Per-Channel Tracking**: Individual monitoring state for each channel

Configure in `.env`:
```bash
YOUTUBE_MIN_API_INTERVAL_MS=1000          # 1 second minimum
YOUTUBE_MAX_MONITORING_INTERVAL_MINUTES=60 # Max 1 hour backoff
YOUTUBE_CONSECUTIVE_ERRORS_THRESHOLD=3     # Errors before backoff
```

### Monitoring Intervals

- **Base Interval**: How often to check for new videos (default: 5 minutes)
- **Dynamic Adjustment**: Increases automatically on errors
- **Per-Channel**: Each channel checked independently
- **Rate Limited**: Respects API quotas and rate limits

### File Management

- **Temporary Files**: Automatically cleaned up after processing
- **Output Organization**: Final videos stored with timestamps
- **Error Recovery**: Failed downloads don't leave partial files

## Requirements

- Node.js (v16+ recommended)
- FFmpeg (latest version)
- API keys for YouTube Data API v3, Google Gemini, and TikTok
- Sufficient disk space for video processing (recommend 10GB+)
- Stable internet connection for API calls and downloads

## API Quotas & Costs

### YouTube Data API v3
- **Daily Quota**: 10,000 units (resets daily)
- **Cost**: $0.015 per 1,000 units
- **Monitoring Cost**: ~50-100 units per channel per day
- **Resolution Cost**: ~100 units per new channel added

### Google Gemini API
- **Pricing**: Pay-per-use based on tokens
- **Typical Usage**: $0.01-0.05 per video processed

### TikTok API
- **Free Tier**: Limited uploads
- **Paid Plans**: Based on usage

Monitor your usage in respective developer consoles to avoid unexpected costs.