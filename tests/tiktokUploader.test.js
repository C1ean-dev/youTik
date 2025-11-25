const TikTokUploader = require('../src/tiktokUploader');

jest.mock('axios');
jest.mock('fs');
jest.mock('../src/logger');

describe('TikTokUploader', () => {
  let uploader;

  beforeEach(() => {
    uploader = new TikTokUploader();
  });

  test('should get access token', async () => {
    const mockResponse = { data: { access_token: 'token123' } };
    require('axios').post.mockResolvedValue(mockResponse);

    const token = await uploader.getAccessToken();
    expect(token).toBe('token123');
    expect(uploader.accessToken).toBe('token123');
  });

  test('should upload video', async () => {
    uploader.accessToken = 'token123';
    const mockResponse = { data: { success: true } };
    require('axios').post.mockResolvedValue(mockResponse);

    const result = await uploader.uploadVideo('video.mp4', 'Title', ['Caption']);
    expect(result).toEqual({ success: true });
  });
});