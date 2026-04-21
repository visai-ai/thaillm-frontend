"use client";

import { useState, useRef, useEffect } from "react";
import { XIcon, BugIcon, AlertTriangleIcon } from "lucide-react";
import { getBasePath } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { Modal } from "@/components/common/CustomModal";
import type { PrescreenStep } from "@/hooks/useConversationResponseBuilder";
import { PrescreenFooterContext } from "./PrescreenSubmitRow";
import PrescreenBulkForm from "./PrescreenBulkForm";
import PrescreenErCritical from "./PrescreenErCritical";
import PrescreenSymptomSelect from "./PrescreenSymptomSelect";
import PrescreenErChecklist from "./PrescreenErChecklist";
import PrescreenSelect from "./PrescreenSelect";
import PrescreenNumber from "./PrescreenNumber";
import PrescreenFields from "./PrescreenFields";
import PrescreenFreeText from "./PrescreenFreeText";
import PrescreenLLMQuestions from "./PrescreenLLMQuestions";
import aiChat from "@/lib/api/aiChat";

type PrescreenModalProps = {
  open: boolean;
  step: PrescreenStep | null; // Initial step (first step only)
  pendingId: string | null; // Pending tool call ID for API calls
  onClose: () => void;
  onResult: (conversation: any) => void; // Called when prescreen completes with result
};

const PHASE_NAMES_TH: Record<number, string> = {
  0: "ข้อมูลทั่วไป",
  1: "อาการฉุกเฉิน",
  2: "เลือกอาการ",
  3: "รายการตรวจฉุกเฉิน",
  4: "รายละเอียดอาการ",
  5: "ประวัติการเจ็บป่วย",
  6: "ประวัติส่วนตัว",
  7: "ข้อมูลเพิ่มเติม",
};

function ProgressBar({
  phase,
  totalPhases = 8,
}: {
  phase: number;
  totalPhases?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-1 gap-0.5">
        {Array.from({ length: totalPhases }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i <= phase ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
        {phase + 1} / {totalPhases}
      </span>
    </div>
  );
}

export default function PrescreenModal({
  open,
  step,
  pendingId,
  onClose,
  onResult,
}: PrescreenModalProps) {
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<PrescreenStep | null>(step);
  const footerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Cache user answers so they prefill when navigating back
  // Persisted to localStorage so answers survive tab close
  const STORAGE_KEY = `prescreen-draft-${pendingId}`;
  const answerCache = useRef<Map<string, any>>(new Map());

  // Load cached answers from localStorage on mount
  useEffect(() => {
    if (!pendingId) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        answerCache.current = new Map(parsed.answers ?? []);
        if (parsed.currentStep) {
          setCurrentStep(parsed.currentStep);
        }
      }
    } catch {
      // Ignore corrupted data
    }
  }, [pendingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistToStorage = (stepOverride?: PrescreenStep | null) => {
    if (!pendingId) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          answers: Array.from(answerCache.current.entries()),
          currentStep: stepOverride ?? currentStep,
        }),
      );
    } catch {
      // Storage full or unavailable
    }
  };

  const clearStorage = () => {
    if (!pendingId) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  // Sync initial step from parent
  useEffect(() => {
    if (step) setCurrentStep(step);
  }, [step]);

  // Scroll to top and reset loading when step changes
  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0);
    setIsSubmitting(false);
  }, [currentStep]);

  const getStepKey = (s: PrescreenStep | null): string => {
    if (!s) return "";
    return `${s.type}-${s.phase}-${s.questions?.[0]?.qid ?? ""}`;
  };

  const getCachedAnswer = (s: PrescreenStep | null): any =>
    answerCache.current.get(getStepKey(s));

  const cacheCurrentDraft = (draft: any) => {
    answerCache.current.set(getStepKey(currentStep), draft);
    persistToStorage();
  };

  const handleAnswer = async (value: any) => {
    if (!pendingId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await aiChat.prescreenAnswer(pendingId, value);
      if (!res.ok) throw new Error("Failed to submit answer");

      if (res.data.completed) {
        // Prescreen complete — clear saved draft and pass result to parent
        clearStorage();
        onResult(res.data.conversation);
      } else {
        setCurrentStep(res.data.step);
        persistToStorage(res.data.step);
      }
    } catch (error) {
      console.error("Prescreen answer error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = async () => {
    if (!pendingId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await aiChat.prescreenBack(pendingId);
      if (res.ok) {
        setCurrentStep(res.data.step);
        persistToStorage(res.data.step);
      }
    } catch (error) {
      console.error("Prescreen back error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hide back button on the first step (phase 0)
  const isFirstStep =
    currentStep?.type === "questions" && currentStep.phase === 0;
  const onBack = isFirstStep ? undefined : handleBack;

  const renderSequentialQuestion = (question: any, questionPhase?: number) => {
    const qt: string = question.question_type;
    const cached = getCachedAnswer(currentStep);

    return (
      <div className="flex flex-col gap-3">
        {question.question && (
          <p className="text-base font-semibold text-gray-800">
            {question.question}
          </p>
        )}

        {question.image && (
          <div className="rounded-2xl overflow-hidden border border-gray-100 max-w-sm shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${getBasePath()}/prescreen-images/${question.image}`}
              alt={question.question}
              className="w-full h-auto max-h-80 object-contain bg-gray-50"
            />
          </div>
        )}

        {(qt === "single_select" ||
          qt === "multi_select" ||
          qt === "image_single_select" ||
          qt === "image_multi_select") && (
          <PrescreenSelect
            id="prescreen-modal"
            question={question}
            multi={qt === "multi_select" || qt === "image_multi_select"}
            onSubmit={handleAnswer}
            disabled={false}
            isLatest={true}
            defaultSelected={cached}
            onDraftChange={cacheCurrentDraft}
            onBack={onBack}
            allowEmpty={qt === "multi_select" || qt === "image_multi_select"}
          />
        )}

        {qt === "number_range" && (
          <PrescreenNumber
            question={question}
            onSubmit={handleAnswer}
            disabled={false}
            isLatest={true}
            defaultValue={cached}
            onDraftChange={cacheCurrentDraft}
            onBack={onBack}
          />
        )}

        {qt === "free_text_with_fields" && (
          <PrescreenFields
            id="prescreen-modal"
            question={question}
            onSubmit={handleAnswer}
            disabled={false}
            isLatest={true}
            defaultValues={cached}
            onDraftChange={cacheCurrentDraft}
            onBack={onBack}
          />
        )}

        {qt === "free_text" && (
          <PrescreenFreeText
            id="prescreen-modal"
            onSubmit={handleAnswer}
            disabled={false}
            isLatest={true}
            defaultText={cached}
            onDraftChange={cacheCurrentDraft}
            onBack={onBack}
          />
        )}
      </div>
    );
  };

  const renderPhaseContent = (
    phase: number,
    phaseNameTh: string,
    questions: any[],
  ) => {
    const cached = getCachedAnswer(currentStep);

    if (phase === 1) {
      return (
        <PrescreenErCritical
          questions={questions}
          phaseName={phaseNameTh}
          onSubmit={handleAnswer}
          disabled={false}
          isLatest={true}
          defaultFlags={cached}
          onDraftChange={cacheCurrentDraft}
          onBack={onBack}
        />
      );
    }

    if (phase === 2) {
      return (
        <PrescreenSymptomSelect
          questions={questions}
          phaseName={phaseNameTh}
          onSubmit={handleAnswer}
          disabled={false}
          isLatest={true}
          defaultValues={cached}
          onDraftChange={cacheCurrentDraft}
          onBack={onBack}
        />
      );
    }

    if (phase === 3) {
      return (
        <PrescreenErChecklist
          questions={questions}
          phaseName={phaseNameTh}
          onSubmit={handleAnswer}
          disabled={false}
          isLatest={true}
          defaultFlags={cached}
          onDraftChange={cacheCurrentDraft}
          onBack={onBack}
        />
      );
    }

    if (phase === 4 || phase === 7) {
      const question = questions[0];
      if (!question) return null;
      return renderSequentialQuestion(question, phase);
    }

    // Phases 0, 5, 6, and any unknown phase use the bulk form
    return (
      <PrescreenBulkForm
        questions={questions}
        phaseName={phaseNameTh}
        onSubmit={handleAnswer}
        disabled={false}
        isLatest={true}
        defaultValues={cached}
        onDraftChange={cacheCurrentDraft}
        onBack={onBack}
      />
    );
  };

  const phase =
    currentStep?.type === "questions" ? (currentStep.phase ?? 0) : null;
  const phaseName =
    currentStep?.type === "questions"
      ? currentStep.phase_name || `Phase ${phase}`
      : null;
  const phaseNameTh =
    phase !== null
      ? (PHASE_NAMES_TH[phase] ?? phaseName ?? `Phase ${phase}`)
      : null;
  const questions =
    currentStep?.type === "questions" || currentStep?.type === "llm_questions"
      ? (currentStep.questions ?? [])
      : [];

  return (
    <>
      <Dialog open={open && !showConfirmClose} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-2xl w-full"
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            setShowConfirmClose(true);
          }}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>คัดกรองอาการ</DialogTitle>
              <button
                type="button"
                onClick={() => setShowConfirmClose(true)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="ปิด"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            {currentStep?.type === "questions" && phase !== null && (
              <ProgressBar phase={phase} />
            )}
            {currentStep?.type === "llm_questions" && <ProgressBar phase={7} />}
          </DialogHeader>

          <PrescreenFooterContext.Provider
            value={{ ref: footerRef, isSubmitting }}
          >
            <DialogBody
              key={`${currentStep?.type}-${currentStep?.phase}-${currentStep?.questions?.[0]?.qid ?? ""}`}
              ref={bodyRef}
              className="overflow-y-auto [&>*]:p-0.5"
            >
              {currentStep?.type === "llm_questions" && (
                <PrescreenLLMQuestions
                  questions={currentStep.questions ?? []}
                  onSubmit={handleAnswer}
                  disabled={false}
                  isLatest={true}
                  defaultAnswers={getCachedAnswer(currentStep)}
                  onDraftChange={cacheCurrentDraft}
                  onBack={onBack}
                />
              )}

              {currentStep?.type === "questions" &&
                phase !== null &&
                phaseNameTh !== null &&
                renderPhaseContent(phase, phaseNameTh, questions)}
            </DialogBody>
          </PrescreenFooterContext.Provider>

          {/* Fixed footer for submit/back buttons — PrescreenSubmitRow portals here */}
          <DialogFooter>
            <div ref={footerRef} className="w-full" />
          </DialogFooter>

          {process.env.NEXT_PUBLIC_APP_ENV === "development" && (
            <div className="md:px-6 px-4">
              <button
                type="button"
                onClick={() => setShowDebug((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <BugIcon className="size-3" />
                {currentStep?.type === "questions" && phase !== null
                  ? `${phase} · ${phaseName}`
                  : (currentStep?.type ?? "no step")}
              </button>
              {showDebug && (
                <pre className="overflow-auto max-h-60 rounded-md bg-muted p-2 text-[11px] leading-relaxed text-muted-foreground">
                  {JSON.stringify(currentStep, null, 2)}
                </pre>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Modal
        open={showConfirmClose}
        onOpenChange={setShowConfirmClose}
        icon={AlertTriangleIcon}
        variant="warning"
        showCloseButton={false}
        maskClosable={false}
        title="ยกเลิกการคัดกรอง?"
        description="ข้อมูลที่กรอกจะหายไปทั้งหมดและไม่สามารถกู้คืนได้"
        footer={
          <div className="flex items-center gap-3 w-full">
            <Button
              variant="secondary"
              className="grow basis-0"
              onClick={() => setShowConfirmClose(false)}
            >
              กลับไปกรอก
            </Button>
            <Button
              variant="destructive"
              className="grow basis-0"
              onClick={() => {
                setShowConfirmClose(false);
                clearStorage();
                onClose();
              }}
            >
              ยกเลิก
            </Button>
          </div>
        }
      />
    </>
  );
}
