const VideoDownloader = require('../src/downloader');
const config = require('../src/config');

jest.mock('ytdl-core');
jest.mock('googleapis');
jest.mock('../src/logger');

describe('VideoDownloader', () => {
  let downloader;

  beforeEach(() => {
    downloader = new VideoDownloader();
  });

  test('should download video', async () => {
    const mockStream = { pipe: jest.fn(), on: jest.fn() };
    const mockWriter = { on: jest.fn() };
    mockWriter.on.mockImplementation((event, cb) => {
      if (event === 'finish') cb();
    });

    require('ytdl-core').mockReturnValue(mockStream);
    require('fs').createWriteStream = jest.fn().mockReturnValue(mockWriter);

    const result = await downloader.downloadVideo('testId', 'output.mp4');
    expect(result).toBe('output.mp4');
  });

  // Add more tests for monitoring, etc.
});