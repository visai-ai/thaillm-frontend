import { useId } from "react";

import {
  MEDICINE_CONSUME_SUGGESTIONS,
  MedicineConsumeSuggestionType,
  MEDICINE_UNIT_OPTIONS,
  MedicineUnitType,
} from "@/constant/medicalReminder";

import {
  Controller,
  Control,
  FieldErrors,
  UseFormRegister,
  useFormContext,
} from "react-hook-form";
import {
  MedicalReminderInfoValues,
  getMedicineSuggestionList,
} from "@/lib/schema/medicalReminderSchema";

import { cn } from "@/lib/utils";
import { formatThaiDate } from "@/utils/time";

import { ChevronRightIcon, SearchIcon, CalendarPlus2Icon } from "lucide-react";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/common/DatePicker";
import { Input } from "@/components/common/CustomInput";
import { Switch } from "@/components/ui/switch";
import TextDropdown from "@/components/common/TextDropdown";

const MedicalReminderInfoForm = ({
  showSuggestionOptions,
  handleShowSuggestionOptions,
}: {
  showSuggestionOptions: boolean;
  handleShowSuggestionOptions: (state: boolean) => void;
}) => {
  const formId = useId();
  const notificationFormId = useId();
  const startNotificationDateId = useId();
  const endNotificationDateId = useId();
  const enableNotificationId = useId();

  const {
    setValue,
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<MedicalReminderInfoValues>();

  const suggestionValues = watch("usageSuggestion");
  const unitValue = watch("unit");
  const startNotificationDate = watch("startNotificationDate");
  const endNotificationDate = watch("endNotificationDate");

  const [suggestionSearch, setSuggestionSearch] = useState<string>("");

  const suggestionCheckedValues = getMedicineSuggestionList(suggestionValues);

  const filteredSuggestionSearch = suggestionSearch.trim()
    ? MEDICINE_CONSUME_SUGGESTIONS.filter((suggestion) =>
        suggestion.label.toLowerCase().includes(suggestionSearch.toLowerCase()),
      )
    : MEDICINE_CONSUME_SUGGESTIONS;

  const suggestionsSection = (
    <form id={formId} className="space-y-4">
      {/* search */}
      <Input
        type="text"
        placeholder="ค้นหา"
        value={suggestionSearch}
        prefixElement={
          <div className="flex items-center justify-center pl-3">
            <SearchIcon className="w-5 text-gray-500" />
          </div>
        }
        inputClassName="!ring-transparent"
        onChange={(event) => setSuggestionSearch(event.target.value)}
      />
      <div className="columns-1 md:columns-2">
        {filteredSuggestionSearch.map((suggestion) => {
          return (
            <SuggestionItem
              suggestion={suggestion}
              key={suggestion.key}
              control={control}
              register={register}
              errors={errors}
            />
          );
        })}
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      <form
        className={showSuggestionOptions ? "hidden" : "flex flex-col gap-4"}
        noValidate
      >
        {/* detail input */}
        <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
          {/* medicine name */}
          <Input
            type="text"
            label="ชื่อยา"
            {...register("medicalName")}
            inputClassName="!ring-transparent !h-11"
            requiredLabel={true}
            hint={errors.medicalName?.message}
            variant={errors.medicalName ? "error" : "default"}
          />
          <TextDropdown
            items={[...MEDICINE_UNIT_OPTIONS]}
            selectedItem={unitValue as string}
            handleSetSelectedItem={(item: string) => {
              setValue("unit", item as MedicineUnitType);
            }}
            label="หน่วย"
            dropdownClassName="h-11"
            requiredLabel={true}
            hint={errors.unit?.message}
            variant={errors.unit ? "error" : "default"}
          />
        </div>
        <hr className="border-gray-200" />
        <div className="space-y-2">
          {/* usage suggestion */}
          <div className="flex items-center gap-3 md:flex-row flex-col">
            <div className="text-gray-700 font-medium text-sm">
              ข้อแนะนำการใช้งาน (หากมี)
            </div>
            <Button
              type="button"
              onClick={() => handleShowSuggestionOptions(true)}
              variant={"link"}
              className="ml-auto group"
              size={"sm"}
            >
              เลือกข้อแนะนำการใช้งาน
              <ChevronRightIcon className="group-hover:translate-x-1 transition-all" />
            </Button>
          </div>
          {suggestionCheckedValues.length > 0 ? (
            <div className="text-gray-900">
              {suggestionCheckedValues.join(", ")}
            </div>
          ) : (
            <span className="text-gray-500">ไม่มีข้อแนะนำการใช้งาน</span>
          )}
        </div>
      </form>
      <hr className="border-gray-200" />
      <div className="space-y-4">
        <div className={cn("font-semibold text-gray-900")}>การแจ้งเตือน</div>
        <form
          id={notificationFormId}
          className={showSuggestionOptions ? "hidden" : "flex flex-col gap-5"}
          noValidate
        >
          <section className="space-y-4">
            {/* start notification date */}
            <div className="flex md:flex-row flex-col justify-between gap-3">
              <Label htmlFor={startNotificationDateId} className="gap-0">
                วันที่เริ่มการแจ้งเตือน{" "}
                <span className="text-error-600">*</span>
              </Label>
              <DatePicker
                id={startNotificationDateId}
                selectedDate={startNotificationDate}
                disabled={{ before: new Date() }}
                handleSetSelectedDate={(inputDate: Date | undefined) => {
                  if (inputDate) {
                    setValue("startNotificationDate", inputDate);
                  }
                }}
              >
                <Button
                  type="button"
                  variant={`secondary`}
                  size={`sm`}
                  className="w-fit"
                >
                  <CalendarPlus2Icon className="size-4" />
                  {startNotificationDate ? (
                    <span>{formatThaiDate(startNotificationDate)}</span>
                  ) : (
                    <span>เลือกวันที่</span>
                  )}{" "}
                </Button>
              </DatePicker>
              {errors.startNotificationDate?.message && (
                <p className="text-sm text-error-600 mt-0.5">
                  {errors.startNotificationDate.message}
                </p>
              )}
            </div>
            {/* end notification date */}
            <div className="flex md:flex-row flex-col justify-between gap-3">
              <Label htmlFor={endNotificationDateId} className="gap-0">
                วันที่สิ้นสุดการแจ้งเตือน{" "}
                <span className="text-error-600">*</span>
              </Label>
              <DatePicker
                id={endNotificationDateId}
                selectedDate={endNotificationDate}
                handleSetSelectedDate={(inputDate: Date | undefined) => {
                  if (inputDate) {
                    setValue("endNotificationDate", inputDate);
                  }
                }}
                disabled={{ before: startNotificationDate || new Date() }}
              >
                <Button
                  type="button"
                  variant={`secondary`}
                  size={`sm`}
                  className="w-fit"
                >
                  <CalendarPlus2Icon className="size-4" />
                  {endNotificationDate ? (
                    <span>{formatThaiDate(endNotificationDate)}</span>
                  ) : (
                    <span>เลือกวันที่</span>
                  )}{" "}
                </Button>
              </DatePicker>
              {errors.endNotificationDate?.message && (
                <p className="text-sm text-error-600 mt-0.5">
                  {errors.endNotificationDate.message}
                </p>
              )}
            </div>
          </section>
          <div className="flex items-center gap-3 cursor-pointer w-fit pb-4">
            <Controller
              key={`enableNotification`}
              name={`enableNotification`}
              control={control}
              render={({ field }) => (
                <>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    id={enableNotificationId}
                  />
                  <Label
                    htmlFor={enableNotificationId}
                    className="cursor-pointer"
                  >
                    เปิดใช้งานการแจ้งเตือน
                  </Label>
                </>
              )}
            />
          </div>
        </form>
      </div>
      <section className={showSuggestionOptions ? "" : "hidden"}>
        {suggestionsSection}
      </section>
    </div>
  );
};

interface SuggestionItemProps {
  suggestion: MedicineConsumeSuggestionType;
  control: Control<any>;
  register: UseFormRegister<any>;
  errors: FieldErrors<MedicalReminderInfoValues>;
}

const SuggestionItem = ({
  suggestion,
  control,
  register,
  errors,
}: SuggestionItemProps) => {
  const key = `usageSuggestion.${suggestion.key}` as const;
  const inputKey = suggestion.hasInput ? `${key}.${suggestion.inputKey}` : "";
  const checkedKey = suggestion.hasInput ? `${key}.checked` : key;

  const { trigger } = useFormContext();

  const nested = errors?.usageSuggestion?.[suggestion.key];
  const inputError =
    suggestion.hasInput &&
    suggestion.inputKey &&
    typeof nested === "object" &&
    nested !== null
      ? (nested as Record<string, { message?: string }>)[suggestion.inputKey]
          ?.message
      : undefined;

  return (
    <Controller
      key={checkedKey}
      name={checkedKey as any}
      control={control}
      render={({ field }) => (
        <div className="flex flex-col items-start break-inside-avoid gap-0.5 group px-1 mb-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id={suggestion.key}
              checked={field.value}
              onCheckedChange={(value) => {
                field.onChange(value);
                trigger(`usageSuggestion.${suggestion.key}`);
                if (suggestion.hasInput && suggestion.inputKey) {
                  const fullInputKey = `usageSuggestion.${suggestion.key}.${suggestion.inputKey}`;
                  trigger(fullInputKey);
                }
              }}
              className="mt-0.5"
            />
            <div className="text-gray-700 text-sm font-medium block items-center">
              <label htmlFor={suggestion.key} className="inline cursor-pointer">
                {suggestion.label}
              </label>
              {suggestion.hasInput && (
                <>
                  <input
                    placeholder="..."
                    className={cn(
                      "mx-0.5 text-center inline rounded-sm py-[3px] px-0.5 w-7 text-xs border",
                      inputError ? "border-error-600" : "border-gray-300",
                    )}
                    type="text"
                    {...register(inputKey as any, {
                      onBlur: () =>
                        trigger(`usageSuggestion.${suggestion.key}`),
                    })}
                  />
                  <span className="inline">{suggestion.unit}</span>
                </>
              )}
            </div>
          </div>
          {inputError && (
            <p className="text-xs text-error-600 pl-6">{inputError}</p>
          )}
        </div>
      )}
    />
  );
};

export default MedicalReminderInfoForm;
