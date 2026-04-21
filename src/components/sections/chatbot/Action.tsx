import { useState, useEffect } from "react";

import { formatThaiDate } from "@/utils/time";
import { cn } from "@/lib/utils";

import TimePicker, { Time } from "@/components/common/TimePicker";
import DatePicker from "@/components/common/DatePicker";
import CopyButton from "@/components/common/CopyButton";
import ParseHTML from "@/components/common/ParseHTML";
import { Input } from "@/components/common/CustomInput";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  SendIcon,
  CheckIcon,
  CalendarIcon,
  Clock2Icon,
  ChevronDownIcon,
} from "lucide-react";
import { Conversation } from "@/stores/useChatStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActionProps = {
  id: string;
  onEdit?: (conversation: Partial<Conversation>, shouldSave?: boolean) => void;
  onSendQuestion?: (question: string) => Promise<void>;
  disabled?: boolean;
  isLatest?: boolean; // If false, hide all buttons
};

// actionType: timepicker
export const TimeSelector = () => {
  const [time, setTime] = useState<Time>({
    hour: "",
    minute: "",
  });

  return (
    <TimePicker
      selectedTime={{
        hour: time?.hour,
        minute: time?.minute,
      }}
      handleSetSelectedTime={setTime}
    >
      <Button type="button" variant={`secondary`} size={`sm`} className="w-fit">
        <Clock2Icon className="size-4" />
        {time?.hour && time?.minute ? (
          <span>
            {time.hour}:{time.minute}
          </span>
        ) : (
          <span>เลือกเวลา</span>
        )}
      </Button>
    </TimePicker>
  );
};

// actionType: datepicker
export const DateSelector = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  return (
    <DatePicker
      selectedDate={selectedDate}
      handleSetSelectedDate={(inputDate: Date | undefined) => {
        if (inputDate) {
          setSelectedDate(inputDate);
        }
      }}
    >
      <Button type="button" variant={`secondary`} size={`sm`} className="w-fit">
        <CalendarIcon className="size-4" />
        {selectedDate ? (
          <span>{formatThaiDate(selectedDate)}</span>
        ) : (
          <span>เลือกวันที่</span>
        )}{" "}
      </Button>
    </DatePicker>
  );
};

type ChoicesProps = {
  id: string;
  title?: string;
  choices: string[];
  selectedChoices?: string[];
} & ActionProps;

// actionType: multiple
export const MultipleChoices = ({
  id,
  title,
  choices,
  onSendQuestion,
  onEdit,
  disabled,
  selectedChoices = [],
  isLatest = true,
}: ChoicesProps) => {
  const handleCancel = () => {
    onSendQuestion?.("ยกเลิกการเลือก");
    onEdit?.({ disabled: true }, true);
  };

  const handleSubmit = () => {
    onSendQuestion?.(`${title} ประกอบไปด้วย ${selectedChoices.join(", ")}`);
    onEdit?.({ disabled: true, selectedChoices }, true);
  };

  const handleChoiceToggle = (choice: string) => {
    const newSelectedChoices = selectedChoices.includes(choice)
      ? selectedChoices.filter((s) => s !== choice)
      : [...selectedChoices, choice];
    onEdit?.({ selectedChoices: newSelectedChoices }, false);
  };

  return (
    <div className="overflow-hidden flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-4 border border-gray-200 bg-gray-50 p-4 rounded-2xl shadow-xs w-50">
        {/* icon */}
        <div className="bg-primary-100 w-11 h-11 rounded-full flex justify-center items-center border-6 border-[#EAEAED]">
          <SendIcon className="size-5" />
        </div>
        {/* question */}
        <div className="text-base text-gray-900 font-semibold">{title}</div>
        {/* options */}
        {choices.map((choice, index) => {
          const choiceId = `${title}-choice-${index}-${id}`;
          const isSelected = selectedChoices.includes(choice);

          return (
            <div
              key={index + `-${id}`}
              aria-disabled={disabled}
              className="flex items-center group gap-2 text-sm font-medium text-gray-700 cursor-pointer aria-[disabled=true]:cursor-not-allowed w-fit"
            >
              <Checkbox
                className="cursor-pointer"
                id={choiceId}
                aria-labelledby={choiceId}
                checked={isSelected}
                onCheckedChange={(value) => {
                  handleChoiceToggle(choice);
                }}
                disabled={disabled || !isLatest}
              />
              <Label htmlFor={choiceId} className="cursor-[inherit]">
                {choice}
              </Label>
            </div>
          );
        })}
      </div>
      {/* action */}
      {isLatest && (
        <div className="flex items-center gap-3 max-w-lg">
          <Button
            variant={"secondary"}
            className="grow basis-0"
            onClick={handleCancel}
            disabled={disabled}
          >
            ยกเลิกการเลือก
          </Button>
          <Button
            className="grow basis-0"
            disabled={disabled || selectedChoices.length === 0}
            onClick={handleSubmit}
          >
            ยืนยัน
          </Button>
        </div>
      )}
    </div>
  );
};

// actionType: single
export const SingleChoice = ({
  id,
  title,
  choices,
  onSendQuestion,
  onEdit,
  disabled,
  selectedChoices = [],
  isLatest = true,
}: ChoicesProps) => {
  const selectedChoice = selectedChoices[0] || "";

  const handleCancel = () => {
    onSendQuestion?.("ยกเลิกการเลือก");
    onEdit?.({ disabled: true }, true);
  };

  const handleSubmit = () => {
    onSendQuestion?.(`${title} คือ ${selectedChoice}`);
    onEdit?.({ disabled: true, selectedChoices: [selectedChoice] }, true);
  };

  const handleChoiceChange = (choice: string) => {
    onEdit?.({ selectedChoices: [choice] }, false);
  };

  return (
    <div className="overflow-hidden flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-4 border border-gray-200 bg-gray-50 p-4 rounded-2xl shadow-xs w-50">
        {/* icon */}
        <div className="bg-primary-100 w-11 h-11 rounded-full flex justify-center items-center border-6 border-[#EAEAED]">
          <SendIcon className="size-5" />
        </div>
        {/* question */}
        <div className="text-base text-gray-900 font-semibold">{title}</div>
        {/* options */}
        <RadioGroup
          value={selectedChoice}
          aria-label={title}
          onValueChange={handleChoiceChange}
          disabled={!isLatest}
        >
          {choices.map((choice, index) => {
            const choiceId = `${title?.replaceAll(" ", "-")}-choice-${index}-${id}`;

            return (
              <div
                key={index + `-${id}`}
                aria-disabled={disabled}
                className="flex items-center group gap-2 text-sm font-medium text-gray-700 cursor-pointer aria-[disabled=true]:cursor-not-allowed w-fit"
              >
                <RadioGroupItem
                  className="cursor-pointer"
                  id={choiceId}
                  aria-labelledby={choiceId}
                  value={choice}
                  disabled={disabled || !isLatest}
                />
                <Label htmlFor={choiceId} className="cursor-[inherit]">
                  {choice}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
      {/* action */}
      {isLatest && (
        <div className="flex items-center gap-3 max-w-lg">
          <Button
            variant={"secondary"}
            className="grow basis-0"
            onClick={handleCancel}
            disabled={disabled}
          >
            ยกเลิกการเลือก
          </Button>
          <Button
            className="grow basis-0"
            disabled={disabled || !selectedChoice}
            onClick={handleSubmit}
          >
            ยืนยัน
          </Button>
        </div>
      )}
    </div>
  );
};

// actionType: multiselect
export const MultipleSelection = ({
  id,
  choices,
  onEdit,
  onSendQuestion,
  title,
  disabled,
  selectedChoices: initialSelectedChoices = [],
  isLatest = true,
}: ChoicesProps) => {
  const [selectedChoices, setSelectedChoices] = useState<string[]>(
    initialSelectedChoices,
  );

  // Sync state when prop changes (e.g., when conversation is loaded from database)
  useEffect(() => {
    setSelectedChoices(initialSelectedChoices);
  }, [initialSelectedChoices]);

  const handleCancel = () => {
    onSendQuestion?.("ยกเลิกการเลือก");
    onEdit?.({ disabled: true });
  };

  const handleSubmit = () => {
    onSendQuestion?.(`${title} ประกอบไปด้วย ${selectedChoices.join(", ")}`);
    onEdit?.({ disabled: true, selectedChoices });
  };

  const handleChoiceToggle = (choice: string) => {
    const newSelectedChoices = selectedChoices.includes(choice)
      ? selectedChoices.filter((s) => s !== choice)
      : [...selectedChoices, choice];
    setSelectedChoices(newSelectedChoices);
    onEdit?.({ selectedChoices: newSelectedChoices });
  };

  return (
    <div className="overflow-hidden flex flex-col gap-4 py-2">
      <div className="flex flex-wrap gap-2">
        {choices.map((choice, index) => {
          const isSelected = selectedChoices.includes(choice);
          return (
            <button
              key={index + `-${id}`}
              type="button"
              className={cn(
                "py-2 px-3 rounded-lg cursor-pointer border font-semibold text-sm flex items-center gap-1",
                isSelected
                  ? "bg-primary-500 text-white border-primary-500"
                  : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300",
                !isLatest && "pointer-events-none opacity-50",
              )}
              onClick={() => {
                handleChoiceToggle(choice);
              }}
              disabled={disabled || !isLatest}
            >
              {isSelected && <CheckIcon className="size-5 text-white" />}
              {choice}
            </button>
          );
        })}
      </div>
      {/* action */}
      {isLatest && (
        <div className="max-w-lg gap-1.5 flex flex-col justify-center">
          {selectedChoices.length > 0 && (
            <span className="text-gray-600 text-center text-sm">
              เลือก {selectedChoices.length} ตัวเลือก
            </span>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant={"secondary"}
              className="grow basis-0"
              onClick={handleCancel}
              disabled={disabled}
            >
              ยกเลิกการเลือก
            </Button>
            <Button
              className="grow basis-0"
              disabled={disabled || selectedChoices?.length === 0}
              onClick={handleSubmit}
            >
              ยืนยัน
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// actionType: slider
export const SliderSection = () => {
  const [value, setValue] = useState<number[]>([0]);

  return (
    <Slider
      value={value}
      defaultValue={[50]}
      onValueChange={setValue}
      max={100}
      step={1}
      className={cn("w-[60%]")}
    />
  );
};

// actionType: loader
export const LoadingSection = () => {
  return <div className="loader"></div>;
};

// actionType: arena
export const ArenaSection = ({ id, isLatest = true }: ActionProps) => {
  const answerA = "ตัวอย่างคำตอบ";
  const answerB = "ตัวอย่างคำตอบ";

  const modelAnswerList = [
    {
      modelName: "modelA",
      answer: answerA,
    },
    {
      modelName: "modelB",
      answer: answerB,
    },
  ];

  return (
    <div className="flex flex-col overflow-auto">
      <span>จาก 2 คำตอบนี้ คุณชอบคำตอบไหนมากกว่า</span>
      <div className="flex items-start gap-2 overflow-auto w-full grow shrink-0 py-3">
        {modelAnswerList.map((modelAnswer, index) => {
          return (
            <div
              key={index + `-${id}`}
              className="relative w-3xs bg-white border border-gray-200 rounded-xl py-2 shrink-0 flex flex-col gap-1"
            >
              <div className="text-gray-600 text-[13px] pl-4 pr-10">
                {modelAnswer.modelName}
              </div>
              <div className="grow px-4 text-gray-600 max-h-60 overflow-auto">
                <ParseHTML markdown={modelAnswer.answer} />
              </div>
              {isLatest && (
                <Button
                  type="button"
                  variant="secondary"
                  size={"sm"}
                  className="mx-4"
                >
                  ฉันชอบคำตอบนี้มากกว่า
                </Button>
              )}
              <CopyButton
                text={modelAnswer.answer}
                className="absolute top-1 right-2"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

type ButtonGroupProps = {
  id: string;
  title?: string;
  options: { value?: string; label: string }[];
  hasInput?: boolean;
} & ActionProps;

// actionType: assistance
export const AssistanceSection = ({
  id,
  onSendQuestion,
  isLatest = true,
}: ActionProps) => {
  const MEDICINE_SCHEDULING_OPTIONS = [
    {
      value: "เพิ่มการแจ้งเตือนทานยาใหม่",
      label: "➕ เพิ่มการแจ้งเตือนทานยาใหม่",
    },
    {
      value: "ดู-แก้ไข-ยกเลิกตารางทานยา",
      label: "📋 ดู-แก้ไข-ยกเลิกตารางทานยา",
    },
  ];

  const MEDICAL_APPOINTMENT_OPTIONS = [
    {
      value: "เพิ่มนัดหมายแพทย์",
      label: "➕ เพิ่มนัดหมายแพทย์",
    },
    {
      value: "ดู-แก้ไข-ยกเลิกนัดหมายแพทย์",
      label: "📋 ดู-แก้ไข-ยกเลิกนัดหมายแพทย์",
    },
  ];

  const ASSISTANCE_OPTIONS = [
    {
      value: "ประเมินอาการเบื้องต้น",
      label: "🩺 ประเมินอาการเบื้องต้น",
      type: "button" as const,
    },
    {
      value: "จัดตารางทานยา",
      label: "💊 จัดตารางทานยา",
      type: "dropdown" as const,
      dropdownOptions: MEDICINE_SCHEDULING_OPTIONS,
    },
    {
      value: "ทำนัดหมายแพทย์",
      label: "🗓️ ทำนัดหมายแพทย์",
      type: "dropdown" as const,
      dropdownOptions: MEDICAL_APPOINTMENT_OPTIONS,
    },
    {
      value: "เบอร์ฉุกเฉิน",
      label: "🆘️ เบอร์ฉุกเฉิน",
      type: "button" as const,
    },
  ];

  if (!isLatest) return null;

  return (
    <section className="space-y-2">
      <div className="flex flex-row gap-1 xl:gap-2 flex-wrap">
        {ASSISTANCE_OPTIONS.map((option) => {
          const value = option?.value || option.label;

          if (option.type === "dropdown") {
            return (
              <DropdownMenu key={`${value}-${id}`}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={`secondary`}
                    size={"sm"}
                    className="text-xs gap-1 xl:gap-2 xl:text-sm"
                  >
                    {option.label}
                    <ChevronDownIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom">
                  {option.dropdownOptions?.map((subOption) => {
                    const subValue = subOption?.value || subOption.label;
                    return (
                      <DropdownMenuItem
                        key={`${subValue}-${id}`}
                        onClick={() => {
                          onSendQuestion?.(subValue);
                        }}
                      >
                        {subOption.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <Button
              key={`${value}-${id}`}
              variant={`secondary`}
              size={"sm"}
              className="text-xs xl:text-sm"
              onClick={() => {
                onSendQuestion?.(value);
              }}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
};

// actionType: buttonGroup
export const ButtonGroup = ({
  id,
  title,
  options,
  onSendQuestion,
  hasInput,
  isLatest = true,
}: ButtonGroupProps) => {
  if (!isLatest) return null;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const value = option?.value || option.label;
          return (
            <Button
              key={`${value}-${id}`}
              variant={`secondary`}
              size={"sm"}
              onClick={() => {
                onSendQuestion?.(`${title ? `${title} ` : ""}${value}`);
              }}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      {hasInput && (
        <InputSection
          id={id}
          onSendQuestion={onSendQuestion}
          title={title}
          isLatest={isLatest}
        />
      )}
    </section>
  );
};

type InputSectionProps = {
  id: string;
  title?: string;
} & ActionProps;

export const InputSection = ({
  id,
  title = "",
  onSendQuestion,
  disabled,
  isLatest = true,
}: InputSectionProps) => {
  const [inputText, setInputText] = useState<string>("");

  const handleSubmitInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && onSendQuestion) {
      onSendQuestion(`${title ? `${title} ` : ""}${inputText.trim()}`);
    }
  };

  const handleCancel = () => {
    if (onSendQuestion) {
      onSendQuestion("ยกเลิก");
    }
    setInputText("");
  };

  if (!isLatest) return null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmitInput}
      noValidate
    >
      <Input
        type="text"
        label={title}
        placeholder={title}
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        disabled={disabled}
      />
      <div className="max-w-lg flex items-center gap-3">
        <Button
          type="button"
          variant={"secondary"}
          className="grow basis-0"
          onClick={handleCancel}
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          className="grow basis-0"
          disabled={disabled || !inputText.trim()}
        >
          ยืนยัน
        </Button>
      </div>
    </form>
  );
};
