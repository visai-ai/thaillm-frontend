import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PrescreenSubmitRow from "./PrescreenSubmitRow";
import { Input } from "@/components/common/CustomInput";
import DatePicker from "@/components/common/DatePicker";
import TextDropdown from "@/components/common/TextDropdown";
import { formatThaiDate } from "@/utils/time";

type QuestionPayload = {
  qid: string;
  question: string;
  question_type: string;
  options?: { id: string; label: string }[];
  fields?: { id: string; label: string; kind: string }[];
  constraints?: { min_value: number; max_value: number; step: number };
  image?: string;
  metadata?: Record<string, any>;
  answer_schema?: Record<string, any>;
};

type PrescreenBulkFormProps = {
  questions: QuestionPayload[];
  phaseName: string;
  onSubmit: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  isLatest?: boolean;
  defaultValues?: Record<string, unknown>;
  onDraftChange?: (values: Record<string, unknown>) => void;
  onBack?: () => void;
};

// ============================================================================
// Label translation — map common English option IDs/labels to Thai
// ============================================================================

const LABEL_TH: Record<string, string> = {
  // Gender
  male: "ชาย",
  female: "หญิง",
  other: "อื่นๆ",
  // Pregnancy
  pregnant: "ตั้งครรภ์",
  not_pregnant: "ไม่ได้ตั้งครรภ์",
  // Menstrual flow
  same: "เท่าเดิม",
  light: "น้อย",
  less: "น้อยกว่าปกติ",
  normal: "ปกติ",
  moderate: "ปานกลาง",
  heavy: "มาก",
  more: "มากกว่าปกติ",
  // Vaccination / developmental
  complete: "ครบ",
  incomplete: "ไม่ครบ",
  on_time: "ตามเกณฑ์",
  delayed: "ล่าช้า",
  // General
  yes: "ใช่",
  no: "ไม่ใช่",
  none: "ไม่มี",
  unknown: "ไม่ทราบ",
};

/** Return Thai label when the API sends English; pass through Thai strings as-is. */
function translateLabel(id: string, label: string): string {
  if (/[ก-๛]/.test(label)) return label; // already Thai
  return LABEL_TH[label.toLowerCase()] ?? LABEL_TH[id.toLowerCase()] ?? label;
}

// ============================================================================
// Condition map — hardcoded from YAML rules since the API doesn't include them
// ============================================================================

type Condition = { field: string; op: string; value: string | number };

/** Conditions keyed by metadata.key (not qid) */
const CONDITION_MAP: Record<string, Condition> = {
  // Phase 0: Demographics
  age_months: { field: "age", op: "lt", value: 6 },
  pregnancy_status: { field: "gender", op: "eq", value: "Female" },
  total_pregnancies: { field: "pregnancy_status", op: "eq", value: "pregnant" },
  fetuses_count: { field: "pregnancy_status", op: "eq", value: "pregnant" },
  gestational_age_weeks: {
    field: "pregnancy_status",
    op: "eq",
    value: "pregnant",
  },
  last_menstrual_period: {
    field: "pregnancy_status",
    op: "eq",
    value: "not_pregnant",
  },
  menstrual_duration_days: {
    field: "pregnancy_status",
    op: "eq",
    value: "not_pregnant",
  },
  menstrual_flow: {
    field: "pregnancy_status",
    op: "eq",
    value: "not_pregnant",
  },
  // Phase 5: Past History (intra-phase conditions)
  vaccination_detail: {
    field: "vaccination_status",
    op: "eq",
    value: "incomplete",
  },
  developmental_detail: {
    field: "developmental_milestones",
    op: "eq",
    value: "delayed",
  },
};

/**
 * Evaluate whether a field should be visible based on its condition.
 * Supports transitive visibility — if the referenced field is itself hidden,
 * this field is also hidden.
 */
function isFieldVisible(
  key: string,
  values: Record<string, unknown>,
  allKeys: string[],
): boolean {
  const condition = CONDITION_MAP[key];
  if (!condition) return true;

  // Transitive: if the referenced field has a condition and is hidden, this is hidden too
  if (allKeys.includes(condition.field)) {
    const parentCondition = CONDITION_MAP[condition.field];
    if (parentCondition && !isFieldVisible(condition.field, values, allKeys)) {
      return false;
    }
  }

  const actualValue = values[condition.field];

  // Numeric comparisons
  if (["lt", "le", "gt", "ge"].includes(condition.op)) {
    const numActual = Number(actualValue);
    const numExpected = Number(condition.value);
    if (isNaN(numActual) || isNaN(numExpected)) return false;
    switch (condition.op) {
      case "lt":
        return numActual < numExpected;
      case "le":
        return numActual <= numExpected;
      case "gt":
        return numActual > numExpected;
      case "ge":
        return numActual >= numExpected;
    }
  }

  // Equality checks
  const strActual = String(actualValue ?? "");
  const strExpected = String(condition.value ?? "");
  switch (condition.op) {
    case "eq":
      return strActual === strExpected;
    case "ne":
      return strActual !== strExpected && strActual !== "";
    default:
      return true;
  }
}

/** Check if a visible, non-optional field has a value */
function isFieldFilled(
  q: QuestionPayload,
  key: string,
  values: Record<string, unknown>,
): boolean {
  const qt = q.question_type;
  const isOptional = q.metadata?.optional === true;
  // yes_no_detail and from_yaml/multi_select always have a default value
  if (
    qt === "yes_no_detail" ||
    qt === "from_yaml" ||
    qt === "multi_select" ||
    qt === "image_multi_select"
  ) {
    return true;
  }
  if (isOptional) return true;
  const val = values[key];
  return val !== "" && val !== null && val !== undefined;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build the yes_no_detail value in the format the API expects.
 * Without detail_fields: { answer: bool, detail: string | null }
 * With detail_fields: { answer: bool, detail: { subKey: typedVal, ... } }
 */
function buildYesNoDetailValue(
  q: QuestionPayload,
  ynd: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const answer = (ynd?.answer as boolean) ?? false;
  const detailFields: any[] = q.metadata?.detail_fields || [];

  if (!answer) return { answer: false, detail: null };

  if (detailFields.length > 0) {
    const detail: Record<string, unknown> = {};
    for (const sf of detailFields) {
      const rawVal = ynd?.[sf.key];
      if (rawVal !== "" && rawVal !== null && rawVal !== undefined) {
        detail[sf.key] =
          sf.type === "int" ? Math.floor(Number(rawVal)) : rawVal;
      }
    }
    return {
      answer: true,
      detail: Object.keys(detail).length > 0 ? detail : null,
    };
  }

  const detail = ynd?.detail;
  return {
    answer: true,
    detail: detail && String(detail).trim() ? String(detail).trim() : null,
  };
}

// ============================================================================
// Component
// ============================================================================

export default function PrescreenBulkForm({
  questions,
  phaseName,
  onSubmit,
  disabled,
  isLatest = true,
  defaultValues,
  onDraftChange,
  onBack,
}: PrescreenBulkFormProps) {
  // All field keys for condition evaluation
  const allKeys = useMemo(
    () => questions.map((q) => q.metadata?.key || q.qid),
    [questions],
  );

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0)
      return defaultValues;
    const init: Record<string, unknown> = {};
    for (const q of questions) {
      const key = q.metadata?.key || q.qid;
      if (q.question_type === "yes_no_detail") {
        init[key] = { answer: false, detail: null };
      } else if (
        q.question_type === "multi_select" ||
        q.question_type === "image_multi_select" ||
        q.question_type === "from_yaml"
      ) {
        init[key] = [];
      } else {
        init[key] = "";
      }
    }
    return init;
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleChange = (key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleMultiToggle = (key: string, optionId: string) => {
    setValues((prev) => {
      const current = (prev[key] as string[]) || [];
      if (current.includes(optionId)) {
        return { ...prev, [key]: current.filter((v) => v !== optionId) };
      }
      return { ...prev, [key]: [...current, optionId] };
    });
  };

  const handleSubmit = () => {
    // Validate required fields and numeric constraints
    const errors: Record<string, string> = {};
    for (const q of questions) {
      const key = q.metadata?.key || q.qid;
      if (!isFieldVisible(key, values, allKeys)) continue;
      if (!isFieldFilled(q, key, values)) {
        errors[key] = "กรุณากรอกข้อมูล";
        continue;
      }
      // Validate numeric range from answer_schema or constraints
      const val = values[key];
      if (
        (q.question_type === "int" ||
          q.question_type === "float" ||
          q.question_type === "number_range") &&
        val !== "" &&
        val !== null &&
        val !== undefined
      ) {
        const trimmed = String(val).trim();
        const num = Number(trimmed);
        if (trimmed === "" || isNaN(num)) {
          errors[key] = "กรุณาระบุเป็นตัวเลข";
          continue;
        }
        // Check constraints from answer_schema (API provides "minimum"/"maximum")
        // Hardcoded validation for demographic age fields
        const schema = q.answer_schema;
        let minVal = schema?.minimum ?? q.constraints?.min_value;
        let maxVal = schema?.maximum ?? q.constraints?.max_value;
        if (key === "age") {
          minVal = minVal ?? 0;
          maxVal = maxVal ?? 130;
        } else if (key === "age_months") {
          minVal = minVal ?? 0;
          maxVal = maxVal ?? 11;
        }
        if (minVal !== undefined && minVal !== null && num < minVal) {
          errors[key] = `ค่าต้องไม่น้อยกว่า ${minVal}`;
          continue;
        }
        if (maxVal !== undefined && maxVal !== null && num > maxVal) {
          errors[key] = `ค่าต้องไม่เกิน ${maxVal}`;
          continue;
        }
        // int must be non-negative (API rejects negative)
        if (q.question_type === "int" && num < 0) {
          errors[key] = "ค่าต้องไม่น้อยกว่า 0";
          continue;
        }
        // float must be positive (API rejects 0 or negative for height/weight)
        if (q.question_type === "float" && num <= 0) {
          errors[key] = "ค่าต้องมากกว่า 0";
          continue;
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    // Save draft (raw UI state) before submitting
    onDraftChange?.(values);

    // Build result object (only visible fields)
    const result: Record<string, unknown> = {};
    for (const q of questions) {
      const key = q.metadata?.key || q.qid;

      // Skip hidden fields
      if (!isFieldVisible(key, values, allKeys)) continue;

      const val = values[key];
      const qt = q.question_type;

      if (qt === "int") {
        // API expects Python int — use Math.floor to guarantee integer
        result[key] =
          val !== "" && val !== null && val !== undefined
            ? Math.floor(Number(val))
            : null;
      } else if (qt === "float" || qt === "number_range") {
        // API expects Python float/int — Number() is fine
        result[key] = val !== "" ? Number(val) : null;
      } else if (qt === "yes_no_detail") {
        // Build proper yes_no_detail structure for API
        result[key] = buildYesNoDetailValue(q, val as Record<string, unknown>);
      } else if (
        qt === "multi_select" ||
        qt === "image_multi_select" ||
        qt === "from_yaml"
      ) {
        result[key] = val || [];
      } else {
        result[key] = val || null;
      }
    }
    onSubmit(result);
  };

  const renderField = (q: QuestionPayload) => {
    const key = q.metadata?.key || q.qid;
    const qt = q.question_type;
    const options = q.options || [];

    // Skip hidden fields
    if (!isFieldVisible(key, values, allKeys)) return null;

    const isRequired =
      !q.metadata?.optional && qt !== "from_yaml" && qt !== "yes_no_detail";
    const hasError = !!validationErrors[key];

    // Shared TextDropdown renderer for enum/single_select with >5 options.
    // Uses translated labels as items so the placeholder shows when nothing is selected.
    const renderDropdownField = () => {
      const selectedId = String(values[key] ?? "");
      const labelOf = (o: { id: string; label: string }) =>
        translateLabel(o.id, o.label);
      const labelById = new Map(options.map((o) => [o.id, labelOf(o)]));
      const idByLabel = new Map(options.map((o) => [labelOf(o), o.id]));
      return (
        <TextDropdown
          key={q.qid}
          items={options.map(labelOf)}
          selectedItem={labelById.get(selectedId) ?? ""}
          handleSetSelectedItem={(label) =>
            handleChange(key, idByLabel.get(label) ?? "")
          }
          label={q.question}
          requiredLabel={isRequired}
          variant={hasError ? "error" : "default"}
          hint={hasError ? validationErrors[key] : undefined}
          placeholder="-- เลือก --"
          disabled={disabled}
          isItemsFullWidth
          dropdownClassName="py-1.5 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
        />
      );
    };

    const renderLabel = () => (
      <div className="flex items-baseline gap-0.5">
        <Label className="text-sm font-medium text-gray-700">
          {q.question}
        </Label>
        {isRequired && <span className="text-red-500 text-sm">*</span>}
      </div>
    );

    const renderError = () =>
      hasError ? (
        <span className="text-xs text-red-500">{validationErrors[key]}</span>
      ) : null;

    // --- Integer input (age, counts, etc.) ---
    if (qt === "int") {
      const maxVal = q.answer_schema?.maximum ?? q.constraints?.max_value;
      return (
        <Input
          key={q.qid}
          type="text"
          inputMode="numeric"
          label={q.question}
          requiredLabel={isRequired}
          variant={hasError ? "error" : "default"}
          hint={
            hasError
              ? validationErrors[key]
              : maxVal !== undefined
                ? `สูงสุด ${maxVal}`
                : undefined
          }
          value={String(values[key] ?? "")}
          onChange={(e) => handleChange(key, e.target.value)}
          disabled={disabled}
          className="py-1.5"
          inputClassName="w-32 text-sm text-gray-900"
        />
      );
    }

    // --- Float input (height, weight) ---
    if (qt === "float") {
      return (
        <Input
          key={q.qid}
          type="text"
          inputMode="decimal"
          label={q.question}
          requiredLabel={isRequired}
          variant={hasError ? "error" : "default"}
          hint={hasError ? validationErrors[key] : undefined}
          value={String(values[key] ?? "")}
          onChange={(e) => handleChange(key, e.target.value)}
          disabled={disabled}
          className="py-1.5"
          inputClassName="w-32 text-sm text-gray-900"
        />
      );
    }

    // --- Date input ---
    if (qt === "date") {
      const dateStr = values[key] as string | undefined;
      const dateObj = dateStr ? new Date(dateStr) : undefined;
      return (
        <div key={q.qid} className="flex flex-col gap-1.5">
          {renderLabel()}
          <DatePicker
            selectedDate={dateObj}
            handleSetSelectedDate={(date) => {
              if (date) {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                handleChange(key, `${y}-${m}-${d}`);
              }
            }}
          >
            <Button
              variant="secondary"
              type="button"
              disabled={disabled}
              className={cn(
                "w-fit text-sm font-normal py-1.5 px-3",
                hasError && "border-red-400",
              )}
            >
              {dateObj ? formatThaiDate(dateObj) : "เลือกวันที่"}
            </Button>
          </DatePicker>
          {renderError()}
        </div>
      );
    }

    // --- Enum (dropdown or radio buttons) ---
    if (qt === "enum") {
      if (options.length <= 5 && options.length > 0) {
        return (
          <div key={q.qid} className="flex flex-col gap-1.5">
            {renderLabel()}
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => {
                const isSelected = values[key] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      "py-1.5 px-3 rounded-lg border text-sm font-medium transition-colors text-left",
                      isSelected
                        ? "bg-primary-500 text-white border-primary-500"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                      disabled && "opacity-50 cursor-not-allowed",
                    )}
                    onClick={() => handleChange(key, opt.id)}
                    disabled={disabled}
                  >
                    {translateLabel(opt.id, opt.label)}
                  </button>
                );
              })}
            </div>
            {renderError()}
          </div>
        );
      }
      return renderDropdownField();
    }

    // --- Single select (dropdown or radio) ---
    if (qt === "single_select" || qt === "image_single_select") {
      if (options.length <= 5) {
        return (
          <div key={q.qid} className="flex flex-col gap-1.5">
            {renderLabel()}
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => {
                const isSelected = values[key] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      "py-1.5 px-3 rounded-lg border text-sm font-medium transition-colors text-left",
                      isSelected
                        ? "bg-primary-500 text-white border-primary-500"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                      disabled && "opacity-50 cursor-not-allowed",
                    )}
                    onClick={() => handleChange(key, opt.id)}
                    disabled={disabled}
                  >
                    {translateLabel(opt.id, opt.label)}
                  </button>
                );
              })}
            </div>
            {renderError()}
          </div>
        );
      }
      return renderDropdownField();
    }

    // --- Multi select / from_yaml (pill buttons) ---
    if (
      qt === "multi_select" ||
      qt === "image_multi_select" ||
      qt === "from_yaml"
    ) {
      const selected = (values[key] as string[]) || [];

      // Fallback: if from_yaml has no options, show as unavailable
      if (options.length === 0 && qt === "from_yaml") {
        return (
          <div key={q.qid} className="flex flex-col gap-1.5 col-span-full">
            {renderLabel()}
            <p className="text-xs text-gray-400">
              ไม่มีตัวเลือก (กดถัดไปเพื่อข้ามได้)
            </p>
          </div>
        );
      }

      const isWide = qt === "from_yaml" || options.length > 6;
      return (
        <div
          key={q.qid}
          className={cn("flex flex-col gap-1.5", isWide && "col-span-full")}
        >
          {renderLabel()}
          <p className="text-xs text-gray-400">เลือกได้หลายข้อ (ไม่บังคับ)</p>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    "py-1.5 px-3 rounded-lg border text-sm font-medium transition-colors text-left",
                    isSelected
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                    disabled && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={() => handleMultiToggle(key, opt.id)}
                  disabled={disabled}
                >
                  {translateLabel(opt.id, opt.label)}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // --- Number range ---
    if (qt === "number_range") {
      return (
        <Input
          key={q.qid}
          type="text"
          inputMode="decimal"
          label={q.question}
          requiredLabel={isRequired}
          variant={hasError ? "error" : "default"}
          hint={hasError ? validationErrors[key] : undefined}
          value={String(values[key] ?? "")}
          onChange={(e) => handleChange(key, e.target.value)}
          disabled={disabled}
          className="py-1.5"
          inputClassName="w-32 text-sm text-gray-900"
        />
      );
    }

    // --- Yes/No with detail ---
    if (qt === "yes_no_detail") {
      const ynd = values[key] as Record<string, unknown> | undefined;
      const answer = (ynd?.answer as boolean) ?? false;
      const detail = (ynd?.detail as string) ?? "";
      const detailFields: any[] = q.metadata?.detail_fields || [];

      const handleSubFieldChange = (subKey: string, subVal: unknown) => {
        // Store sub-fields at top level of the ynd object for easy UI access
        // buildYesNoDetailValue() will restructure into {answer, detail: {...}} on submit
        handleChange(key, { ...ynd, answer: true, [subKey]: subVal });
      };

      return (
        <div key={q.qid} className="flex flex-col gap-1.5">
          {renderLabel()}
          <div className="flex items-center gap-2">
            {(
              [
                { val: false, label: "ไม่มี" },
                { val: true, label: "มี" },
              ] as const
            ).map(({ val, label }) => (
              <button
                key={label}
                type="button"
                className={cn(
                  "py-1.5 px-4 rounded-lg border text-sm font-medium transition-colors text-left",
                  answer === val
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
                onClick={() =>
                  handleChange(key, {
                    answer: val,
                    detail: val ? "" : null,
                  })
                }
                disabled={disabled}
              >
                {label}
              </button>
            ))}
          </div>
          {/* When answer is true: render detail_fields sub-structure if defined,
              otherwise fall back to a single text input */}
          {answer && detailFields.length > 0 ? (
            <div className="ml-4 space-y-2 border-l-2 border-blue-200 pl-3">
              {detailFields.map((sf: any) => (
                <div key={sf.key} className="flex flex-col gap-0.5">
                  <label className="text-xs font-medium text-gray-600">
                    {sf.field_name_th ?? sf.key}
                  </label>
                  {sf.type === "int" && (
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={String(ynd?.[sf.key] ?? "")}
                      onChange={(e) =>
                        handleSubFieldChange(sf.key, e.target.value)
                      }
                      disabled={disabled}
                      className="py-1.5"
                      inputClassName="w-40 text-sm text-gray-900"
                    />
                  )}
                  {sf.type === "enum" && (
                    <TextDropdown
                      items={sf.values ?? []}
                      selectedItem={String(ynd?.[sf.key] ?? "")}
                      handleSetSelectedItem={(item) =>
                        handleSubFieldChange(sf.key, item)
                      }
                      placeholder="-- เลือก --"
                      disabled={disabled}
                      isItemsFullWidth
                      dropdownClassName="py-1.5 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                    />
                  )}
                  {(sf.type === "str" || !sf.type || sf.type === "string") && (
                    <Input
                      type="text"
                      value={String(ynd?.[sf.key] ?? "")}
                      onChange={(e) =>
                        handleSubFieldChange(sf.key, e.target.value)
                      }
                      disabled={disabled}
                      className="py-1.5"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : answer ? (
            <Input
              type="text"
              placeholder="รายละเอียด..."
              value={detail}
              onChange={(e) =>
                handleChange(key, {
                  answer: true,
                  detail: e.target.value || null,
                })
              }
              disabled={disabled}
              className="py-1.5"
            />
          ) : null}
        </div>
      );
    }

    // --- Free text with fields ---
    if (qt === "free_text_with_fields" && q.fields) {
      return (
        <div key={q.qid} className="flex flex-col gap-1.5">
          {renderLabel()}
          {q.fields.map((field) => (
            <div key={field.id} className="flex flex-col gap-0.5 ml-2">
              <label className="text-xs text-gray-600">{field.label}</label>
              <textarea
                value={
                  ((values[key] as Record<string, string>) || {})[field.id] ||
                  ""
                }
                onChange={(e) => {
                  const prev = (values[key] as Record<string, string>) || {};
                  handleChange(key, {
                    ...prev,
                    [field.id]: e.target.value,
                  });
                }}
                rows={2}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm resize-none bg-white disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      );
    }

    // --- Default: text input (str, free_text, etc.) ---
    return (
      <Input
        key={q.qid}
        type="text"
        label={q.question}
        requiredLabel={isRequired}
        variant={hasError ? "error" : "default"}
        hint={hasError ? validationErrors[key] : undefined}
        value={String(values[key] ?? "")}
        onChange={(e) => handleChange(key, e.target.value)}
        disabled={disabled}
        className="py-1.5"
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold text-gray-800">{phaseName}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {questions.map(renderField)}
      </div>

      {isLatest && (
        <PrescreenSubmitRow
          onSubmit={handleSubmit}
          disabled={disabled}
          onBack={onBack}
        />
      )}
    </div>
  );
}
