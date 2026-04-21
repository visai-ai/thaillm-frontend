import Breadcrumb, { BreadcrumbProps } from "@/components/common/Breadcrumb";
import { cn } from "@/lib/utils";
import { PADDING_X_LAYOUT } from "@/constant/common";

type SubPageLayoutProps = Readonly<{
  children: React.ReactNode;
}> &
  BreadcrumbProps & { className?: string };

const SubPageLayout = ({
  children,
  className,
  ...props
}: SubPageLayoutProps) => {
  return (
    <div className="flex flex-col gap-5 overflow-hidden w-full xl:py-8 md:py-6 py-4">
      <div className={cn(PADDING_X_LAYOUT)}>
        <Breadcrumb {...props} />
      </div>
      <div
        className={cn("grow overflow-auto flex", PADDING_X_LAYOUT, className)}
      >
        {children}
      </div>
    </div>
  );
};

export default SubPageLayout;
