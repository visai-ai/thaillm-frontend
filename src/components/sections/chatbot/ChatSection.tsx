"use client";

import Citations from "@/components/common/Citations";
import CopyButton from "@/components/common/CopyButton";
import ParseHTML from "@/components/common/ParseHTML";
import SendMessageInput from "@/components/common/SendMessageInput";
import ToolCall from "@/components/common/ToolCall";
import Turn from "@/components/common/Turn";
import AddAppointmentModal from "@/components/sections/appointment/AddAppointmentModal";
import EditAppointmentModal from "@/components/sections/appointment/EditAppointmentModal";
import { AssistanceSection } from "@/components/sections/chatbot/Action";
import AddMedicalReminderModal from "@/components/sections/medical-reminder/add-medical-form/AddMedicalReminderModal";
import EditMedicalReminderModal from "@/components/sections/medical-reminder/EditMedicalReminderModal";
import { SirirajQuestionnaireModal } from "@/components/sections/siriraj/SirirajQuestionnaireModal";
import PrescreenModal from "@/components/sections/chatbot/prescreen/PrescreenModal";
import aiChat from "@/lib/api/aiChat";
import { useAiChatHandler } from "@/hooks/useAiChatHandler";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import { cn } from "@/lib/utils";
import { hasMedicalSirirajInPath } from "@/lib/config";
import { useAuthStore } from "@/stores/useAuthStore";
import { Conversation } from "@/stores/useChatStore";
import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";

const TimeSelector = dynamic(
  () =>
    import("@/components/sections/chatbot/Action").then(
      (cal) => cal.TimeSelector,
    ),
  {
    loading: () => <></>,
    ssr: false,
  },
);
const DateSelector = dynamic(
  () =>
    import("@/components/sections/chatbot/Action").then(
      (cal) => cal.DateSelector,
    ),
  {
    loading: () => <></>,
    ssr: false,
  },
);
const MultipleChoices = dynamic(
  () =>
    import("@/components/sections/chatbot/Action").then(
      (cal) => cal.MultipleChoices,
    ),
  {
    loading: () => <></>,
    ssr: false,
  },
);
const SingleChoice = dynamic(
  () =>
    import("@/components/sections/chatbot/Action").then(
      (cal) => cal.SingleChoice,
    ),
  {
    loading: () => <></>,
    ssr: false,
  },
);
const ButtonGroup = dynamic(
  () =>
    import("@/components/sections/chatbot/Action").then(
      (cal) => cal.ButtonGroup,
    ),
  {
    loading: () => <></>,
    ssr: false,
  },
);
const MultipleSelection = dynamic(
  () =>
    import("@/components/sections/chatbot/Action").then(
      (cal) => cal.MultipleSelection,
    ),
  {
    loading: () => <></>,
    ssr: false,
  },
);
const SliderSection = dynamic(
  () =>
    import("@/components/sections/chatbot/Action").then(
      (cal) => cal.SliderSection,
    ),
  {
    loading: () => <></>,
    ssr: false,
  },
);
const ArenaSection = dynamic(
  () =>
    import("@/components/sections/chatbot/Action").then(
      (cal) => cal.ArenaSection,
    ),
  {
    loading: () => <></>,
    ssr: false,
  },
);
const InputSection = dynamic(
  () =>
    import("@/components/sections/chatbot/Action").then(
      (cal) => cal.InputSection,
    ),
  {
    loading: () => <></>,
    ssr: false,
  },
);

const PrescreenResult = dynamic(
  () => import("@/components/sections/chatbot/prescreen/PrescreenResult"),
  {
    loading: () => <></>,
    ssr: false,
  },
);

function DebugMessage({ msg }: { msg: any }) {
  return (
    <div
      className={cn(
        "rounded p-2 text-xs font-mono whitespace-pre-wrap break-all",
        msg.role === "system"
          ? "bg-purple-50 border-purple-200 border"
          : msg.role === "user"
            ? "bg-blue-50 border-blue-200 border"
            : msg.role === "assistant"
              ? "bg-green-50 border-green-200 border"
              : "bg-yellow-50 border-yellow-200 border",
      )}
    >
      {JSON.stringify(msg, null, 2)}
    </div>
  );
}

function DebugPanel({
  debugMessages,
}: {
  debugMessages: Array<{ step: number; messages: any[] }>;
}) {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  // Compute new messages per step (diff from previous step)
  const steps = debugMessages.map((step, i) => {
    const prevCount = i > 0 ? debugMessages[i - 1].messages.length : 0;
    const newMessages = step.messages.slice(prevCount);
    return { ...step, newMessages, carriedOver: prevCount };
  });

  const totalNew = steps.reduce((a, s) => a + s.newMessages.length, 0);

  return (
    <div className="max-w-[85%] md:max-w-[80%] mr-auto">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
      >
        <span className="font-mono">🔍</span>
        {open ? "Hide" : "Show"} Debug ({totalNew} messages, {steps.length} step
        {steps.length > 1 ? "s" : ""})
      </button>
      {open && (
        <div className="mt-1 rounded border border-gray-200 bg-gray-50">
          {/* Step tabs */}
          {steps.length > 1 && (
            <div className="flex gap-1 p-2 border-b border-gray-200 flex-wrap">
              {steps.map((step, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(activeStep === i ? null : i)}
                  className={cn(
                    "px-2 py-1 text-xs rounded font-mono transition-colors",
                    activeStep === i
                      ? "bg-blue-500 text-white"
                      : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100",
                  )}
                >
                  Step {step.step}
                  <span className="ml-1 opacity-70">
                    +{step.newMessages.length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="max-h-[500px] overflow-auto p-2 space-y-1">
            {activeStep !== null && steps[activeStep] ? (
              <>
                {steps[activeStep].carriedOver > 0 && (
                  <div className="text-[10px] text-gray-400 font-mono py-1 text-center">
                    — {steps[activeStep].carriedOver} previous messages —
                  </div>
                )}
                {steps[activeStep].newMessages.map((msg: any, j: number) => (
                  <DebugMessage key={j} msg={msg} />
                ))}
                {steps[activeStep].newMessages.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-2">
                    No new messages in this step
                  </div>
                )}
              </>
            ) : (
              // Default: show all steps with new messages only
              steps.map((step, i) => (
                <details key={i} className="mb-2" open={steps.length === 1}>
                  <summary className="cursor-pointer text-xs font-semibold text-gray-600">
                    Step {step.step} — +{step.newMessages.length} new
                    {step.carriedOver > 0 && (
                      <span className="font-normal text-gray-400 ml-1">
                        ({step.carriedOver} carried over)
                      </span>
                    )}
                  </summary>
                  <div className="mt-1 space-y-1">
                    {step.newMessages.map((msg: any, j: number) => (
                      <DebugMessage key={j} msg={msg} />
                    ))}
                  </div>
                </details>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const LAYOUT = "max-w-5xl mx-auto w-full";

type ChatSectionProps = {
  chatroomId: string;
  conversations: Conversation[];
  addConversation: (
    conversation: Omit<Conversation, "id"> & { id?: string },
    shouldSave: boolean,
  ) => Promise<void>;
  editConversation: (
    conversationId: string,
    updates: Partial<Conversation>,
    shouldSave?: boolean,
  ) => Promise<void>;
};

const ChatSection = ({
  chatroomId,
  conversations,
  addConversation,
  editConversation,
}: ChatSectionProps) => {
  const user = useAuthStore((s) => s.user);
  const { containerRef, scrollIfAutoEnabled } = useScrollToBottom({
    conversations,
  });
  const [showSirirajQuestionnaireModal, setShowSirirajQuestionnaireModal] =
    useState(false);

  const {
    showAddMedicalReminderModal,
    setShowAddMedicalReminderModal,
    showEditMedicalReminderModal,
    setShowEditMedicalReminderModal,
    showAddAppointmentsModal,
    setShowAddAppointmentsModal,
    showEditAppointmentModal,
    setShowEditAppointmentModal,
    pendingToolCallId,
    setPendingToolCallId,
    showPrescreenModal,
    setShowPrescreenModal,
    prescreenStep,
    setPrescreenStep,
    prescreenPendingId,
    setPrescreenPendingId,
    handleSendQuestion,
    questionInput,
    setQuestionInput,
    sendToolResponse,
    openPendingModalIfAny,
    isAiResponding,
  } = useAiChatHandler({
    chatroomId,
    scrollIfAutoEnabled,
    addConversation,
    editConversation,
    blockOtherModals: showSirirajQuestionnaireModal,
  });
  const assessmentMessageIdRef = useRef<string | undefined>(undefined);
  const hasShownQuestionnaireRef = useRef(false);

  const disabledInput = useMemo(() => {
    return conversations.at(-1)?.actionType === "input";
  }, [conversations]);

  // Detect assessment completion message and track it
  useEffect(() => {
    if (!hasMedicalSirirajInPath()) return;

    // Find the latest assistant message with the assessment completion content
    const assessmentMessage = conversations
      .slice()
      .reverse()
      .find(
        (conv) =>
          conv.role === "assistant" &&
          typeof conv.content === "string" &&
          conv.content.includes("ประเมินอาการเรียบร้อยแล้วครับ") &&
          conv.metadata?.showSirirajQuestionnaire === true,
      );

    if (
      assessmentMessage &&
      assessmentMessage.id !== assessmentMessageIdRef.current
    ) {
      assessmentMessageIdRef.current = assessmentMessage.id;
    }
  }, [conversations]);

  // When a user message is added after the assessment message, show questionnaire modal once (store-driven).
  useEffect(() => {
    if (!hasMedicalSirirajInPath() || !assessmentMessageIdRef.current) return;
    if (hasShownQuestionnaireRef.current || showSirirajQuestionnaireModal)
      return;
    if (user?.sirirajQuestionnaireSubmitted) return;

    const last = conversations.at(-1);
    if (last?.role !== "user") return;

    hasShownQuestionnaireRef.current = true;
    setShowSirirajQuestionnaireModal(true);
  }, [
    conversations,
    showSirirajQuestionnaireModal,
    user?.sirirajQuestionnaireSubmitted,
  ]);

  const handleQuestionnaireClose = useCallback(() => {
    setShowSirirajQuestionnaireModal(false);
    openPendingModalIfAny();
  }, [openPendingModalIfAny]);

  return (
    <div className="relative flex flex-col h-full w-full pb-10 overflow-hidden">
      <section
        ref={containerRef}
        className="px-3 sm:px-8 pt-8 pb-26 sm:pb-28 xl:pb-24 h-full w-full overflow-auto"
      >
        {conversations.length === 0 ? (
          <div
            className={cn(
              LAYOUT,
              "flex min-h-full flex-col items-start justify-center -mt-[3%] gap-4",
            )}
          >
            <div className="flex flex-col gap-1">
              <p className="text-left text-muted-foreground whitespace-pre-line font-medium">
                สวัสดี {user?.firstName ?? "คุณ"}
              </p>
              <p className="text-left text-muted-foreground whitespace-pre-line font-semibold text-2xl md:text-3xl">
                ฉันคือผู้ช่วยด้านสุขภาพ เลือกหัวข้อหรือปรึกษาได้เลย
              </p>
            </div>
            <AssistanceSection
              id="empty-state-assistance"
              onSendQuestion={handleSendQuestion}
              isLatest={true}
            />
          </div>
        ) : (
          <div className={cn("flex flex-col gap-2", LAYOUT)}>
            {conversations.map((conversation, index) => {
              const isLatest = index === conversations.length - 1;
              return (
                <div key={index} className="space-y-2 relative">
                  {conversation.role === "assistant" &&
                    conversation.toolCalls &&
                    conversation.toolCalls.length > 0 && (
                      <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[80%] mr-auto">
                        {conversation.toolCalls.map((toolCall) => (
                          <ToolCall
                            key={toolCall.id}
                            toolName={toolCall.name || ""}
                            arguments={toolCall.arguments}
                          />
                        ))}
                      </div>
                    )}
                  {conversation.content && (
                    <Turn
                      role={conversation.role as "user" | "assistant"}
                      className={cn(
                        "max-w-[85%] md:max-w-[80%] overflow-hidden w-fit",
                        conversation.role === "assistant"
                          ? "mr-auto"
                          : "ml-auto",
                      )}
                    >
                      {typeof conversation.content === "string" ? (
                        <div className="flex flex-col gap-2 overflow-hidden">
                          <ParseHTML
                            markdown={
                              conversation.citationReferences
                                ? conversation.content
                                : conversation.content.replace(
                                    /<cite>\d+(?:><\d+)*<\/cite>/g,
                                    "",
                                  )
                            }
                          />
                          {conversation.citations &&
                            conversation.citations.length > 0 && (
                              <Citations
                                citations={conversation.citations}
                                citationReferences={
                                  conversation.citationReferences
                                }
                              />
                            )}
                        </div>
                      ) : (
                        <>{conversation.content}</>
                      )}
                    </Turn>
                  )}
                  {conversation.role === "assistant" &&
                    typeof conversation.content === "string" &&
                    conversation.content.trim() && (
                      <div className="max-w-[85%] md:max-w-[80%] mr-auto -mt-1">
                        <CopyButton
                          text={conversation.content.replace(
                            /<cite>\d+(?:><\d+)*<\/cite>/g,
                            "",
                          )}
                          className="p-1.5 text-gray-500 hover:text-gray-700"
                          iconClassName="size-4"
                        />
                      </div>
                    )}
                  {process.env.NEXT_PUBLIC_APP_ENV === "development" &&
                    conversation.role === "assistant" &&
                    conversation.debugMessages &&
                    conversation.debugMessages.length > 0 && (
                      <DebugPanel debugMessages={conversation.debugMessages} />
                    )}
                  {conversation.actionType && (
                    <>
                      {conversation.actionType === "assistance" && (
                        <AssistanceSection
                          id={conversation.id ?? String(index)}
                          onSendQuestion={handleSendQuestion}
                          isLatest={isLatest}
                        />
                      )}
                      {conversation.actionType === "multiselect" &&
                        conversation.choices && (
                          <MultipleSelection
                            id={conversation.id ?? String(index)}
                            title={conversation.title}
                            choices={conversation.choices}
                            selectedChoices={conversation.selectedChoices}
                            onEdit={(newConversation) => {
                              if (conversation?.id) {
                                editConversation(
                                  conversation?.id,
                                  newConversation,
                                  true,
                                );
                              }
                            }}
                            onSendQuestion={handleSendQuestion}
                            disabled={conversation.disabled}
                            isLatest={isLatest}
                          />
                        )}
                      {conversation.actionType === "multiple" &&
                        conversation.choices && (
                          <MultipleChoices
                            id={conversation.id ?? String(index)}
                            title={conversation.title}
                            choices={conversation.choices}
                            onEdit={(newConversation, shouldSave = false) => {
                              if (conversation?.id) {
                                editConversation(
                                  conversation?.id,
                                  newConversation,
                                  shouldSave,
                                );
                              }
                            }}
                            selectedChoices={conversation.selectedChoices}
                            onSendQuestion={handleSendQuestion}
                            disabled={conversation.disabled}
                            isLatest={isLatest}
                          />
                        )}
                      {conversation.actionType === "single" &&
                        conversation.choices && (
                          <SingleChoice
                            id={conversation.id ?? String(index)}
                            selectedChoices={conversation.selectedChoices}
                            title={conversation.title}
                            choices={conversation.choices}
                            onEdit={(newConversation, shouldSave = false) => {
                              if (conversation?.id) {
                                editConversation(
                                  conversation?.id,
                                  newConversation,
                                  shouldSave,
                                );
                              }
                            }}
                            onSendQuestion={handleSendQuestion}
                            disabled={conversation.disabled}
                            isLatest={isLatest}
                          />
                        )}
                      {conversation.actionType === "buttonGroup" &&
                        conversation.options && (
                          <ButtonGroup
                            id={conversation.id ?? String(index)}
                            options={conversation.options}
                            onEdit={(newConversation) => {
                              if (conversation?.id) {
                                editConversation(
                                  conversation?.id,
                                  newConversation,
                                  true,
                                );
                              }
                            }}
                            onSendQuestion={handleSendQuestion}
                            disabled={conversation.disabled}
                            hasInput={conversation.hasInput}
                            title={conversation.title}
                            isLatest={isLatest}
                          />
                        )}
                      {conversation.actionType === "datepicker" && (
                        <DateSelector />
                      )}
                      {conversation.actionType === "timepicker" && (
                        <TimeSelector />
                      )}
                      {conversation.actionType === "slider" && (
                        <SliderSection />
                      )}
                      {conversation.actionType === "input" && (
                        <InputSection
                          id={conversation.id ?? String(index)}
                          title={conversation.title}
                          onSendQuestion={handleSendQuestion}
                          disabled={conversation.disabled}
                          isLatest={isLatest}
                        />
                      )}
                      {conversation.actionType === "arena" && (
                        <ArenaSection
                          id={conversation.id ?? String(index)}
                          isLatest={isLatest}
                        />
                      )}
                      {conversation.actionType === "prescreen-result" && (
                        <PrescreenResult
                          id={conversation.id ?? String(index)}
                          conversation={conversation}
                          onSendQuestion={handleSendQuestion}
                          isLatest={isLatest}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {showAddMedicalReminderModal && (
          <AddMedicalReminderModal
            open={showAddMedicalReminderModal}
            onOpenChange={(open) => {
              setShowAddMedicalReminderModal(open);
              const currentId = pendingToolCallId;
              if (currentId && sendToolResponse) {
                sendToolResponse({
                  id: currentId,
                  cancelled: true,
                }).catch((error) => {
                  console.error(
                    "Failed to send cancellation tool response:",
                    error,
                  );
                });
                setPendingToolCallId(null);
              }
            }}
            pendingId={pendingToolCallId}
            onPendingIdCleared={() => setPendingToolCallId(null)}
            sendToolResponse={sendToolResponse}
          />
        )}
        {showEditMedicalReminderModal && (
          <EditMedicalReminderModal
            open={showEditMedicalReminderModal}
            onOpenChange={(open) => {
              setShowEditMedicalReminderModal(open);
              const currentId = pendingToolCallId;
              if (!open && currentId && sendToolResponse) {
                sendToolResponse({
                  id: currentId,
                  cancelled: false,
                  data: { completed: true },
                }).catch((error) => {
                  console.error("Failed to send tool response:", error);
                });
                setPendingToolCallId(null);
              }
            }}
          />
        )}
        {showAddAppointmentsModal && (
          <AddAppointmentModal
            open={showAddAppointmentsModal}
            onOpenChange={(open) => {
              setShowAddAppointmentsModal(open);
              const currentId = pendingToolCallId;
              if (!open && currentId && sendToolResponse) {
                sendToolResponse({
                  id: currentId,
                  cancelled: true,
                }).catch((error) => {
                  console.error(
                    "Failed to send cancellation tool response:",
                    error,
                  );
                });
                setPendingToolCallId(null);
              }
            }}
            pendingId={pendingToolCallId}
            onPendingIdCleared={() => setPendingToolCallId(null)}
            sendToolResponse={sendToolResponse}
          />
        )}
        {showEditAppointmentModal && (
          <EditAppointmentModal
            open={showEditAppointmentModal}
            onOpenChange={(open) => {
              setShowEditAppointmentModal(open);
              const currentId = pendingToolCallId;
              if (!open && currentId && sendToolResponse) {
                sendToolResponse({
                  id: currentId,
                  cancelled: false,
                  data: { completed: true },
                }).catch((error) => {
                  console.error("Failed to send tool response:", error);
                });
                setPendingToolCallId(null);
              }
            }}
          />
        )}
        {showSirirajQuestionnaireModal && (
          <SirirajQuestionnaireModal
            isOpen={showSirirajQuestionnaireModal}
            onClose={handleQuestionnaireClose}
            onSuccess={() => {
              setShowSirirajQuestionnaireModal(false);
              openPendingModalIfAny();
            }}
          />
        )}
        {showPrescreenModal && (
          <PrescreenModal
            open={showPrescreenModal}
            step={prescreenStep}
            pendingId={prescreenPendingId}
            onClose={() => {
              if (prescreenPendingId && sendToolResponse) {
                aiChat.prescreenCancel(prescreenPendingId).catch(console.error);
                sendToolResponse({
                  id: prescreenPendingId,
                  cancelled: true,
                }).catch(console.error);
              }
              setPrescreenPendingId(null);
              setShowPrescreenModal(false);
              setPrescreenStep(null);
            }}
            onResult={(conversation) => {
              // Add result conversation to chat store
              addConversation(conversation, false);
              setShowPrescreenModal(false);
              setPrescreenStep(null);
              // Send tool response to resume LLM
              if (prescreenPendingId && sendToolResponse) {
                sendToolResponse({
                  id: prescreenPendingId,
                  data: { pipelineResult: conversation.metadata?.step },
                }).catch(console.error);
              }
              setPrescreenPendingId(null);
            }}
          />
        )}
      </section>
      {/* assistance buttons and input question */}
      <div className="absolute w-full bottom-4 sm:bottom-6 xl:bottom-8 overflow-hidden pt-1 left-0 px-3 sm:px-8 bg-transparent">
        <div className={cn(LAYOUT, "flex flex-col gap-2")}>
          {conversations.length > 1 && (
            <AssistanceSection
              id="always-visible-assistance"
              onSendQuestion={handleSendQuestion}
              isLatest={true}
            />
          )}
          <SendMessageInput
            input={questionInput}
            onInputChange={setQuestionInput}
            disabled={disabledInput}
            disableSend={isAiResponding}
            onSubmit={(value) => handleSendQuestion(value ?? questionInput)}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatSection;
