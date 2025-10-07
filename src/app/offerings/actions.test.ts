
import { createOffering, getOffering, getOfferings, updateOffering, deleteOffering } from './actions';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  single: jest.fn(),
  storage: {
    from: jest.fn().mockReturnThis(),
    list: jest.fn(),
    remove: jest.fn(),
  }
};

const mockUser = { id: 'user-123' };
const mockOffering = {
  id: 'offering-123',
  user_id: mockUser.id,
  title: { primary: 'Test Offering', secondary: 'Test' },
  description: { primary: 'Test Description', secondary: 'Test' },
  type: 'Service' as const,
  contextual_notes: 'Notes',
  value_content: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  offering_schedules: [],
  offering_media: [],
};

describe('Offerings Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe('createOffering', () => {
    it('should create a new offering successfully', async () => {
      const offeringData = {
        title: { primary: 'New Offering', secondary: '' },
        description: { primary: 'New Description', secondary: '' },
        type: 'Product' as const,
        contextual_notes: '',
        value_content: null,
        schedules: [],
      };
      mockSupabaseClient.insert.mockResolvedValueOnce({ data: [{...offeringData, id:'new-offering-id', user_id: mockUser.id}], error: null });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: {...offeringData, id:'new-offering-id', user_id: mockUser.id, offering_media:[], offering_schedules:[]}, error: null });


      const result = await createOffering(offeringData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('offerings');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUser.id,
        title: offeringData.title,
      }));
      expect(result).toBeDefined();
      expect(result.id).toBe('new-offering-id');
    });
  });

  describe('getOffering', () => {
    it('should fetch a single offering successfully', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockOffering, error: null });

      const result = await getOffering(mockOffering.id);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('offerings');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*, offering_media (*), offering_schedules (*)');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockOffering.id);
      expect(result).toEqual(mockOffering);
    });
  });

  describe('getOfferings', () => {
    it('should fetch all offerings for a user successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockOffering], error: null }),
      });

      const result = await getOfferings();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('offerings');
      expect(result).toEqual([mockOffering]);
    });
  });

  describe('updateOffering', () => {
    it('should update an existing offering successfully', async () => {
        const updatedData = {
            title: { primary: 'Updated Offering', secondary: 'Updated' },
            description: { primary: 'Updated Description', secondary: 'Updated' },
            type: 'Event' as const,
            contextual_notes: 'Updated notes',
            value_content: null,
            schedules: [],
        };
        mockSupabaseClient.update.mockResolvedValueOnce({ error: null });
        mockSupabaseClient.delete.mockResolvedValueOnce({ error: null });
        mockSupabaseClient.single.mockResolvedValueOnce({ data: { ...mockOffering, ...updatedData }, error: null });

        const result = await updateOffering(mockOffering.id, updatedData);

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('offerings');
        expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({
            title: updatedData.title,
        }));
        expect(result.title.primary).toBe('Updated Offering');
    });
  });

  describe('deleteOffering', () => {
    it('should delete an offering successfully', async () => {
      mockSupabaseClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.delete.mockResolvedValueOnce({ error: null });

      const result = await deleteOffering(mockOffering.id);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('offerings');
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Offering deleted successfully.' });
    });
  });
});
