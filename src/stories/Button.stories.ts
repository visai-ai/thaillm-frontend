import type { Meta, StoryObj } from "@storybook/nextjs";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    variant: {
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "outline-destructive",
        "ghost",
        "ghost-secondary",
        "ghost-destructive",
        "link",
        "icon",
      ],
      control: { type: "radio" },
    },
    size: {
      options: ["default", "sm", "lg", "icon"],
      control: { type: "radio" },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    variant: "default",
    children: "Button",
    size: "default",
  },
};
