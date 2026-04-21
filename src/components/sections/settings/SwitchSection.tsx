import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

interface SwitchConfig {
  name: string;
  label: string;
  description?: string;
  disabled?: boolean;
  statusText?: string;
}

interface SwitchSectionProps<T extends FieldValues> {
  id: string;
  control: Control<T>;
  configs: SwitchConfig[];
}

const SwitchSection = <T extends Record<string, any>>({
  id,
  control,
  configs,
}: SwitchSectionProps<T>) => {
  return (
    <div className="flex flex-col gap-4">
      {configs.map(
        ({ name, label, description, disabled, statusText }, index) => (
          <div
            key={name}
            className="flex items-start gap-3 cursor-pointer w-full"
          >
            <Controller
              name={name as Path<T>}
              control={control}
              render={({ field }) => {
                return (
                  <>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      id={`${id}-${name}-${index}`}
                      className="cursor-pointer"
                      disabled={disabled}
                    />
                    <Label
                      htmlFor={`${id}-${name}-${index}`}
                      className={
                        "cursor-pointer flex flex-col items-start gap-0"
                      }
                    >
                      <div className="text-sm h-5 flex items-center gap-2">
                        {label}
                      </div>
                      {description && (
                        <div className="text-sm text-gray-600">
                          {description}
                        </div>
                      )}
                      {statusText && (
                        <div className={`text-xs text-gray-500`}>
                          {statusText}
                        </div>
                      )}
                    </Label>
                  </>
                );
              }}
            />
          </div>
        ),
      )}
    </div>
  );
};

export default SwitchSection;
