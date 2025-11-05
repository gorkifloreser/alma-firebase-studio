
'use client';

import type { Config as PuckConfig, Data as PuckData } from '@measured/puck';
import { Button } from '@/components/ui/button';

// --- Redefine Data type locally to avoid Puck dependency in server components ---
export type PageData = PuckData;

// --- Component Props ---
type HeroProps = {
    title: string;
    description: string;
};

type TextProps = {
    text: string;
    align: 'left' | 'center' | 'right';
};

type CustomButtonProps = {
    label: string;
    onClick?: () => void;
};

// --- Your Custom Components (Unchanged) ---
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

const CustomButton = ({ label, onClick }: CustomButtonProps) => {
    return <Button onClick={onClick}>{label}</Button>;
};

// --- Config for the Render component ---
// We keep this structure for the Render component to use, but the editor won't use Puck's UI.
export const config: PuckConfig = {
    components: {
        Hero: {
            render: ({ title, description }) => <Hero title={title} description={description} />,
        },
        Text: {
            render: ({ text, align }) => <Text text={text} align={align} />,
        },
        Button: {
            render: ({ label, onClick }) => <CustomButton label={label} onClick={onClick} />,
        },
    },
};


// --- Custom Render Component ---
// This component will map your component types to their actual React components.
export const Render = ({ config, data }: { config: PuckConfig, data: PageData }) => {
    return (
        <div>
            {(data.content || []).map((component, index) => {
                const Component = config.components[component.type]?.render;
                if (!Component) {
                    return <div key={index}>Unknown component: {component.type}</div>;
                }
                return <Component key={index} {...(component.props as any)} />;
            })}
        </div>
    );
};
