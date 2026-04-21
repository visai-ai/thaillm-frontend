"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PADDING_X_LAYOUT } from "@/constant/common";
import { Button } from "@/components/ui/button";
import SendMessageInput from "@/components/common/SendMessageInput";
import CopyButton from "@/components/common/CopyButton";
import ParseHTML from "@/components/common/ParseHTML";
import TextDropdown from "@/components/common/TextDropdown";
import { XIcon, Loader2, RefreshCwIcon, AlertCircleIcon } from "lucide-react";
import { useQueryArenaModels } from "@/hooks/useQueryArenaModels";
import { useMutationArenaVote } from "@/hooks/useMutationArenaVote";
import api from "@/lib/api";

const LAYOUT = "max-w-5xl mx-auto w-full";
const DEFAULT_QUESTIONS = [
  "ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?",
  "ควรเว้นเวลากินยาหลังจากดื่มนมกี่ชั่วโมง?",
  "อัตราการเต้นของหัวใจปกติในผู้ใหญ่ควรอยู่ที่เท่าไหร่?",
  "วิธีล้างแผลที่ถูกต้องตามหลักเวชปฏิบัติคืออะไร?",
  "การใช้หน้ากากอนามัยแบบ N95 แตกต่างจากหน้ากากผ้าหรือไม่?",
  "อาหารประเภทใดที่ควรหลีกเลี่ยงหลังผ่าตัด?",
  "ถ้ากินยาพาราเซตามอลเกินขนาด จะเกิดอะไรขึ้น?",
  "อาการของโรคเบาหวานระยะเริ่มต้นมีอะไรบ้าง?",
];
const VOTE_OPTIONS = [
  { key: "A" as const, label: "A ดีกว่า", symbol: "A" },
  { key: "B" as const, label: "B ดีกว่า", symbol: "B" },
  { key: "EQUAL" as const, label: "พอๆ กัน", symbol: "=" },
  { key: "NO" as const, label: "ไม่ดีทั้งคู่", symbol: "-" },
];

type ModelStreamCallbacks = {
  onStream: (chunk: string) => void;
  onError: (msg: string) => void;
  onDone: () => void;
};

function useModelAnswer() {
  const [answer, setAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasError, setHasError] = useState(false);
  const genRef = useRef(0);

  /** Reset + start streaming. Returns callbacks bound to this generation. */
  const start = useCallback((): ModelStreamCallbacks => {
    const gen = ++genRef.current;
    setAnswer("");
    setIsStreaming(true);
    setHasError(false);
    return {
      onStream: (chunk) => {
        if (genRef.current === gen) setAnswer((p) => p + chunk);
      },
      onError: (msg) => {
        if (genRef.current === gen) {
          setAnswer(msg);
          setHasError(true);
        }
      },
      onDone: () => {
        if (genRef.current === gen) setIsStreaming(false);
      },
    };
  }, []);

  /** Full reset without starting a new stream */
  const reset = useCallback(() => {
    genRef.current++;
    setAnswer("");
    setIsStreaming(false);
    setHasError(false);
  }, []);

  return { answer, isStreaming, hasError, start, reset };
}

type ChatArenaSectionProps = { className?: string };

const ChatArenaSection = ({ className }: ChatArenaSectionProps) => {
  const [questionInput, setQuestionInput] = useState("");
  const [question, setQuestion] = useState("");
  const [selectedModels, setSelectedModels] = useState<{
    A: string;
    B: string;
  }>({ A: "", B: "" });

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [modelAName, setModelAName] = useState("");
  const [modelBName, setModelBName] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  // Whether each model was manually picked (captured at submit time)
  const [wasManualA, setWasManualA] = useState(false);
  const [wasManualB, setWasManualB] = useState(false);

  const modelA = useModelAnswer();
  const modelB = useModelAnswer();

  const { data: modelList = [] } = useQueryArenaModels();
  const voteMutation = useMutationArenaVote();
  const modelNameList = modelList.map((m) => m.name);

  const isManualA = selectedModels.A !== "";
  const isManualB = selectedModels.B !== "";
  const isStreaming = modelA.isStreaming || modelB.isStreaming;
  const hasAnswers = sessionId !== null;
  const streamDone = hasAnswers && !isStreaming;
  const canVote = streamDone && !modelA.hasError && !modelB.hasError;

  // Manual pick → show immediately. Random → hidden until voted (blind comparison).
  const showModelNameA = wasManualA || voted;
  const showModelNameB = wasManualB || voted;

  const clearQuestionInput = () => {
    setQuestion("");
    setSessionId(null);
    setModelAName("");
    setModelBName("");
    setStreamError(null);
    setVoted(false);
    setWasManualA(false);
    setWasManualB(false);
    modelA.reset();
    modelB.reset();
  };

  const handleSubmitQuestion = (q?: string) => {
    const text = q || questionInput;
    if (!text || isStreaming) return;
    setQuestion(text);
    setQuestionInput("");
    setSessionId(null);
    setModelAName("");
    setModelBName("");
    setStreamError(null);
    setVoted(false);
    setWasManualA(isManualA);
    setWasManualB(isManualB);

    const cbA = modelA.start();
    const cbB = modelB.start();

    api.arena.askStream(
      {
        question: text,
        modelAName: isManualA ? selectedModels.A : undefined,
        modelBName: isManualB ? selectedModels.B : undefined,
      },
      {
        onInit: (id, mA, mB) => {
          setSessionId(id);
          setModelAName(mA);
          setModelBName(mB);
        },
        onStreamA: cbA.onStream,
        onStreamB: cbB.onStream,
        onErrorA: cbA.onError,
        onErrorB: cbB.onError,
        onError: (msg) => setStreamError(msg),
        onDone: () => {
          cbA.onDone();
          cbB.onDone();
        },
      },
    );
  };

  const handleVote = (voteKey: "A" | "B" | "EQUAL" | "NO") => {
    if (!sessionId || voted || voteMutation.isPending) return;
    voteMutation.mutate(
      { sessionId, voteKey },
      { onSuccess: () => setVoted(true) },
    );
  };

  const handleRetry = (side: "A" | "B") => {
    if (!question || !sessionId) return;
    const stream = side === "A" ? modelA : modelB;
    if (side === "A") {
      setModelAName("");
      setSelectedModels((p) => ({ ...p, A: "" }));
      setWasManualA(false);
    } else {
      setModelBName("");
      setSelectedModels((p) => ({ ...p, B: "" }));
      setWasManualB(false);
    }
    setVoted(false);
    const cb = stream.start();

    api.arena.retryStream(
      { sessionId, side: side.toLowerCase() as "a" | "b" },
      {
        onRetryInit: (s, name) => {
          if (s === "a") setModelAName(name);
          else setModelBName(name);
        },
        onStreamA: side === "A" ? cb.onStream : undefined,
        onStreamB: side === "B" ? cb.onStream : undefined,
        onErrorA: side === "A" ? cb.onError : undefined,
        onErrorB: side === "B" ? cb.onError : undefined,
        onError: (msg) => {
          cb.onError(msg);
          setStreamError(msg);
        },
        onDone: cb.onDone,
      },
    );
  };

  if (!question) {
    return (
      <div
        className={cn(
          "relative flex flex-col w-full overflow-hidden justify-between",
          className,
        )}
      >
        <section className={cn("overflow-auto flex w-full", PADDING_X_LAYOUT)}>
          <div className={cn("space-y-4", LAYOUT)}>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {DEFAULT_QUESTIONS.map((q, index) => (
                <li
                  key={index}
                  className="group cursor-pointer bg-white hover:bg-primary-50 border border-gray-300 hover:border-primary-50 rounded-xl p-2"
                  onClick={() => handleSubmitQuestion(q)}
                >
                  <span className="text-gray-500 group-hover:text-gray-600 text-xs">
                    ตัวอย่างคำถาม
                  </span>
                  <p className="whitespace-pre-line text-gray-600 group-hover:text-primary-700 text-sm sm:text-base">
                    {q}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <InputBar
          modelNames={modelNameList}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          questionInput={questionInput}
          setQuestionInput={setQuestionInput}
          onSubmit={() => handleSubmitQuestion()}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex flex-col w-full overflow-hidden", className)}
    >
      {/* Top: Question */}
      <div className={cn("shrink-0 px-4 sm:px-8 pt-2 pb-2", PADDING_X_LAYOUT)}>
        <div className={cn(LAYOUT)}>
          <div className="relative bg-primary-50 py-3 pl-3 sm:pl-4 rounded-xl flex items-center px-10 sm:pr-12">
            <p className="whitespace-pre-line grow break-word text-gray-700 text-sm sm:text-base">
              {question}
            </p>
            <Button
              aria-label="Clear question input"
              className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 p-1 w-7 h-7 bg-white hover:bg-gray-50 rounded-md"
              variant="icon"
              onClick={clearQuestionInput}
              disabled={isStreaming}
            >
              <XIcon />
            </Button>
          </div>
        </div>
      </div>

      {/* Middle: Answer cards */}
      <div className="grow overflow-auto md:overflow-hidden px-4 sm:px-8">
        <div className={cn(LAYOUT, "md:h-full")}>
          {isStreaming && !hasAnswers && (
            <div className="flex items-center justify-center py-8 sm:py-12 gap-2 text-gray-500 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>กำลังเชื่อมต่อกับโมเดล...</span>
            </div>
          )}
          {streamError && (
            <div className="text-center py-6 sm:py-8 text-red-500 text-sm">
              เกิดข้อผิดพลาด: {streamError}
            </div>
          )}
          {hasAnswers && (
            <div className="flex flex-col md:grid md:grid-cols-2 gap-3 sm:gap-4 md:h-full pb-4 md:pb-0">
              <ModelAnswerCard
                label="A"
                modelName={modelAName}
                answer={modelA.answer}
                isStreaming={modelA.isStreaming}
                showModelName={showModelNameA}
                hasError={modelA.hasError}
                onRetry={modelA.hasError ? () => handleRetry("A") : undefined}
              />
              <ModelAnswerCard
                label="B"
                modelName={modelBName}
                answer={modelB.answer}
                isStreaming={modelB.isStreaming}
                showModelName={showModelNameB}
                hasError={modelB.hasError}
                onRetry={modelB.hasError ? () => handleRetry("B") : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Vote + Input */}
      <div className="shrink-0 bg-white border-t border-gray-100">
        {hasAnswers && (
          <div className={cn("px-4 sm:px-8 pt-3")}>
            <div className={cn(LAYOUT)}>
              <VoteModelSection
                key={sessionId}
                onVote={handleVote}
                voted={voted}
                isLoading={voteMutation.isPending}
                disabled={!canVote}
              />
            </div>
          </div>
        )}
        <InputBar
          modelNames={modelNameList}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          questionInput={questionInput}
          setQuestionInput={setQuestionInput}
          onSubmit={() => handleSubmitQuestion()}
          disabled={isStreaming}
        />
      </div>
    </div>
  );
};

const RANDOM_LABEL = "สุ่มโมเดล";

const InputBar = ({
  modelNames,
  selectedModels,
  setSelectedModels,
  questionInput,
  setQuestionInput,
  onSubmit,
  disabled = false,
}: {
  modelNames: string[];
  selectedModels: { A: string; B: string };
  setSelectedModels: React.Dispatch<
    React.SetStateAction<{ A: string; B: string }>
  >;
  questionInput: string;
  setQuestionInput: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) => {
  const itemsA = [
    RANDOM_LABEL,
    ...modelNames.filter((n) => n !== selectedModels.B),
  ];
  const itemsB = [
    RANDOM_LABEL,
    ...modelNames.filter((n) => n !== selectedModels.A),
  ];

  return (
    <div className="w-full px-4 sm:px-8 pt-2 sm:pt-2 pb-1 bg-white shrink-0">
      <div className={cn("flex flex-col sm:flex-row gap-2 flex-wrap", LAYOUT)}>
        <div className="flex items-center gap-2 shrink-0">
          <TextDropdown
            items={itemsA}
            selectedItem={selectedModels.A || RANDOM_LABEL}
            handleSetSelectedItem={(item) =>
              setSelectedModels((prev) => ({
                ...prev,
                A: item === RANDOM_LABEL ? "" : item,
              }))
            }
            className="text-sm font-semibold"
            disabled={disabled}
          />
          <span className="text-xs text-gray-400">vs</span>
          <TextDropdown
            items={itemsB}
            selectedItem={selectedModels.B || RANDOM_LABEL}
            handleSetSelectedItem={(item) =>
              setSelectedModels((prev) => ({
                ...prev,
                B: item === RANDOM_LABEL ? "" : item,
              }))
            }
            className="text-sm font-semibold"
            disabled={disabled}
          />
        </div>
        <SendMessageInput
          input={questionInput}
          onInputChange={setQuestionInput}
          className="grow min-w-[200px]"
          onSubmit={onSubmit}
          disableSend={disabled}
        />
      </div>
    </div>
  );
};

const ModelAnswerCard = ({
  label,
  modelName,
  answer,
  isStreaming = false,
  showModelName = true,
  hasError = false,
  onRetry,
}: {
  label: "A" | "B";
  modelName: string;
  answer: string;
  isStreaming?: boolean;
  showModelName?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}) => {
  const isA = label === "A";
  const visibleAnswer = answer
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<think>[\s\S]*$/g, "")
    .trim();
  const isWaiting = isStreaming && !visibleAnswer;

  return (
    <div
      className={cn(
        "relative border rounded-xl bg-white flex flex-col min-h-0",
        hasError ? "border-red-200 bg-red-50/30" : "border-gray-200",
      )}
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 shrink-0">
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold",
            isA ? "bg-blue-100 text-blue-700" : "bg-error-100 text-error-700",
          )}
        >
          {label}
        </div>
        {showModelName ? (
          <div
            className={cn(
              "border py-0.5 px-1.5 rounded-lg font-medium text-xs",
              isA
                ? "bg-blue-50 text-blue-600 border-blue-200"
                : "bg-error-50 text-error-600 border-error-200",
            )}
          >
            {modelName}
          </div>
        ) : (
          <span className="text-xs text-gray-400">โมเดล {label}</span>
        )}
        {isWaiting && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
        )}
        {visibleAnswer && !hasError && (
          <CopyButton text={visibleAnswer} className="ml-auto" />
        )}
      </div>
      <div className="overflow-auto px-3 sm:px-4 pb-3 text-sm text-gray-600 grow">
        {isWaiting ? (
          <div className="text-gray-400 text-xs py-2">กำลังรอคำตอบ...</div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <AlertCircleIcon className="h-6 w-6 text-red-400" />
            <p className="text-sm text-red-500">ไม่สามารถเรียกโมเดลได้</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors mt-1"
              >
                <RefreshCwIcon className="h-3 w-3" />
                สุ่มโมเดลอื่น
              </button>
            )}
          </div>
        ) : visibleAnswer ? (
          <ParseHTML markdown={visibleAnswer} />
        ) : null}
      </div>
    </div>
  );
};

const VoteModelSection = ({
  onVote,
  voted,
  isLoading,
  disabled,
}: {
  onVote: (key: "A" | "B" | "EQUAL" | "NO") => void;
  voted: boolean;
  isLoading: boolean;
  disabled: boolean;
}) => {
  const [selectedVoteKey, setSelectedVoteKey] = useState<string>("");

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="text-gray-600 font-medium text-center sm:text-left text-xs sm:text-sm">
        {voted ? "ขอบคุณสำหรับการโหวต!" : "คุณชอบผลลัพท์ของโมเดลใดมากกว่ากัน"}
      </div>
      <div className="flex">
        {VOTE_OPTIONS.map((option, index) => {
          const isSelected = selectedVoteKey === option.key;
          const isFirst = index === 0;
          const isLast = index === VOTE_OPTIONS.length - 1;
          const colorMap = {
            A: {
              bg: "bg-blue-50",
              border: "border-blue-400",
              text: "text-blue-700",
              badge: "bg-blue-100 border-blue-400 text-blue-700",
            },
            B: {
              bg: "bg-error-50",
              border: "border-error-400",
              text: "text-error-700",
              badge: "bg-error-100 border-error-400 text-error-700",
            },
            EQUAL: {
              bg: "bg-gray-100",
              border: "border-gray-400",
              text: "text-gray-700",
              badge: "bg-gray-200 border-gray-400 text-gray-700",
            },
            NO: {
              bg: "bg-primary-50",
              border: "border-primary-400",
              text: "text-primary-700",
              badge: "bg-primary-100 border-primary-400 text-primary-700",
            },
          };
          const colors = colorMap[option.key];

          return (
            <button
              key={option.key}
              type="button"
              disabled={voted || isLoading || disabled}
              className={cn(
                "flex-1 flex items-center gap-1 sm:gap-2 justify-center py-2 px-1 sm:px-4 border transition-colors",
                isFirst && "rounded-l-lg",
                isLast && "rounded-r-lg",
                !isFirst && "-ml-px",
                disabled && !voted
                  ? "cursor-not-allowed opacity-40 bg-gray-50 border-gray-300"
                  : isSelected
                    ? cn(
                        colors.bg,
                        colors.border,
                        "z-10 relative cursor-default",
                      )
                    : "bg-white border-gray-300 hover:bg-gray-50 cursor-pointer",
                voted && !isSelected && "opacity-30",
              )}
              onClick={() => {
                setSelectedVoteKey(option.key);
                onVote(option.key);
              }}
            >
              <div
                className={cn(
                  "border rounded-md h-6 flex items-center justify-center px-1 sm:px-2 text-xs leading-[18px] font-bold transition-colors",
                  isSelected ? colors.badge : "border-gray-300 text-gray-500",
                )}
              >
                {option.symbol}
              </div>
              <span
                className={cn(
                  "text-[11px] sm:text-sm font-semibold transition-colors",
                  isSelected ? colors.text : "text-gray-700",
                )}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChatArenaSection;
