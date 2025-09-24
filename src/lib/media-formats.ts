
export const mediaFormatConfig = [
    { 
        label: "Image", 
        formats: [ 
            { value: '1:1 Square Image', channels: ['instagram', 'facebook'] }, 
            { value: '4:5 Portrait Image', channels: ['instagram', 'facebook'] }, 
            { value: '9:16 Story Image', channels: ['instagram', 'facebook'] }, 
        ] 
    },
    { 
        label: "Video", 
        formats: [ 
            { value: '9:16 Reel/Short', channels: ['instagram', 'facebook', 'tiktok', 'linkedin'] }, 
            { value: '1:1 Square Video', channels: ['instagram', 'facebook', 'linkedin'] }, 
            { value: '16:9 Landscape Video', channels: ['facebook', 'linkedin', 'website'] }, 
        ] 
    },
    { 
        label: "Text & Communication", 
        formats: [ 
            { value: 'Text Post', channels: ['instagram', 'facebook', 'linkedin', 'twitter'] },
            { value: 'Carousel (3-5 slides)', channels: ['instagram', 'facebook', 'linkedin'] }, 
            { value: 'Newsletter', channels: ['webmail'] }, 
            { value: 'Promotional Email', channels: ['webmail'] }, 
            { value: 'Blog Post', channels: ['website'] }, 
            { value: 'Landing Page', channels: ['website'] }, 
            { value: 'Text Message', channels: ['whatsapp', 'telegram'] }, 
        ] 
    }
];

export const getFormatsForChannel = (channel: string): string[] => {
    const channelLower = channel.toLowerCase();
    return mediaFormatConfig.flatMap(category => 
        category.formats
            .filter(format => format.channels.includes(channelLower))
            .map(format => format.value)
    );
};
