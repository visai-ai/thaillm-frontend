import { useId } from "react";

import {
  useFormContext,
  useWatch,
  Controller,
  useFieldArray,
} from "react-hook-form";
import {
  MEAL_PERIOD,
  MEAL_PERIOD_LIST,
  MEAL_TIMING,
  MEAL_TIMING_LIST,
  REPEAT_TYPE,
  REPEAT_TYPE_LIST,
  RepeatTypeKey,
} from "@/constant/medicalReminder";
import { MedicineRepeatSchemaValues } from "@/lib/schema/medicalReminderSchema";
import { DAY_OF_WEEK_LIST, DAY_OF_WEEK } from "@/constant/common";
import { cn } from "@/lib/utils";

import TextDropdown from "@/components/common/TextDropdown";
import { Input } from "@/components/common/CustomInput";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Checkbox } from "@/components/ui/checkbox";
import TimePicker from "@/components/common/TimePicker";
import { Button } from "@/components/ui/button";

import { CheckIcon, ClockIcon } from "lucide-react";

const ScheduleMedicineReminderForm = ({ unit }: { unit?: string }) => {
  const medicineConsumeDetailFormId = useId();
  const mealTimingSelectionId = useId();
  const {
    setValue,
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<MedicineRepeatSchemaValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "mealPeriod",
  });

  const repeatType = useWatch({
    name: "repeatType",
  });
  const mealTiming = useWatch({
    name: "mealTiming",
  });
  const mealPeriod = useWatch({ name: "mealPeriod" });
  const dosePerTime = watch("dosePerTime");

  const handleSelectRepeatType = (label: string) => {
    setValue("repeatType", label as RepeatTypeKey, { shouldDirty: true });
  };

  return (
    <form id={medicineConsumeDetailFormId} className="">
      <section className="space-y-2 pb-5 border-b border-gray-200">
        <TextDropdown
          selectedItem={repeatType || ""}
          items={REPEAT_TYPE_LIST}
          handleSetSelectedItem={handleSelectRepeatType}
          label="ความถี่ในการทาน/ใช้ยา"
          requiredLabel={true}
          getFormatText={(item) => REPEAT_TYPE[item as RepeatTypeKey]}
          hint={errors.repeatType?.message}
          variant={errors.repeatType ? "error" : "default"}
        />
        {repeatType === "weekly" && (
          <Controller
            control={control}
            name="dayOfWeeks"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-2">
                  {DAY_OF_WEEK_LIST.map((weekDay) => {
                    const isSelected = field.value?.includes(weekDay);
                    return (
                      <div
                        key={weekDay}
                        className={cn(
                          "flex items-center cursor-pointer gap-1.5 text-gray-700 group py-1 px-2.5 border border-gray-300 text-left text-sm font-medium rounded-md",
                          isSelected ? "" : "bg-white hover:bg-gray-50",
                        )}
                        onClick={() => {
                          const newValue = !isSelected
                            ? [...(field.value || []), weekDay]
                            : (field.value || []).filter((d) => d !== weekDay);
                          field.onChange(newValue);
                        }}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center border border-gray-300 w-[18px] h-[18px] rounded",
                            isSelected
                              ? "bg-primary-600"
                              : "group-hover:bg-primary-50",
                          )}
                        >
                          {isSelected && (
                            <CheckIcon className="size-3.5 text-white" />
                          )}
                        </div>
                        <span>{DAY_OF_WEEK[weekDay]}</span>
                      </div>
                    );
                  })}
                </div>
                {errors.dayOfWeeks?.message && (
                  <p className="text-sm text-error-600 mt-0.5">
                    {errors.dayOfWeeks.message}
                  </p>
                )}
              </div>
            )}
          />
        )}
        {repeatType === "monthly" && (
          <Controller
            control={control}
            name="dateInMonths"
            render={({ field }) => (
              <Input
                type="text"
                label="ทุกๆ วันที่"
                placeholder="ระบุวันที่ของเดือน"
                value={
                  field.value === undefined || field.value === null
                    ? ""
                    : String(field.value)
                }
                onChange={(e) => {
                  // Only allow digits
                  const numberStr = e.target.value.replace(/[^0-9]/g, "");
                  // If empty, set value as undefined (or empty string)
                  if (numberStr === "") {
                    field.onChange(undefined);
                  } else {
                    // Parse as number if possible, or keep empty, to make sure zod gets number not string
                    const numberValue = Number(numberStr);
                    field.onChange(
                      isNaN(numberValue) ? undefined : numberValue,
                    );
                  }
                }}
                containerClassName="max-w-[288px]"
                requiredLabel={true}
                inputMode="numeric"
                pattern="\d*"
                hint={errors?.dateInMonths?.message?.toString()}
                variant={
                  errors?.dateInMonths !== undefined ? "error" : "default"
                }
              />
            )}
          />
        )}
      </section>
      <section className="grid grid-cols-2 gap-2 border-b border-gray-200 py-5">
        <div
          className={cn(
            "flex flex-col gap-2",
            mealTiming && "border-r border-gray-200",
          )}
        >
          <Label htmlFor={mealTimingSelectionId}>
            <span>
              เวลาทาน/ใช้ยา<span className="text-red-500">*</span>
            </span>
          </Label>
          <Controller
            key={`mealTiming`}
            name={`mealTiming`}
            control={control}
            render={({ field }) => (
              <RadioGroup
                id={mealTimingSelectionId}
                onValueChange={field.onChange}
                value={field.value ?? ""}
              >
                {MEAL_TIMING_LIST.map((meal, index) => {
                  return (
                    <div key={index} className="group flex items-center gap-2">
                      <RadioGroupItem value={meal} id={`${meal}-${index}`} />
                      <Label htmlFor={`${meal}-${index}`}>
                        {MEAL_TIMING[meal]}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          />
          {errors.mealTiming?.message && (
            <p className="text-sm text-error-600 mt-0.5">
              {errors.mealTiming.message}
            </p>
          )}
        </div>

        {mealTiming && (
          <div className="flex flex-col gap-2 sm:gap-0.5">
            {MEAL_PERIOD_LIST.map((period, index) => {
              const selectedTiming = fields.find(
                (mealPeriod: {
                  period: string;
                  hour: string;
                  minute: string;
                }) => mealPeriod.period === period,
              );
              const isSelected = selectedTiming !== undefined;
              const fieldIndex = fields.findIndex(
                (field: any) => field.period === period,
              );

              const displayHour = mealPeriod?.[fieldIndex]?.hour;
              const displayMinute = mealPeriod?.[fieldIndex]?.minute;

              return (
                <div
                  key={index}
                  className="flex sm:items-center sm:justify-between gap-2 flex-col sm:flex-row w-fit sm:w-full"
                >
                  <Controller
                    control={control}
                    name="mealPeriod"
                    render={() => (
                      <div className="flex items-center break-inside-avoid gap-2 group">
                        <Checkbox
                          id={`${period}-${index}`}
                          checked={isSelected}
                          onCheckedChange={() => {
                            if (isSelected) {
                              const index = fields.findIndex(
                                (field: any) => field.period === period,
                              );

                              if (index !== -1) {
                                remove(index);
                              }
                            } else {
                              let hour = "08";
                              let minute = "00";
                              if (period === "breakfast") {
                                hour = "08";
                              } else if (period === "lunch") {
                                hour = "12";
                              } else if (period === "dinner") {
                                hour = "16";
                              } else if (period === "bedtime") {
                                hour = "22";
                              }
                              append({ period, hour, minute });
                            }
                          }}
                        />
                        <Label htmlFor={`${period}-${index}`}>
                          {MEAL_PERIOD[period]}
                        </Label>
                      </div>
                    )}
                  />

                  {isSelected && fieldIndex !== -1 ? (
                    <TimePicker
                      align="center"
                      selectedTime={{
                        hour: selectedTiming.hour,
                        minute: selectedTiming.minute,
                      }}
                      handleSetSelectedTime={(time) => {
                        setValue(`mealPeriod.${fieldIndex}.hour`, time.hour);
                        setValue(
                          `mealPeriod.${fieldIndex}.minute`,
                          time.minute,
                        );
                      }}
                    >
                      <Button className="" variant={`secondary`} size={`sm`}>
                        <ClockIcon />

                        {displayHour && displayMinute
                          ? `${displayHour}:${displayMinute}`
                          : "เลือกเวลา"}
                      </Button>
                    </TimePicker>
                  ) : (
                    <div className="sm:h-9"></div>
                  )}
                </div>
              );
            })}

            {errors.mealPeriod?.message && (
              <p className="text-sm text-error-600 mt-0.5">
                {errors.mealPeriod.message}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="py-5">
        <Input
          type="text"
          label="ทาน/ใช้ยาจำนวนครั้งละ"
          placeholder="ระบุจำนวนครั้ง"
          {...register("dosePerTime")}
          required={true}
          requiredLabel={true}
          suffixElement={
            unit && (
              <div className="text-gray-500 flex justify-center items-center pr-3.5 shrink-0">
                {unit}
              </div>
            )
          }
          hint={errors?.dosePerTime?.message}
          variant={errors?.dosePerTime ? "error" : "default"}
          maxLength={5}
        />
      </section>
    </form>
  );
};

export default ScheduleMedicineReminderForm;
