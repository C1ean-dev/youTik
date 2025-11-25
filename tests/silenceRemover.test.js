const SilenceRemover = require('../src/silenceRemover');
const config = require('../src/config');

jest.mock('fluent-ffmpeg');
jest.mock('ffmpeg-static');
jest.mock('child_process');
jest.mock('../src/logger');

describe('SilenceRemover', () => {
  let silenceRemover;

  beforeEach(() => {
    silenceRemover = new SilenceRemover();
    // Mock exec for all tests
    const { exec } = require('child_process');
    exec.mockImplementation((command, callback) => {
      if (command.includes('silencedetect')) {
        callback(null, 'stdout', 'silence_start: 5.0\nsilence_end: 10.0');
      } else {
        callback(null, 'stdout', '');
      }
    });
  });

  test('should remove silence from video', async () => {
    const mockFfmpeg = {
      input: jest.fn().mockReturnThis(),
      inputOptions: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, cb) => {
        if (event === 'end') setTimeout(cb, 10); // Simulate async
        return mockFfmpeg;
      }),
      run: jest.fn()
    };

    require('fluent-ffmpeg').mockReturnValue(mockFfmpeg);

    const result = await silenceRemover.removeSilence('input.mp4', 'output.mp4');
    expect(result).toBe('output.mp4');
  }, 10000); // Increase timeout for this test

  test('should detect silence', async () => {
    const { exec } = require('child_process');
    exec.mockImplementationOnce((command, callback) => {
      callback(null, 'stdout', 'silence_start: 5.0\nsilence_end: 10.0');
    });

    const log = await silenceRemover.detectSilence('input.mp4');
    expect(log).toContain('silence_start');
  }, 10000);
});