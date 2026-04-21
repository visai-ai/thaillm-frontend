import { LoadingSection } from "@/components/sections/chatbot/Action";
import {
  ConversationFlowType,
  useConversationResponseBuilder,
} from "@/hooks/useConversationResponseBuilder";
import aiChat, { AiChatEvent, PendingToolCall } from "@/lib/api/aiChat";
import { Conversation, ToolCall } from "@/stores/useChatStore";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseResponseFormat,
  remapCitationReferences,
  shouldBufferContent,
} from "@/utils/parseResponseFormat";

// ============================================================================
// Types
// ============================================================================

interface ConnectionState {
  close: () => void;
  conversationId: string;
  streamBuffer: string;
  updateTimeout: number | null;
  pendingUpdate: boolean;
  parsedResponse: {
    response: string;
    citations: number[];
    citationRenumberMap?: Record<number, number>;
  } | null;
  citationReferences: Record<number, { url: string; title?: string }> | null;
  toolCalls: Map<string, ToolCall>;
  connectionTimeout: NodeJS.Timeout | null;
  lastActivity: number;
  /** True once the conversation has been persisted to the backend. */
  saved: boolean;
  debugMessages: Array<{ step: number; messages: any[] }>;
}

export type PendingModalType =
  | "add-medical-reminder"
  | "edit-medical-reminder"
  | "add-appointments"
  | "edit-appointment";

export type UseAiChatHandlerOptions = {
  chatroomId: string;
  scrollIfAutoEnabled: () => void;
  addConversation: (
    conversation: Omit<Conversation, "id"> & { id?: string },
    shouldSave: boolean,
  ) => Promise<void>;
  editConversation: (
    conversationId: string,
    updates: Partial<Conversation>,
    shouldSave?: boolean,
  ) => Promise<void>;
  /** When true, defer opening add/edit reminder and add/edit appointment modals until openPendingModalIfAny is called. */
  blockOtherModals?: boolean;
};

const ERROR_MESSAGE =
  "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้งครับ";

// Module-level: persists across component mounts (SPA navigation) but resets on page refresh
const reconnectedChatrooms = new Set<string>();

const toolNameToPendingType: Record<string, PendingModalType> = {
  create_reminder: "add-medical-reminder",
  list_reminder: "edit-medical-reminder",
  create_appointment: "add-appointments",
  list_appointment: "edit-appointment",
};

export const useAiChatHandler = ({
  chatroomId,
  scrollIfAutoEnabled,
  addConversation,
  editConversation,
  blockOtherModals = false,
}: UseAiChatHandlerOptions) => {
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
    prescreenPendingId,
    setPrescreenPendingId,
    showPrescreenModal,
    setShowPrescreenModal,
    prescreenStep,
    setPrescreenStep,
  } = useConversationResponseBuilder();

  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  // AI Chat state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState<string>("");

  // Track multiple concurrent connections
  const connectionsRef = useRef<Map<string, ConnectionState>>(new Map());
  const blockOtherModalsRef = useRef(blockOtherModals);
  const pendingModalTypeRef = useRef<PendingModalType | null>(null);
  const prescreenPendingIdRef = useRef<string | null>(null);
  const sendToolResponseRef = useRef<
    | ((data: { id: string; cancelled?: boolean; data?: any }) => Promise<void>)
    | null
  >(null);

  const showPrescreenModalRef = useRef(showPrescreenModal);
  blockOtherModalsRef.current = blockOtherModals;
  prescreenPendingIdRef.current = prescreenPendingId;
  showPrescreenModalRef.current = showPrescreenModal;

  /**
   * Cleans up a connection by clearing timeouts and removing it from the map
   */
  const cleanupConnection = useCallback((connectionId: string) => {
    const conn = connectionsRef.current.get(connectionId);
    if (conn) {
      // Cleanup pending updates
      if (conn.updateTimeout !== null) {
        cancelAnimationFrame(conn.updateTimeout);
        conn.updateTimeout = null;
      }
      // Clear connection timeout
      if (conn.connectionTimeout !== null) {
        clearTimeout(conn.connectionTimeout);
        conn.connectionTimeout = null;
      }
      // Remove from map
      connectionsRef.current.delete(connectionId);
    }
  }, []);

  /**
   * Updates global connection state when no connections remain
   */
  const updateGlobalConnectionState = useCallback(() => {
    if (connectionsRef.current.size === 0) {
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  /**
   * Updates global connection state when one or fewer connections remain
   */
  const updateGlobalConnectionStateIfLow = useCallback(() => {
    if (connectionsRef.current.size <= 1) {
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  /**
   * Handles connection failure by updating conversation with error message
   * and cleaning up the connection
   */
  const handleConnectionFailure = useCallback(
    (
      connectionId: string,
      errorMessage: string = ERROR_MESSAGE,
      shouldSave: boolean = true,
    ) => {
      const conn = connectionsRef.current.get(connectionId);
      if (conn) {
        cleanupConnection(connectionId);

        // If the conversation was already saved to the backend, leave it unchanged
        // — don't replace meaningful content with an error message.
        if (conn.saved) return;

        editConversation(
          conn.conversationId,
          { role: "assistant", content: errorMessage },
          shouldSave,
        );
      }
    },
    [cleanupConnection, editConversation],
  );

  /**
   * Handles connection error by updating conversation, cleaning up, and updating global state
   */
  const handleConnectionError = useCallback(
    (
      connectionId: string,
      errorMessage: string = ERROR_MESSAGE,
      shouldSave: boolean = true,
    ) => {
      handleConnectionFailure(connectionId, errorMessage, shouldSave);
      updateGlobalConnectionStateIfLow();
    },
    [handleConnectionFailure, updateGlobalConnectionStateIfLow],
  );

  // Cleanup all connections on unmount
  useEffect(() => {
    const connections = connectionsRef.current;
    return () => {
      connections.forEach((connection) => {
        // Cleanup pending updates
        if (connection.updateTimeout !== null) {
          cancelAnimationFrame(connection.updateTimeout);
        }
        // Clear connection timeout
        if (connection.connectionTimeout !== null) {
          clearTimeout(connection.connectionTimeout);
        }
        // Close connection
        connection.close();
      });
      connections.clear();
    };
  }, []);

  const openPendingModalIfAny = useCallback(() => {
    const pending = pendingModalTypeRef.current;
    if (!pending) return;
    pendingModalTypeRef.current = null;
    switch (pending) {
      case "add-medical-reminder":
        setShowAddMedicalReminderModal(true);
        break;
      case "edit-medical-reminder":
        setShowEditMedicalReminderModal(true);
        break;
      case "add-appointments":
        setShowAddAppointmentsModal(true);
        break;
      case "edit-appointment":
        setShowEditAppointmentModal(true);
        break;
    }
  }, [
    setShowAddMedicalReminderModal,
    setShowEditMedicalReminderModal,
    setShowAddAppointmentsModal,
    setShowEditAppointmentModal,
  ]);

  const openOrDeferModal = useCallback(
    (type: PendingModalType) => {
      if (blockOtherModalsRef.current || showPrescreenModalRef.current) {
        pendingModalTypeRef.current = type;
        return;
      }
      switch (type) {
        case "add-medical-reminder":
          setShowAddMedicalReminderModal(true);
          break;
        case "edit-medical-reminder":
          setShowEditMedicalReminderModal(true);
          break;
        case "add-appointments":
          setShowAddAppointmentsModal(true);
          break;
        case "edit-appointment":
          setShowEditAppointmentModal(true);
          break;
      }
    },
    [
      setShowAddMedicalReminderModal,
      setShowEditMedicalReminderModal,
      setShowAddAppointmentsModal,
      setShowEditAppointmentModal,
    ],
  );

  // Attempt to reconnect to an active stream on mount (e.g. after page refresh)
  // Uses module-level Set so SPA navigation doesn't re-trigger, only actual page refresh does
  const [isReconnecting, setIsReconnecting] = useState(false);
  // Ref to forward reconnect events to the main onMessage handler (defined later)
  const onMessageRef = useRef<
    ((event: AiChatEvent, connectionId?: string) => void) | null
  >(null);

  // Use refs for reconnect callbacks to avoid re-triggering the effect
  const addConversationRef = useRef(addConversation);
  addConversationRef.current = addConversation;
  const scrollIfAutoEnabledRef = useRef(scrollIfAutoEnabled);
  scrollIfAutoEnabledRef.current = scrollIfAutoEnabled;

  useEffect(() => {
    if (reconnectedChatrooms.has(chatroomId)) return;
    reconnectedChatrooms.add(chatroomId);

    const attemptReconnect = async () => {
      let resolvedData: { connectionId: string; close: () => void } | null =
        null;
      const result = await aiChat.reconnectToStream({
        chatroomId,
        onMessage: (event) => {
          if (!resolvedData) return;
          const connId = resolvedData.connectionId;

          if (event.event === "stream_resume") {
            try {
              const { content } = JSON.parse(event.data);
              if (!content) return;

              setIsReconnecting(true);
              setIsConnected(true);

              const conversationId = crypto.randomUUID();
              const conn: ConnectionState = {
                close: resolvedData!.close,
                conversationId,
                streamBuffer: content,
                updateTimeout: null,
                pendingUpdate: false,
                parsedResponse: null,
                citationReferences: null,
                toolCalls: new Map(),
                connectionTimeout: null,
                lastActivity: Date.now(),
                saved: false,
                debugMessages: [],
              };
              connectionsRef.current.set(connId, conn);

              const parsed = parseResponseFormat(content);
              conn.parsedResponse = {
                response: parsed.response,
                citations: parsed.citations,
              };

              addConversationRef.current(
                {
                  id: conversationId,
                  role: "assistant",
                  content: parsed.response || content,
                  citations: parsed.citations,
                },
                false,
              );
              scrollIfAutoEnabledRef.current();
            } catch (error) {
              console.error("Failed to parse stream_resume:", error);
            }
            return;
          }

          // Delegate message/status/etc. to the main onMessage handler
          onMessageRef.current?.(event, connId);
        },
        onError: () => {
          setIsReconnecting(false);
        },
        onClose: () => {
          setIsReconnecting(false);
        },
      });

      if (result.ok && result.data) {
        resolvedData = result.data;
      }
    };

    attemptReconnect();
  }, [chatroomId]);

  // Check for pending tool calls on mount and resume if found
  const hasCheckedPendingRef = useRef(false);
  useEffect(() => {
    if (hasCheckedPendingRef.current) return;
    hasCheckedPendingRef.current = true;

    const checkPendingToolCalls = async () => {
      try {
        const response = await aiChat.getPendingToolCalls(chatroomId);
        if (response.ok && response.data && response.data.length > 0) {
          for (const pendingCall of response.data as PendingToolCall[]) {
            if (pendingCall.toolName === "prescreen") {
              // Session still in progress — resume by fetching current step
              setPrescreenPendingId(pendingCall.id);
              try {
                const res = await aiChat.prescreenStep(pendingCall.id);
                if (res.ok) {
                  setPrescreenStep(res.data.step);
                  setShowPrescreenModal(true);
                  showPrescreenModalRef.current = true;
                }
              } catch (error) {
                console.error("Failed to resume prescreen:", error);
              }
            } else {
              // Existing modal-based pending tools
              setPendingToolCallId(pendingCall.id);
              const pendingType = toolNameToPendingType[pendingCall.toolName];
              if (pendingType) {
                openOrDeferModal(pendingType);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to check pending tool calls:", error);
      }
    };

    checkPendingToolCalls();
  }, [
    chatroomId,
    setPendingToolCallId,
    setPrescreenPendingId,
    setPrescreenStep,
    setShowPrescreenModal,
    openOrDeferModal,
  ]);

  const handleAiEvent = useCallback(
    (event: any, conversationId: string, connectionId?: string) => {
      if (!conversationId) {
        console.log("No conversation ID, ignoring event:", event);
        return;
      }

      switch (event.event) {
        case "conversation":
          try {
            const conversationData = JSON.parse(event.data);

            const categoryMap: Record<string, ConversationFlowType> = {
              prescreening: ConversationFlowType.Prescreening,
              medicine_scheduling: ConversationFlowType.MedicineScheduling,
              medical_appointment: ConversationFlowType.MedicalAppointment,
              information_query: ConversationFlowType.InformationQuery,
              emergency_contacts: ConversationFlowType.EmergencyContacts,
            };

            // Parse content if it contains response/reference format
            let parsedContent = conversationData.content;
            let parsedCitations: number[] | undefined = undefined;
            let renumberMap: Record<number, number> | undefined = undefined;
            if (
              typeof conversationData.content === "string" &&
              conversationData.role === "assistant"
            ) {
              const parsed = parseResponseFormat(
                conversationData.content,
                false,
              );
              if (parsed.response || parsed.citations.length > 0) {
                parsedContent = parsed.response || conversationData.content;
                parsedCitations =
                  parsed.citations.length > 0 ? parsed.citations : undefined;
                renumberMap = parsed.citationRenumberMap;
              }
            }

            // Get citationReferences from connection if available
            const conn = connectionId
              ? connectionsRef.current.get(connectionId)
              : null;
            const citationRefs = remapCitationReferences(
              conn?.citationReferences,
              renumberMap,
            );

            editConversation(
              conversationId,
              {
                ...conversationData,
                id: conversationData.id || conversationId,
                content: parsedContent,
                citations: parsedCitations,
                citationReferences: citationRefs,
                category: conversationData.category
                  ? categoryMap[conversationData.category] || undefined
                  : undefined,
              },
              false,
            );

            // Backend has now saved this conversation — mark it so that a
            // subsequent connection failure won't overwrite it with an error.
            if (conn) conn.saved = true;

            // Update connection's conversationId if it changed
            if (conversationData.id && conversationData.id !== conversationId) {
              // Find the connection with this conversationId and update it
              connectionsRef.current.forEach((conn, _connId) => {
                if (conn.conversationId === conversationId) {
                  conn.conversationId = conversationData.id;
                }
              });
            }

            // Open prescreen modal (same pattern as medical reminder)
            if (
              conversationData.actionType === "prescreen" &&
              conversationData.id
            ) {
              const pendingId = conversationData.id;
              setPrescreenPendingId(pendingId);
              // Fetch step data via REST then open modal
              // (same as resume-on-page-load flow)
              aiChat
                .prescreenStep(pendingId)
                .then((res) => {
                  if (res.ok) {
                    setPrescreenStep(res.data.step);
                    setShowPrescreenModal(true);
                    showPrescreenModalRef.current = true;
                  }
                })
                .catch(console.error);
            }

            // Open modals if needed (or defer if questionnaire is blocking)
            if (
              conversationData.actionType === "add-medical-reminder" ||
              conversationData.actionType === "edit-medical-reminder" ||
              conversationData.actionType === "add-appointments" ||
              conversationData.actionType === "edit-appointment"
            ) {
              openOrDeferModal(conversationData.actionType as PendingModalType);
            }
          } catch (error) {
            console.error("Error parsing conversation data:", error);
          }
          break;
      }
    },
    [
      editConversation,
      openOrDeferModal,
      setPrescreenPendingId,
      setPrescreenStep,
      setShowPrescreenModal,
    ],
  );

  const onMessage = useCallback(
    (event: AiChatEvent, connectionId?: string) => {
      if (!connectionId) return;
      const conn = connectionsRef.current.get(connectionId);
      if (!conn) return;

      // Update last activity timestamp
      conn.lastActivity = Date.now();

      if (event.event === "message") {
        // Check if this is actually a conversation event that was misclassified
        // This can happen due to SSE parsing edge cases or chunk boundaries
        try {
          if (event.data.startsWith("{") && event.data.includes('"role"')) {
            const parsed = JSON.parse(event.data);
            if (
              parsed.role &&
              (parsed.role === "assistant" || parsed.role === "user") &&
              typeof parsed.content === "string"
            ) {
              // This is actually a conversation event, handle it as such
              console.warn(
                "Detected misclassified conversation event, handling as conversation:",
                parsed.role,
              );
              handleAiEvent(
                { ...event, event: "conversation" },
                conn.conversationId,
                connectionId,
              );
              return;
            }
          }
        } catch {
          // Not valid JSON or doesn't match conversation format, continue with normal message handling
        }

        // Decode newlines that were encoded on the backend
        // Replace \\n with actual \n
        const decodedData = event.data.replace(/\\n/g, "\n");
        conn.streamBuffer += decodedData;

        // Parse the response format to extract response and citations
        const parsed = parseResponseFormat(conn.streamBuffer);

        // Check if we should buffer (wait for <response> tag)
        const shouldBuffer = shouldBufferContent(conn.streamBuffer);

        // Only update if we shouldn't buffer (i.e., we can show content)
        if (!shouldBuffer) {
          // Store parsed response
          conn.parsedResponse = {
            response: parsed.response,
            citations: parsed.citations,
          };

          // Mark that we have a pending update
          conn.pendingUpdate = true;

          // Clear any existing timeout
          if (conn.updateTimeout !== null) {
            cancelAnimationFrame(conn.updateTimeout);
          }

          // Throttle updates using requestAnimationFrame
          // This ensures updates happen at most once per frame (~60fps)
          conn.updateTimeout = requestAnimationFrame(() => {
            const currentConn = connectionsRef.current.get(connectionId);
            if (currentConn?.pendingUpdate) {
              // Use parsed response content instead of raw buffer
              // If we have parsed response, use it; otherwise fall back to raw buffer
              const displayContent =
                currentConn.parsedResponse?.response ||
                currentConn.streamBuffer;

              // Only update content if there's actual content, preserve toolCalls otherwise
              const streamRenumberMap =
                currentConn.parsedResponse?.citationRenumberMap;
              const updateData: any = {
                role: "assistant",
                content: displayContent,
                citations: currentConn.parsedResponse?.citations || [],
                citationReferences: remapCitationReferences(
                  currentConn.citationReferences,
                  streamRenumberMap,
                ),
              };

              // Always preserve toolCalls if they exist - keep them visible forever
              if (currentConn.toolCalls.size > 0) {
                updateData.toolCalls = Array.from(
                  currentConn.toolCalls.values(),
                );
              }

              editConversation(currentConn.conversationId, updateData, false);
              currentConn.pendingUpdate = false;
              currentConn.updateTimeout = null;
            }
          });
        }
        // If shouldBuffer is true, we don't update the UI yet (waiting for <response>)
      }

      if (event.event === "conversation") {
        handleAiEvent(event, conn.conversationId, connectionId);
      }

      if (event.event === "tool_wait") {
        try {
          const toolWaitData = JSON.parse(event.data);
          if (toolWaitData?.id && typeof toolWaitData.id === "string") {
            setPendingToolCallId(toolWaitData.id);
          } else {
            console.warn("Invalid tool_wait event data:", toolWaitData);
          }
        } catch (error) {
          console.error("Error parsing tool_wait event:", error);
          // Don't break the connection on parse errors
        }
      }

      if (event.event === "tool_call") {
        try {
          const toolCallData = JSON.parse(event.data);

          // Validate tool call data
          if (!toolCallData.id || !toolCallData.name) {
            console.error("Invalid tool_call event data:", toolCallData);
            return;
          }

          const toolCall: ToolCall = {
            id: toolCallData.id,
            name: toolCallData.name,
            arguments: toolCallData.arguments,
          };
          conn.toolCalls.set(toolCall.id, toolCall);

          // Update existing conversation with tool calls instead of creating a new one
          // This prevents duplicate tool call displays
          editConversation(
            conn.conversationId,
            {
              role: "assistant",
              toolCalls: Array.from(conn.toolCalls.values()),
            },
            false,
          );
        } catch (error) {
          console.error("Error parsing tool_call event:", error);
          // Don't break the connection on parse errors
        }
      }

      if (event.event === "tool_call_debug") {
        try {
          const debugData = JSON.parse(event.data);
          if (debugData.id && conn.toolCalls.has(debugData.id)) {
            const existingToolCall = conn.toolCalls.get(debugData.id)!;
            conn.toolCalls.set(debugData.id, {
              ...existingToolCall,
              arguments: debugData.arguments,
            });
            editConversation(
              conn.conversationId,
              {
                role: "assistant",
                toolCalls: Array.from(conn.toolCalls.values()),
              },
              false,
            );
          }
        } catch (error) {
          console.error("Error parsing tool_call_debug event:", error);
        }
      }

      if (event.event === "tool_result") {
        try {
          const toolResultData = JSON.parse(event.data);

          // Validate tool result data
          if (!toolResultData || typeof toolResultData !== "object") {
            console.warn("Invalid tool_result event data:", toolResultData);
            return;
          }

          // Store citationReferences from search_medical_facts for clickable citation links
          if (
            toolResultData.name === "search_medical_facts" &&
            toolResultData.citationReferences &&
            typeof toolResultData.citationReferences === "object"
          ) {
            conn.citationReferences = toolResultData.citationReferences;
          }

          // Tool calls persist forever, no need to update status
          // Just update citation references if needed
          if (conn.citationReferences) {
            editConversation(
              conn.conversationId,
              {
                citationReferences: conn.citationReferences,
              },
              false,
            );
          }
        } catch (error) {
          console.error("Error parsing tool_result event:", error);
          // Don't break the connection on parse errors
        }
      }

      if (event.event === "chatroom_update") {
        queryClient.invalidateQueries({ queryKey: ["chatroom"] });
      }

      if (event.event === "debug") {
        try {
          const debugData = JSON.parse(event.data);
          conn.debugMessages.push(debugData);
        } catch {
          // ignore parse errors
        }
      }

      if (event.event === "status") {
        if (event.data === "[START]") {
          setIsConnecting(false);
          setIsConnected(true);
          setAiError(null);
        } else if (event.data === "[DONE]") {
          const currentConn = connectionsRef.current.get(connectionId);
          if (currentConn) {
            // Parse final content
            const finalParsed = parseResponseFormat(currentConn.streamBuffer);
            currentConn.parsedResponse = {
              response: finalParsed.response,
              citations: finalParsed.citations,
            };

            // Keep tool calls visible forever - don't clear them when message is done
            // Preserve tool calls in the final update

            // Cancel any pending animation frame
            if (currentConn.updateTimeout !== null) {
              cancelAnimationFrame(currentConn.updateTimeout);
              currentConn.updateTimeout = null;
            }

            // Finalize conversation content
            if (currentConn.pendingUpdate && currentConn.streamBuffer) {
              // Flush streamed content
              const finalRenumberMap =
                currentConn.parsedResponse.citationRenumberMap;
              const finalUpdate: any = {
                role: "assistant",
                content:
                  currentConn.parsedResponse.response ||
                  currentConn.streamBuffer,
                citations: currentConn.parsedResponse.citations,
                citationReferences: remapCitationReferences(
                  currentConn.citationReferences,
                  finalRenumberMap,
                ),
              };

              if (currentConn.toolCalls.size > 0) {
                finalUpdate.toolCalls = Array.from(
                  currentConn.toolCalls.values(),
                );
              }

              if (currentConn.debugMessages.length > 0) {
                finalUpdate.debugMessages = currentConn.debugMessages;
              }

              editConversation(currentConn.conversationId, finalUpdate, false);
              currentConn.pendingUpdate = false;
            } else if (
              currentConn.toolCalls.size > 0 &&
              !currentConn.streamBuffer
            ) {
              // No streamed content AND tool calls exist (e.g. prescreen trigger) —
              // replace loading spinner with just the tool call chip.
              // Skip if streamBuffer has content — the animation frame already flushed it.
              editConversation(
                currentConn.conversationId,
                {
                  role: "assistant",
                  content: "",
                  toolCalls: Array.from(currentConn.toolCalls.values()),
                  ...(currentConn.debugMessages.length > 0 && {
                    debugMessages: currentConn.debugMessages,
                  }),
                },
                false,
              );
            }

            // Always apply debugMessages even if the streaming content was
            // already flushed by the animation frame (pendingUpdate === false).
            if (currentConn.debugMessages.length > 0) {
              editConversation(
                currentConn.conversationId,
                { debugMessages: currentConn.debugMessages },
                false,
              );
            }

            currentConn.streamBuffer = "";
          }

          // Remove this connection and update global state
          cleanupConnection(connectionId);
          updateGlobalConnectionState();

          // when auto create chatroom, redirect to chatroom after
          // Skip redirect when the prescreen modal is open — the navigation
          // would remount the page component and reset the modal state.
          if (
            !pathname.includes(chatroomId) &&
            !showPrescreenModalRef.current
          ) {
            router.replace(`/${chatroomId}`);
          }
        }
      }

      if (event.event === "error") {
        const errorMessage = "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI";
        setAiError(errorMessage);

        const currentConn = connectionsRef.current.get(connectionId);
        if (currentConn) {
          // Clean up pending updates
          if (currentConn.updateTimeout !== null) {
            cancelAnimationFrame(currentConn.updateTimeout);
            currentConn.updateTimeout = null;
          }
          currentConn.pendingUpdate = false;

          editConversation(
            currentConn.conversationId,
            {
              role: "assistant",
              content: errorMessage,
            },
            true,
          );
        }

        updateGlobalConnectionStateIfLow();
      }
    },
    [
      editConversation,
      handleAiEvent,
      setPendingToolCallId,
      setIsConnecting,
      setIsConnected,
      setAiError,
      pathname,
      router,
      chatroomId,
      cleanupConnection,
      updateGlobalConnectionState,
      updateGlobalConnectionStateIfLow,
      queryClient,
    ],
  );

  // Keep ref in sync so reconnect handler can delegate to onMessage
  onMessageRef.current = onMessage;

  const sendAiMessage = useCallback(
    async (
      prompt: string,
      userConversationId?: string,
      responseConversationId?: string,
    ) => {
      setIsConnecting(true);
      setAiError(null);

      // Use provided conversation ID or create a new one
      const responseId = responseConversationId || crypto.randomUUID();
      const connectionId = crypto.randomUUID();

      // Set connection timeout (5 minutes)
      const CONNECTION_TIMEOUT_MS = 5 * 60 * 1000;
      let connectionTimeout: NodeJS.Timeout | null = null;

      // Initialize connection state
      const connectionState: ConnectionState = {
        close: () => {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
        },
        conversationId: responseId,
        streamBuffer: "",
        updateTimeout: null,
        pendingUpdate: false,
        parsedResponse: null,
        citationReferences: null,
        toolCalls: new Map(),
        connectionTimeout: null,
        lastActivity: Date.now(),
        saved: false,
        debugMessages: [],
      };

      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        console.warn("Connection timeout, closing...", connectionId);
        const conn = connectionsRef.current.get(connectionId);
        if (conn) {
          conn.close();
          handleConnectionFailure(connectionId, ERROR_MESSAGE, true);
        }
      }, CONNECTION_TIMEOUT_MS);

      connectionState.connectionTimeout = connectionTimeout;

      connectionsRef.current.set(connectionId, connectionState);

      try {
        const response = await aiChat.createSSEConnection({
          prompt,
          chatroomId,
          userConversationId,
          onOpen: () => {
            console.log("AI Chat SSE connection opened", connectionId);
            setIsConnected(true);
            setIsConnecting(false);
          },
          onClose: () => {
            console.log("AI Chat SSE connection closed", connectionId);
            cleanupConnection(connectionId);
            updateGlobalConnectionState();
          },
          onError: (error: any) => {
            console.error("AI Chat Error:", error, connectionId);
            setAiError("Connection error occurred");
            handleConnectionError(connectionId);
          },
          onMessage: (event: AiChatEvent) => onMessage(event, connectionId),
        });

        if (response.ok && response.data) {
          connectionState.close = response.data.close;
        } else {
          throw new Error("Failed to connect to AI");
        }
      } catch (error) {
        console.error("Failed to send message to AI:", error);
        setAiError("Failed to connect to AI");
        setIsConnecting(false);
        setIsConnected(false);
        cleanupConnection(connectionId);
      }
    },
    [
      chatroomId,
      onMessage,
      cleanupConnection,
      updateGlobalConnectionState,
      handleConnectionFailure,
      handleConnectionError,
    ],
  );

  const handleSendQuestion = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    if (isConnecting || isConnected) return;

    try {
      const questionId = crypto.randomUUID();

      await addConversation(
        {
          role: "user",
          content: trimmedQuestion,
          id: questionId,
        },
        false,
      );

      scrollIfAutoEnabled();

      const responseId = crypto.randomUUID();

      addConversation(
        {
          id: responseId,
          role: "assistant",
          content: <LoadingSection />,
          responseToConversationId: questionId,
        },
        false,
      );

      try {
        await sendAiMessage(trimmedQuestion, questionId, responseId);
      } catch (error) {
        console.error("Failed to send message to AI:", error);
        editConversation(
          responseId,
          {
            role: "assistant",
            content: ERROR_MESSAGE,
          },
          true,
        );
      }
    } catch (error) {
      console.error("Error in handleSendQuestion:", error);
      // Error already handled in sendAiMessage catch block
    }
  };

  const sendToolResponse = useCallback(
    async (data: { id: string; cancelled?: boolean; data?: any }) => {
      setIsConnecting(true);
      setAiError(null);

      // Use a new connection ID for tool response
      const connectionId = crypto.randomUUID();
      // Get conversation ID from pending tool call or create new one
      const responseId = crypto.randomUUID();

      addConversation(
        {
          id: responseId,
          role: "assistant",
          content: <LoadingSection />,
        },
        false,
      );

      // Set connection timeout (5 minutes)
      const CONNECTION_TIMEOUT_MS = 5 * 60 * 1000;
      let connectionTimeout: NodeJS.Timeout | null = null;

      // Initialize connection state
      const connectionState: ConnectionState = {
        close: () => {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
        },
        conversationId: responseId,
        streamBuffer: "",
        updateTimeout: null,
        pendingUpdate: false,
        parsedResponse: null,
        citationReferences: null,
        toolCalls: new Map(),
        connectionTimeout: null,
        lastActivity: Date.now(),
        saved: false,
        debugMessages: [],
      };

      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        console.warn(
          "Tool response connection timeout, closing...",
          connectionId,
        );
        const conn = connectionsRef.current.get(connectionId);
        if (conn) {
          conn.close();
          handleConnectionFailure(connectionId, ERROR_MESSAGE, true);
        }
      }, CONNECTION_TIMEOUT_MS);

      connectionState.connectionTimeout = connectionTimeout;

      connectionsRef.current.set(connectionId, connectionState);

      try {
        const response = await aiChat.createToolResponseSSEConnection({
          id: data.id,
          cancelled: data.cancelled,
          data: data.data,
          onOpen: () => {
            console.log("Tool Response SSE connection opened", connectionId);
            setIsConnected(true);
            setIsConnecting(false);
          },
          onClose: () => {
            console.log("Tool Response SSE connection closed", connectionId);
            cleanupConnection(connectionId);
            updateGlobalConnectionState();
          },
          onError: (error: any) => {
            console.error("Tool Response SSE Error:", error, connectionId);
            setAiError("Connection error occurred");
            handleConnectionError(connectionId);
          },
          onMessage: (event: AiChatEvent) => onMessage(event, connectionId),
        });

        if (response.ok && response.data) {
          connectionState.close = response.data.close;
        } else {
          throw new Error("Failed to connect for tool response");
        }
      } catch (error) {
        console.error("Failed to send tool response:", error);
        setAiError("Failed to connect for tool response");
        setIsConnecting(false);
        setIsConnected(false);
        cleanupConnection(connectionId);
      }
    },
    [
      addConversation,
      onMessage,
      cleanupConnection,
      updateGlobalConnectionState,
      handleConnectionFailure,
      handleConnectionError,
    ],
  );

  sendToolResponseRef.current = sendToolResponse;

  const isAiResponding = isConnecting || isConnected;

  return {
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
    isReconnecting,
  };
};
