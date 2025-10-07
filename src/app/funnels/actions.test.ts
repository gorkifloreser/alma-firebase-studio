import {
    getFunnels,
    getFunnel,
    createFunnel,
    updateFunnel,
    deleteFunnel,
    saveMediaPlan,
    deleteMediaPlan,
    archiveMediaPlan,
    getFunnelPresets,
    saveCustomFunnelPreset,
    updateCustomFunnelPreset,
    deleteCustomFunnelPreset,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock next/cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

const mockSupabaseClient = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(),
};

const mockUser = { id: 'user-123' };
const mockFunnel = {
    id: 'funnel-123',
    user_id: mockUser.id,
    offering_id: 'offering-123',
    name: 'Test Funnel',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    preset_id: 1,
    goal: 'Test Goal',
    strategy_brief: {},
    offerings: { id: 'offering-123', title: { primary: 'Test Offering' } },
    media_plans: [],
};

const mockMediaPlan = {
    id: 'media-plan-123',
    funnel_id: 'funnel-123',
    user_id: mockUser.id,
    title: 'Test Media Plan',
    status: 'active' as const,
    campaign_start_date: new Date().toISOString(),
    campaign_end_date: new Date().toISOString(),
    media_plan_items: [],
};

const mockFunnelPreset = {
    id: 1,
    user_id: null,
    type: 'default',
    title: 'Default Preset',
    description: 'A default preset',
    best_for: 'Everything',
    principles: 'Simplicity',
};

describe('Funnels and Media Plan Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
        mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    });

    // Funnel Tests
    describe('getFunnels', () => {
        it('should fetch all funnels for a user', async () => {
            const mockOrder = jest.fn().mockResolvedValue({ data: [mockFunnel], error: null });
            const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
            const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ select: mockSelect });
            const funnels = await getFunnels();
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('funnels');
            expect(funnels).toEqual([mockFunnel]);
        });
    });

    describe('getFunnel', () => {
        it('should fetch a single funnel', async () => {
            const mockSingle = jest.fn().mockResolvedValue({ data: mockFunnel, error: null });
            const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
            const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
            const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ select: mockSelect });
            const funnel = await getFunnel('funnel-123');
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('funnels');
            expect(funnel.data).toEqual(mockFunnel);
        });
    });

    describe('createFunnel', () => {
        it('should create a new funnel', async () => {
            const newFunnelData = {
                presetId: 1,
                offeringId: 'offering-123',
                name: 'New Funnel',
                goal: 'New Goal',
                strategyBrief: {},
            };
            const mockSingle = jest.fn().mockResolvedValue({ data: { ...newFunnelData, id: 'new-funnel-id', user_id: mockUser.id }, error: null });
            const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
            const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ insert: mockInsert });
            const result = await createFunnel(newFunnelData);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('funnels');
            expect(result.id).toBe('new-funnel-id');
        });
    });

    describe('updateFunnel', () => {
        it('should update an existing funnel', async () => {
            const updates = { name: 'Updated Funnel' };
            const mockSingle = jest.fn().mockResolvedValue({ data: { ...mockFunnel, ...updates }, error: null });
            const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
            const mockEq2 = jest.fn().mockReturnValue({ select: mockSelect });
            const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
            const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ update: mockUpdate });
            const result = await updateFunnel('funnel-123', updates);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('funnels');
            expect(result.name).toBe('Updated Funnel');
        });
    });

    describe('deleteFunnel', () => {
        it('should delete a funnel', async () => {
            const mockEq2 = jest.fn().mockResolvedValue({ error: null });
            const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
            const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ delete: mockDelete });
            const result = await deleteFunnel('funnel-123');
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('funnels');
            expect(result).toEqual({ message: 'Funnel deleted successfully.' });
        });
    });

    // Media Plan Tests
    describe('saveMediaPlan', () => {
        it('should create a new media plan if no id is provided', async () => {
            const planItems = [{ user_channel_settings: { channel_name: 'email' }, format: 'newsletter' }];
            const mockSingle1 = jest.fn().mockResolvedValueOnce({ data: { offering_id: 'offering-123' }, error: null });
            const mockEq1 = jest.fn().mockReturnValue({ single: mockSingle1 });
            const mockSelect1 = jest.fn().mockReturnValue({ eq: mockEq1 });
            const mockSingle2 = jest.fn().mockResolvedValueOnce({ data: { id: 'new-media-plan-id' }, error: null });
            const mockSelect2 = jest.fn().mockReturnValue({ single: mockSingle2 });
            const mockInsert1 = jest.fn().mockReturnValue({ select: mockSelect2 });
            const mockUpsert1 = jest.fn().mockResolvedValue({ error: null });
            const mockSingle3 = jest.fn().mockResolvedValueOnce({ data: { ...mockMediaPlan, id: 'new-media-plan-id' }, error: null });
            const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle3 });
            const mockSelect3 = jest.fn().mockReturnValue({ eq: mockEq2 });
            (mockSupabaseClient.from as jest.Mock)
                .mockReturnValueOnce({ select: mockSelect1 })
                .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ data: [{ id: 1, channel_name: 'email' }], error: null }) })
                .mockReturnValueOnce({ insert: mockInsert1 })
                .mockReturnValueOnce({ upsert: mockUpsert1 })
                .mockReturnValueOnce({ select: mockSelect3 });

            const result = await saveMediaPlan({
                id: null,
                funnelId: 'funnel-123',
                title: 'New Media Plan',
                planItems: planItems as any,
                startDate: null,
                endDate: null,
            });

            expect(result.id).toBe('new-media-plan-id');
        });

        it('should update an existing media plan if id is provided', async () => {
            const planItems = [{ id: 'item-1', user_channel_settings: { channel_name: 'email' }, format: 'newsletter' }];
            const mockSingle1 = jest.fn().mockResolvedValueOnce({ data: { offering_id: 'offering-123' }, error: null });
            const mockEq1 = jest.fn().mockReturnValue({ single: mockSingle1 });
            const mockSelect1 = jest.fn().mockReturnValue({ eq: mockEq1 });
            const mockUpdate1 = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
            const mockUpsert1 = jest.fn().mockResolvedValue({ error: null });
            const mockSingle2 = jest.fn().mockResolvedValueOnce({ data: { ...mockMediaPlan, title: 'Updated Media Plan' }, error: null });
            const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle2 });
            const mockSelect2 = jest.fn().mockReturnValue({ eq: mockEq2 });
            (mockSupabaseClient.from as jest.Mock)
                .mockReturnValueOnce({ select: mockSelect1 })
                .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ data: [{ id: 1, channel_name: 'email' }], error: null }) })
                .mockReturnValueOnce({ update: mockUpdate1 })
                .mockReturnValueOnce({ upsert: mockUpsert1 })
                .mockReturnValueOnce({ select: mockSelect2 });

            const result = await saveMediaPlan({
                id: 'media-plan-123',
                funnelId: 'funnel-123',
                title: 'Updated Media Plan',
                planItems: planItems as any,
                startDate: null,
                endDate: null,
            });

            expect(result.title).toBe('Updated Media Plan');
        });

        it('should throw an error if channel ID is not found', async () => {
            const planItems = [{ user_channel_settings: { channel_name: 'nonexistent' } }];
            const mockSingle1 = jest.fn().mockResolvedValueOnce({ data: { offering_id: 'offering-123' }, error: null });
            const mockEq1 = jest.fn().mockReturnValue({ single: mockSingle1 });
            const mockSelect1 = jest.fn().mockReturnValue({ eq: mockEq1 });
            (mockSupabaseClient.from as jest.Mock)
                .mockReturnValueOnce({ select: mockSelect1 })
                .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ data: [{ id: 1, channel_name: 'email' }], error: null }) });

            await expect(saveMediaPlan({
                id: 'media-plan-123',
                funnelId: 'funnel-123',
                title: 'Test Plan',
                planItems: planItems as any,
                startDate: null,
                endDate: null,
            })).rejects.toThrow('Could not find a channel ID for channel name: "nonexistent". Please ensure the channel is set up correctly.');
        });
    });

    describe('deleteMediaPlan', () => {
        it('should delete a media plan', async () => {
            const mockEq2 = jest.fn().mockResolvedValue({ data: [], error: null });
            const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
            const mockSelect1 = jest.fn().mockReturnValue({ eq: mockEq1 });
            const mockDelete1 = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
            (mockSupabaseClient.from as jest.Mock)
                .mockReturnValueOnce({ select: mockSelect1 })
                .mockReturnValueOnce({ delete: mockDelete1 });
            const result = await deleteMediaPlan('media-plan-123');
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_plans');
            expect(result).toEqual({ message: 'Media plan deleted successfully.' });
        });
    });

    describe('archiveMediaPlan', () => {
        it('should archive a media plan', async () => {
            const mockSingle = jest.fn().mockResolvedValue({ data: { ...mockMediaPlan, status: 'archived' }, error: null });
            const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
            const mockEq2 = jest.fn().mockReturnValue({ select: mockSelect });
            const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
            const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ update: mockUpdate });
            const result = await archiveMediaPlan('media-plan-123');
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_plans');
            expect(result.status).toBe('archived');
        });
    });

    // Funnel Preset Tests
    describe('getFunnelPresets', () => {
        it('should fetch all funnel presets', async () => {
            const mockOrder = jest.fn().mockResolvedValue({ data: [mockFunnelPreset], error: null });
            const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ select: mockSelect });
            const presets = await getFunnelPresets();
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('funnel_presets');
            expect(presets).toEqual([mockFunnelPreset]);
        });
    });

    describe('saveCustomFunnelPreset', () => {
        it('should save a custom funnel preset', async () => {
            const newPreset = { title: 'Custom', description: 'Custom desc', best_for: 'custom', principles: 'custom' };
            const mockSingle = jest.fn().mockResolvedValue({ data: { ...newPreset, id: 2, user_id: mockUser.id }, error: null });
            const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
            const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ insert: mockInsert });
            const result = await saveCustomFunnelPreset(newPreset);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('funnel_presets');
            expect(result.id).toBe(2);
        });
    });

    describe('updateCustomFunnelPreset', () => {
        it('should update a custom funnel preset', async () => {
            const updates = { title: 'Updated Custom' };
            const mockSingle = jest.fn().mockResolvedValue({ data: { ...mockFunnelPreset, ...updates, user_id: mockUser.id }, error: null });
            const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
            const mockEq2 = jest.fn().mockReturnValue({ select: mockSelect });
            const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
            const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ update: mockUpdate });
            const result = await updateCustomFunnelPreset(2, { ...mockFunnelPreset, ...updates } as any);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('funnel_presets');
            expect(result.title).toBe('Updated Custom');
        });
    });

    describe('deleteCustomFunnelPreset', () => {
        it('should delete a custom funnel preset', async () => {
            const mockEq2 = jest.fn().mockResolvedValue({ error: null });
            const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
            const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
            (mockSupabaseClient.from as jest.Mock).mockReturnValue({ delete: mockDelete });
            const result = await deleteCustomFunnelPreset(2);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('funnel_presets');
            expect(result).toEqual({ message: 'Custom funnel preset deleted successfully.' });
        });
    });
});