
"use client";

import { useNode, useEditor } from "@craftjs/core";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label";

export const CjsText = ({ text, fontSize }: {text: string, fontSize: number}) => {
    const { connectors: { connect, drag } } = useNode();
    return (
        <div ref={ref => connect(drag(ref as any))}>
            <p style={{ fontSize: `${fontSize}px` }}>{text}</p>
        </div>
    );
};

const CjsTextSettings = () => {
  const { actions: { setProp }, props } = useNode(node => ({
    props: node.data.props,
  }));

  return (
    <div className="p-4 space-y-4">
        <div className="space-y-2">
            <Label>Font Size</Label>
            <Slider
                defaultValue={[props.fontSize]}
                onValueChange={(value) => setProp(props => props.fontSize = value[0])}
                max={50}
                step={1}
            />
        </div>
        <div className="space-y-2">
             <Label>Text</Label>
             <input
                type="text"
                value={props.text}
                onChange={(e) => setProp(props => props.text = e.target.value)}
                className="w-full p-2 border rounded"
             />
        </div>
    </div>
  );
}

CjsText.craft = {
  props: {
    text: "Hi",
    fontSize: 20
  },
  related: {
    settings: CjsTextSettings
  }
};


export const CjsButton = ({ size, text }: {size: "small" | "medium" | "large", text: string}) => {
    const { connectors: { connect, drag } } = useNode();
    return (
        <ShadcnButton ref={ref => connect(drag(ref as any))} size={size}>
            {text}
        </ShadcnButton>
    )
}


export const CjsContainer = ({ background, padding, children }: {background: string, padding: number, children: React.ReactNode}) => {
    const { connectors: { connect, drag } } = useNode();
    return (
        <div ref={ref => connect(drag(ref as any))} style={{ background, padding: `${padding}px`}}>
            {children}
        </div>
    )
}
