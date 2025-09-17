
"use client";

import {
    ComponentConfig,
  } from "@measured/puck";
import { Button } from "@/components/ui/button";
  
export const puckComponents: Record<string, ComponentConfig> = {
    Heading: {
      fields: {
        text: { type: "text" },
        level: {
            type: "number",
            min: 1,
            max: 6,
        },
        align: {
            type: "radio",
            options: [
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Right", value: "right" },
            ]
        }
      },
      defaultProps: {
        text: "Heading",
        level: 1,
        align: "left",
      },
      render: ({ level = 1, text, align }) => {
        const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
        return <Tag style={{ textAlign: align as any }}>{text}</Tag>;
      },
    },
    Text: {
        fields: {
            text: { type: "textarea" },
            align: {
                type: "radio",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                ]
            }
        },
        defaultProps: {
            text: "This is some text. It can be short, or it can be long.",
            align: "left",
        },
        render: ({ text, align }) => {
            return <p style={{ textAlign: align as any }}>{text}</p>;
        }
    },
    Button: {
        fields: {
            label: { type: "text" },
            href: { type: "text" },
        },
        defaultProps: {
            label: "Click me",
            href: "#",
        },
        render: ({ label, href }) => {
            return <Button asChild><a href={href}>{label}</a></Button>
        }
    },
  };
  
  export const puckCategories: Record<string, string[]> = {
    Typography: ["Heading", "Text"],
    Actions: ["Button"],
  };
