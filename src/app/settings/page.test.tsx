
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from './page';
import * as actions from './actions';
import { useToast } from '@/hooks/use-toast';

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
  })),
}));

jest.mock('./actions');
const mockedUpdateProfile = actions.updateProfile as jest.Mock;
const mockedGetProfile = actions.getProfile as jest.Mock;

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    mockedGetProfile.mockResolvedValue({
      full_name: 'Test User',
      website: 'test.com',
      primary_language: 'en',
      secondary_language: 'es',
      avatar_url: null,
    });
  });

  it('should upload an avatar when a file is selected and the form is submitted', async () => {
    render(<SettingsPage />);

    // Wait for the form to be displayed
    await screen.findByLabelText('Full Name');

    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const avatarInput = screen.getByLabelText('Avatar');

    fireEvent.change(avatarInput, { target: { files: [file] } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockedUpdateProfile).toHaveBeenCalled();
    });

    const formData = mockedUpdateProfile.mock.calls[0][0];
    const uploadedFile = formData.get('avatar') as File;

    expect(uploadedFile).toBeInstanceOf(File);
    expect(uploadedFile.name).toBe('chucknorris.png');
  });
});
