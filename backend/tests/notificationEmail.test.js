import { jest } from '@jest/globals';
import { sendAdminNotificationEmail } from '../utils.js';
import Settings from '../models/SettingsModel.js';

describe('Admin Notification Email Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should format multiple emails correctly and not throw', async () => {
    // Mock the Settings model
    Settings.findOne = jest.fn().mockResolvedValue({
      key: 'admin_notification_emails',
      value: 'test1@test.com, test2@test.com'
    });

    await expect(sendAdminNotificationEmail('Test Subject', 'Test Text')).resolves.not.toThrow();
    expect(Settings.findOne).toHaveBeenCalledWith({ key: 'admin_notification_emails' });
  });

  it('should use default emails if no setting is found', async () => {
    Settings.findOne = jest.fn().mockResolvedValue(null);

    await expect(sendAdminNotificationEmail('Default Subject', 'Default Text')).resolves.not.toThrow();
    expect(Settings.findOne).toHaveBeenCalledWith({ key: 'admin_notification_emails' });
  });
});
