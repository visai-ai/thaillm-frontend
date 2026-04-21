import { useId } from "react";
import { Button, ButtonType } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import ModalCircleBG from "@/../public/icons/modal-circle-bg.svg";

import { cva, type VariantProps } from "class-variance-authority";

const modalVariants = cva(
  "rounded-full flex justify-center items-center border-8 pointer-events-none",
  {
    variants: {
      variant: {
        default: "border-gray-50 bg-gray-100 text-gray-600",
        alert: "border-error-50 bg-error-100 text-error-600",
        warning: "border-warning-50 bg-warning-100 text-warning-600",
        success: "border-success-50 bg-success-100 text-success-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type DialogProps = {
  children?: React.ReactNode;
  title: React.ReactElement | string;
  description?: React.ReactElement | string;
  body?: React.ReactElement;
  footer?: React.ReactElement;
  icon?: LucideIcon;
  showCloseButton?: boolean;
  className?: string;
  titleClassName?: string;
} & React.ComponentProps<typeof DialogPrimitive.Root> &
  VariantProps<typeof modalVariants>;

const CustomTriggerModal = ({
  title,
  description = "",
  children,
  body,
  footer,
  icon: Icon,
  showCloseButton = true,
  titleClassName,
  className,
  variant,
  ...props
}: DialogProps) => {
  const dialogId = useId();
  return (
    <Dialog key={dialogId} {...props}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn(className)}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className={cn(Icon ? "pt-16" : "")}>
          {Icon && (
            <>
              <ModalCircleBG className="absolute top-0 left-0 w-[210px] h-[210px] z-[-1]" />
              <div
                className={cn(
                  "top-6 left-4 md:left-6 absolute w-12 h-12 ",
                  modalVariants({ variant }),
                )}
              >
                <Icon className="size-5" />
              </div>
            </>
          )}
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody>{body}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};

type ModalProps = {
  title: React.ReactElement | string;
  description?: React.ReactElement | string;
  body?: React.ReactElement;
  footer?: React.ReactElement;

  showCloseButton?: boolean;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  icon?: LucideIcon;
  iconShape?: "circle" | "square";
  maskClosable?: boolean;
} & React.ComponentProps<typeof DialogPrimitive.Root> &
  VariantProps<typeof modalVariants>;

const Modal = ({
  title,
  description = "",
  body,
  footer,
  icon: Icon,
  iconShape = "circle",
  className,
  variant,
  titleClassName,
  descriptionClassName,
  showCloseButton = true,
  maskClosable = true,
  ...props
}: ModalProps) => {
  const dialogId = useId();
  return (
    <Dialog key={dialogId} {...props}>
      <DialogContent
        className={cn("w-full max-w-[460px]", className)}
        showCloseButton={showCloseButton}
        {...(!maskClosable
          ? {
              onInteractOutside: (e) => e.preventDefault(),
              onEscapeKeyDown: (e) => e.preventDefault(),
            }
          : {})}
      >
        <DialogHeader className={cn(Icon ? "pt-16" : "")}>
          <ModalCircleBG className="absolute top-0 left-0 w-[210px] h-[210px] z-[-1]" />
          {Icon && (
            <>
              <div
                className={cn(
                  "top-6 left-4 md:left-6 absolute w-12 h-12",
                  iconShape === "circle"
                    ? modalVariants({ variant })
                    : "rounded-[10px] border border-gray-200 flex items-center justify-center",
                )}
              >
                <Icon className="size-5" />
              </div>
            </>
          )}
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
          <DialogDescription
            className={cn("whitespace-pre-line", descriptionClassName)}
          >
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>{body}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};

const CloseModalButton = ({
  children,
  ...props
}: { children: React.ReactNode } & ButtonType) => {
  return (
    <DialogClose asChild>
      <Button {...props}>{children}</Button>
    </DialogClose>
  );
};

export { CloseModalButton, CustomTriggerModal, Modal };
