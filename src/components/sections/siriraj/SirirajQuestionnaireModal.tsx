"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/common/CustomModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/common/CustomInput";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import api from "@/lib/api";

const LIKERT_OPTIONS = [
  "มากที่สุด",
  "มาก",
  "ปานกลาง",
  "น้อย",
  "น้อยที่สุด",
] as const;

const systemOptions = ["prescreening", "health_qa", "other"] as const;

type LikertValue = (typeof LIKERT_OPTIONS)[number];
type SystemValue = (typeof systemOptions)[number];

const requiredLikert = z.enum(LIKERT_OPTIONS, {
  required_error: "กรุณาเลือกคำตอบ",
});

const sirirajQuestionnaireSchema = z
  .object({
    system: z.enum(systemOptions, { required_error: "กรุณาเลือก 1 ข้อ" }),
    otherSystemText: z.string().trim().optional(),

    // หมวดที่ 1: Usability
    usability_1_1: requiredLikert,
    usability_1_2: requiredLikert,
    usability_1_3: requiredLikert,
    usability_1_4: requiredLikert,
    usability_1_5: requiredLikert,
    usability_1_6: requiredLikert,
    usability_1_7: requiredLikert,

    // หมวดที่ 2: Answer Quality / Relevance
    answerQuality_2_1: requiredLikert,
    answerQuality_2_2: requiredLikert,
    answerQuality_2_3: requiredLikert,

    // หมวดที่ 3: Speed / Reliability
    speedReliability_3_1: requiredLikert,
    speedReliability_3_2: requiredLikert,

    // หมวดที่ 4: Overall Satisfaction
    overall_4_1: requiredLikert,
    overall_4_2: requiredLikert,
    overall_4_3: requiredLikert,

    // หมวดที่ 5: Other
    freeText_5_1: z.string().trim().optional(),
    freeText_5_2: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.system === "other") {
      const v = (data.otherSystemText ?? "").trim();
      if (!v) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otherSystemText"],
          message: "กรุณาระบุระบบอื่นๆ",
        });
      }
    }
  });

export type SirirajQuestionnaireSchema = z.infer<
  typeof sirirajQuestionnaireSchema
>;

function LikertQuestion({
  name,
  control,
  label,
  error,
}: {
  name: keyof SirirajQuestionnaireSchema;
  control: any;
  label: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-gray-900">{label}</Label>
        {error ? <p className="text-xs text-error-600">{error}</p> : null}
      </div>
      <Controller
        name={name as any}
        control={control}
        render={({ field }) => (
          <div className="flex border border-gray-300 rounded-md overflow-hidden divide-x divide-gray-300">
            {LIKERT_OPTIONS.map((opt, index) => {
              const isSelected = field.value === opt;

              return (
                <button
                  key={opt}
                  type="button"
                  className={cn(
                    "group cursor-pointer flex items-center justify-center py-2 px-3 sm:px-4 flex-1 min-w-0 hover:bg-gray-50 transition-colors",
                    isSelected ? "bg-gray-700 hover:bg-gray-600!" : "bg-white",
                  )}
                  onClick={() => field.onChange(opt)}
                >
                  <span
                    className={cn(
                      "text-gray-800 text-sm font-semibold whitespace-nowrap text-center",
                      isSelected && "text-white",
                    )}
                  >
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      />
    </div>
  );
}

export function SirirajQuestionnaireModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const { setUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<SirirajQuestionnaireSchema>({
    resolver: zodResolver(sirirajQuestionnaireSchema),
    mode: "onSubmit",
    defaultValues: {
      system: "prescreening",
      otherSystemText: "",
      usability_1_1: undefined as unknown as LikertValue,
      usability_1_2: undefined as unknown as LikertValue,
      usability_1_3: undefined as unknown as LikertValue,
      usability_1_4: undefined as unknown as LikertValue,
      usability_1_5: undefined as unknown as LikertValue,
      usability_1_6: undefined as unknown as LikertValue,
      usability_1_7: undefined as unknown as LikertValue,
      answerQuality_2_1: undefined as unknown as LikertValue,
      answerQuality_2_2: undefined as unknown as LikertValue,
      answerQuality_2_3: undefined as unknown as LikertValue,
      speedReliability_3_1: undefined as unknown as LikertValue,
      speedReliability_3_2: undefined as unknown as LikertValue,
      overall_4_1: undefined as unknown as LikertValue,
      overall_4_2: undefined as unknown as LikertValue,
      overall_4_3: undefined as unknown as LikertValue,
      freeText_5_1: "",
      freeText_5_2: "",
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    // Load existing answers if available
    const existingAnswers = (user as any)?.sirirajQuestionnaireAnswers as
      | SirirajQuestionnaireSchema
      | undefined;
    if (existingAnswers) {
      reset(existingAnswers as SirirajQuestionnaireSchema);
    } else {
      reset({
        system: "prescreening",
        otherSystemText: "",
        usability_1_1: undefined as unknown as LikertValue,
        usability_1_2: undefined as unknown as LikertValue,
        usability_1_3: undefined as unknown as LikertValue,
        usability_1_4: undefined as unknown as LikertValue,
        usability_1_5: undefined as unknown as LikertValue,
        usability_1_6: undefined as unknown as LikertValue,
        usability_1_7: undefined as unknown as LikertValue,
        answerQuality_2_1: undefined as unknown as LikertValue,
        answerQuality_2_2: undefined as unknown as LikertValue,
        answerQuality_2_3: undefined as unknown as LikertValue,
        speedReliability_3_1: undefined as unknown as LikertValue,
        speedReliability_3_2: undefined as unknown as LikertValue,
        overall_4_1: undefined as unknown as LikertValue,
        overall_4_2: undefined as unknown as LikertValue,
        overall_4_3: undefined as unknown as LikertValue,
        freeText_5_1: "",
        freeText_5_2: "",
      });
    }
  }, [isOpen, reset, user]);

  const onInvalid = useCallback(
    (errors: Record<string, { message?: string }>) => {
      const message = "กรุณาตอบคำถามให้ครบถ้วน";
      setSubmitError(message);
    },
    [],
  );

  const onSubmit = async (data: SirirajQuestionnaireSchema) => {
    if (!user?.id) {
      setSubmitError("ไม่พบข้อมูลผู้ใช้งาน");
      return;
    }
    setIsLoading(true);
    setSubmitError(null);
    try {
      const response = await api.user.updateUser({
        id: user.id,
        requestBody: {
          firstName: user.firstName,
          lastName: user.lastName,
          dob: null,
          gender: null,
          phone: null,
          sirirajQuestionnaireAnswers: data,
        } as Parameters<typeof api.user.updateUser>[0]["requestBody"] & {
          sirirajQuestionnaireAnswers?: Record<string, any>;
        },
      });
      if (response.ok) {
        setUser({
          ...(user as any),
          sirirajQuestionnaireSubmitted: true,
        } as any);
        addNotification({
          state: "success",
          title: "บันทึกแบบสอบถาม",
          description: "บันทึกคำตอบแบบสอบถามสำเร็จ",
        });
        onSuccess?.();
        onClose();
      } else {
        const errorMessage = response.data.error || "เกิดข้อผิดพลาดในการบันทึก";
        setSubmitError(errorMessage);
        addNotification({
          state: "error",
          title: "บันทึกแบบสอบถาม",
          description: errorMessage,
        });
      }
    } catch (error: any) {
      console.error("Error saving Siriraj questionnaire:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง";
      setSubmitError(errorMessage);
      addNotification({
        state: "error",
        title: "บันทึกแบบสอบถาม",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={onClose}
      showCloseButton={true}
      maskClosable={false}
      title="แบบสอบถาม"
      className="max-w-[720px]!"
      body={
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
          <div className="flex flex-col gap-8">
            <div className="text-sm text-gray-700 leading-relaxed">
              กรุณาตอบคำถามต่อไปนี้ โดยเลือกคำตอบที่ท่านพบว่าเหมาะสมที่สุด
              ซึ่งท่านรู้สึกหรือเชื่อว่าตรงกับ สถานการณ์กับการใช้งาน Chatbot
              มากที่สุด ถ้าท่านไม่แน่ใจเกี่ยวกับคำตอบในแต่ละคำถาม
              คำตอบแรกที่ท่าน คิดจะเป็นคำตอบที่ดีที่สุด
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-gray-900">
                  คำถาม: ระบบใดที่ท่านต้องการประเมินความพึงพอใจ (เลือกเพียง 1
                  ข้อ)
                </Label>
                {errors.system ? (
                  <p className="text-xs text-error-600">
                    {errors.system.message as string}
                  </p>
                ) : null}
              </div>

              <Controller
                name="system"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={(field.value as SystemValue | undefined) ?? ""}
                    className="grid gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value="prescreening"
                        id="system-prescreening"
                        className="cursor-pointer"
                      />
                      <Label
                        htmlFor="system-prescreening"
                        className="cursor-pointer"
                      >
                        ระบบคัดกรองเบื้องต้น (Pre-screening system)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value="health_qa"
                        id="system-health-qa"
                        className="cursor-pointer"
                      />
                      <Label
                        htmlFor="system-health-qa"
                        className="cursor-pointer"
                      >
                        ระบบถามตอบเรื่องการแพทย์ทั่วไป (Health Q&amp;A System)
                      </Label>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          value="other"
                          id="system-other"
                          className="cursor-pointer"
                        />
                        <Label
                          htmlFor="system-other"
                          className="cursor-pointer"
                        >
                          ระบบอื่นๆ (โปรดระบุ)
                        </Label>
                      </div>
                      <Input
                        label={undefined}
                        type="text"
                        placeholder="โปรดระบุ..."
                        containerClassName="ml-6 max-w-[520px]"
                        variant={errors.otherSystemText ? "error" : "default"}
                        hint={errors.otherSystemText?.message as string}
                        {...register("otherSystemText")}
                      />
                    </div>
                  </RadioGroup>
                )}
              />
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="text-base font-semibold text-gray-900">
                หมวดที่ 1: ความง่ายในการใช้งาน (Usability)
              </h3>

              <LikertQuestion
                name="usability_1_1"
                control={control}
                label="1.1 การแสดงผลของระบบทำได้ดี ใช้งานง่าย มีความสวยงาม"
                error={errors.usability_1_1?.message as string}
              />
              <LikertQuestion
                name="usability_1_2"
                control={control}
                label="1.2 คำถามเข้าใจง่าย คำถามมีความยาวเหมาะสม"
                error={errors.usability_1_2?.message as string}
              />
              <LikertQuestion
                name="usability_1_3"
                control={control}
                label="1.3 การเริ่มต้นใช้งาน Chatbot เป็นเรื่องง่ายสำหรับคุณ"
                error={errors.usability_1_3?.message as string}
              />
              <LikertQuestion
                name="usability_1_4"
                control={control}
                label="1.4 Chatbot มีบุคลิกที่เป็นธรรมชาติ (รู้สึกเหมือนโต้ตอบกับคน) และทำให้รู้สึกชวนให้คุยต่อ"
                error={errors.usability_1_4?.message as string}
              />
              <LikertQuestion
                name="usability_1_5"
                control={control}
                label="1.5 Chatbot มีการอธิบายขอบเขตการทำงาน (ทำอะไรได้/ไม่ได้) และวัตถุประสงค์ได้ชัดเจน"
                error={errors.usability_1_5?.message as string}
              />
              <LikertQuestion
                name="usability_1_6"
                control={control}
                label="1.6 การใช้งานและการไปยังส่วนอื่น ๆ (เมนูอื่น ๆ) ของ Chatbot นี้ทำได้ง่าย"
                error={errors.usability_1_6?.message as string}
              />
              <LikertQuestion
                name="usability_1_7"
                control={control}
                label="1.7 Chatbot เข้าใจสิ่งที่ฉันต้องการสื่อได้อย่างถูกต้อง"
                error={errors.usability_1_7?.message as string}
              />
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="text-base font-semibold text-gray-900">
                หมวดที่ 2: คุณภาพของคำตอบ (Answer Quality / Relevance)
              </h3>

              <LikertQuestion
                name="answerQuality_2_1"
                control={control}
                label="2.1 คำตอบของ Chatbot ตรงกับสิ่งที่คุณต้องการทราบ"
                error={errors.answerQuality_2_1?.message as string}
              />
              <LikertQuestion
                name="answerQuality_2_2"
                control={control}
                label="2.2 Chatbot ให้ข้อมูลที่ถูกต้อง และมีประโยชน์"
                error={errors.answerQuality_2_2?.message as string}
              />
              <LikertQuestion
                name="answerQuality_2_3"
                control={control}
                label="2.3 Chatbot อธิบายคำตอบได้ชัดเจน และเข้าใจง่าย"
                error={errors.answerQuality_2_3?.message as string}
              />
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="text-base font-semibold text-gray-900">
                หมวดที่ 3: ความเร็วและความพร้อมใช้งาน (Speed / Reliability)
              </h3>

              <LikertQuestion
                name="speedReliability_3_1"
                control={control}
                label="3.1 ความเร็วในการตอบกลับของ chatbot เป็นที่น่าพอใจ"
                error={errors.speedReliability_3_1?.message as string}
              />
              <LikertQuestion
                name="speedReliability_3_2"
                control={control}
                label="3.2 ระบบ Chatbot สามารถใช้งานได้อย่างต่อเนื่อง หรือไม่มีปัญหาระหว่างการใช้งาน"
                error={errors.speedReliability_3_2?.message as string}
              />
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="text-base font-semibold text-gray-900">
                หมวดที่ 4: ความพึงพอใจโดยรวม (Overall Satisfaction)
              </h3>

              <LikertQuestion
                name="overall_4_1"
                control={control}
                label="4.1 คุณจะแนะนำ Chatbot นี้ให้ผู้อื่นใช้งานต่อไป"
                error={errors.overall_4_1?.message as string}
              />
              <LikertQuestion
                name="overall_4_2"
                control={control}
                label="4.2 โดยรวมแล้วคุณพึงพอใจกับการใช้งาน chatbot แค่ไหน"
                error={errors.overall_4_2?.message as string}
              />
              <LikertQuestion
                name="overall_4_3"
                control={control}
                label="4.3 Chatbot สามารถช่วยให้การเข้ารับบริการด้านการแพทย์ดีขึ้น"
                error={errors.overall_4_3?.message as string}
              />
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="text-base font-semibold text-gray-900">
                หมวดที่ 5: หมวดอื่นๆ
              </h3>

              <div className="flex flex-col gap-2">
                <Label className="text-gray-900">
                  5.1 สิ่งที่คุณชอบมากที่สุดเกี่ยวกับ chatbot นี้คืออะไร?
                </Label>
                <textarea
                  className="min-h-[96px] w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 shadow-xs outline-none focus-visible:ring-[4px] focus-visible:ring-gray-shadow"
                  placeholder="พิมพ์คำตอบ..."
                  {...register("freeText_5_1")}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-gray-900">
                  5.2 สิ่งใดที่คุณคิดว่าควรปรับปรุงหรือเพิ่มเติม?
                </Label>
                <textarea
                  className="min-h-[96px] w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 shadow-xs outline-none focus-visible:ring-[4px] focus-visible:ring-gray-shadow"
                  placeholder="พิมพ์คำตอบ..."
                  {...register("freeText_5_2")}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            {submitError && (
              <div className="rounded-md border border-error-300 bg-error-50 p-3 mb-2">
                <p className="text-sm text-error-600">{submitError}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSubmitError(null);
                  onClose();
                }}
                disabled={isLoading}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </form>
      }
    />
  );
}
