const SlidingWindowDivider = require('../src/slidingWindowDivider');

jest.mock('fluent-ffmpeg');
jest.mock('ffmpeg-static');
jest.mock('../src/logger');

describe('SlidingWindowDivider', () => {
  let divider;

  beforeEach(() => {
    divider = new SlidingWindowDivider();
  });

  test('should calculate segments correctly', () => {
    const segments = divider.calculateSegments(600); // 10 minutes
    expect(segments).toHaveLength(10);
    expect(segments[0]).toEqual({ start: 0, end: 60 });
    expect(segments[1]).toEqual({ start: 54, end: 114 });
  });

  test('should get video duration', async () => {
    const mockFfprobe = jest.fn((input, callback) => {
      callback(null, { format: { duration: 120 } });
    });

    require('fluent-ffmpeg').ffprobe = mockFfprobe;

    const duration = await divider.getVideoDuration('input.mp4');
    expect(duration).toBe(120);
  });
});