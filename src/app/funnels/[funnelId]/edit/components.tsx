
'use client';

import type { Config } from '@measured/puck';
import { Button } from '@/components/ui/button';

type HeroProps = {
    title: string;
    description: string;
};

type TextProps = {
    text: string;
    align: 'left' | 'center' | 'right';
};

type ButtonProps = {
    label: string;
    onClick?: () => void;
};

// Define your custom components
const Hero = ({ title, description }: HeroProps) => {
    return (
        <div className="text-center py-20 px-4 bg-primary/10 rounded-lg">
            <h1 className="text-5xl font-bold">{title}</h1>
            <p className="text-xl mt-4 max-w-2xl mx-auto text-muted-foreground">{description}</p>
        </div>
    );
};

const Text = ({ text, align }: TextProps) => {
    return (
        <p className="py-4" style={{ textAlign: align }}>
            {text}
        </p>
    );
};

const CustomButton = ({ label, onClick }: ButtonProps) => {
    return <Button onClick={onClick}>{label}</Button>;
};


export const config: Config = {
    components: {
        Hero: {
            fields: {
                title: { type: 'text' },
                description: { type: 'textarea' },
            },
            defaultProps: {
                title: 'Hero Title',
                description: 'This is a hero description. Describe your offering.',
            },
            render: ({ title, description }) => <Hero title={title} description={description} />,
        },
        Text: {
            fields: {
                text: { type: 'textarea' },
                align: {
                    type: 'radio',
                    options: [
                        { label: 'Left', value: 'left' },
                        { label: 'Center', value: 'center' },
                        { label: 'Right', value: 'right' },
                    ],
                },
            },
            defaultProps: {
                text: 'This is some text. Use it to explain your features, benefits, or anything else.',
                align: 'left',
            },
            render: ({ text, align }) => <Text text={text} align={align} />,
        },
        Button: {
            fields: {
                label: { type: 'text' },
            },
            defaultProps: {
                label: 'Click Me',
            },
            render: ({ label, onClick }) => <CustomButton label={label} onClick={onClick} />,
        },
    },
     root: {
        fields: {
            title: {
                type: "text"
            }
        }
    }
};
