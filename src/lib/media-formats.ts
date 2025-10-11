export interface AspectRatio {
  value: string;
  label: string;
}

export interface MediaFormat {
  value: string;
  label: string;
  channels: string[];
  aspect_ratios: AspectRatio[];
}

export interface MediaFormatCategory {
  label: string;
  formats: MediaFormat[];
}

export const mediaFormatConfig: MediaFormatCategory[] = [
    {
        label: "Visuals",
        formats: [
            {
                value: 'Image',
                label: 'Image',
                channels: ['instagram', 'facebook', 'linkedin', 'twitter'],
                aspect_ratios: [
                    { value: '1:1', label: '1:1 (Square)' },
                    { value: '4:5', label: '4:5 (Portrait)' },
                    { value: '9:16', label: '9:16 (Story)' },
                    { value: '16:9', label: '16:9 (Landscape)' },
                ]
            },
            {
                value: 'Video',
                label: 'Video',
                channels: ['instagram', 'facebook', 'tiktok', 'linkedin', 'website', 'youtube', 'twitter'],
                aspect_ratios: [
                    { value: '9:16', label: '9:16 (Reel/Short)' },
                    { value: '1:1', label: '1:1 (Square)' },
                    { value: '16:9', label: '16:9 (Landscape)' },
                ]
            },
            {
                value: 'Carousel',
                label: 'Carousel (3-5 slides)',
                channels: ['instagram', 'facebook', 'linkedin'],
                aspect_ratios: [
                    { value: '1:1', label: '1:1 (Square)' },
                    { value: '4:5', label: '4:5 (Portrait)' },
                ]
            },
        ]
    },
    {
        label: "Text & Communication",
        formats: [
            { value: 'Text Post', label: 'Text Post', channels: ['instagram', 'facebook', 'linkedin', 'twitter', 'threads'], aspect_ratios: [] },
            { value: 'Newsletter', label: 'Newsletter', channels: ['webmail'], aspect_ratios: [] },
            { value: 'Promotional Email', label: 'Promotional Email', channels: ['webmail'], aspect_ratios: [] },
            { value: 'Blog Post', label: 'Blog Post', channels: ['website'], aspect_ratios: [] },
            { value: 'Landing Page', label: 'Landing Page', channels: ['website'], aspect_ratios: [] },
            { value: 'Text Message', label: 'Text Message', channels: ['whatsapp', 'telegram'], aspect_ratios: [] },
        ]
    }
];

export const getAvailableAspectRatios = (formatValue: string): AspectRatio[] => {
    for (const category of mediaFormatConfig) {
        const format = category.formats.find(f => f.value === formatValue);
        if (format) {
            return format.aspect_ratios;
        }
    }
    return [];
};