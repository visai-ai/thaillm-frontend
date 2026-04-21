import chat from "@/lib/api/chat";
import {
  broadcastChatroomRefresh,
  Chatroom,
  Conversation,
  useChatStore,
} from "@/stores/useChatStore";
import {
  parseResponseFormat,
  remapCitationReferences,
} from "@/utils/parseResponseFormat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useQueryListChatroom = (enabled: boolean) => {
  return useQuery<Chatroom[], Error>({
    queryKey: ["chatroom"],
    queryFn: async () => {
      const response = await chat.getChatRooms();
      if (response.ok && response.data) {
        return response.data.map((room) => ({
          id: room.id,
          name: room.title,
          chatroomId: room.id,
        }));
      }
      throw new Error("Failed to fetch chat rooms");
    },
    enabled,
  });
};

export const useCreateChatRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id?: string;
      title?: string;
      description?: string;
    }) => {
      const response = await chat.createChatRoom({
        requestBody: data,
      });
      if (response.ok && response.data) {
        return response.data;
      }
      throw new Error("Failed to create chat room");
    },
    onSuccess: async () => {
      // Invalidate and refetch chat rooms list
      queryClient.invalidateQueries({ queryKey: ["chatroom"] });

      // Broadcast to other tabs
      broadcastChatroomRefresh();
    },
  });
};

export const useDeleteChatRoom = () => {
  const queryClient = useQueryClient();
  const { removeChatroom } = useChatStore();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const response = await chat.deleteChatRoom(roomId);
      if (response.ok && response.data) {
        return response.data;
      }
      throw new Error("Failed to delete chat room");
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["chatroom"] });
      removeChatroom(roomId);

      // Broadcast to other tabs
      broadcastChatroomRefresh();
    },
  });
};

export const useQueryGetChatByChatroomId = (
  chatRoomId: string,
  { enabled }: { enabled: boolean },
) => {
  const { initConversationsToChat } = useChatStore();

  return useQuery<Conversation[], Error>({
    queryKey: ["conversation", chatRoomId],
    queryFn: async () => {
      const response = await chat.getConversations({ id: chatRoomId });
      if (response.ok && response.data) {
        // Filter out internal prescreen-pending conversations (tool call markers)
        const filtered = response.data.filter((conv) => {
          if (conv.actionType === "prescreen-pending") {
            return false;
          }
          return true;
        });

        const conversations = filtered.map((conv) => {
          // Parse content if it's a string and might contain response/reference format
          let content = conv.content;
          let citations: number[] | undefined = undefined;

          let renumberMap: Record<number, number> | undefined = undefined;
          if (typeof conv.content === "string" && conv.role === "assistant") {
            // Parse with isStreaming=false for more lenient parsing when loading from backend
            const parsed = parseResponseFormat(conv.content, false);
            // If we found response format, use parsed response and citations
            if (parsed.response || parsed.citations.length > 0) {
              content = parsed.response || conv.content;
              citations =
                parsed.citations.length > 0 ? parsed.citations : undefined;
              renumberMap = parsed.citationRenumberMap;
            } else {
              // If parsing didn't extract anything, use original content
              content = conv.content;
            }
          }

          const rawCitationRefs = (
            conv as {
              citationReferences?: Record<
                number,
                { url: string; title?: string }
              >;
            }
          ).citationReferences;

          return {
            id: conv.id,
            role: conv.role,
            content,
            actionType: conv.actionType || undefined,
            choices: conv.choices || undefined,
            selectedChoices: conv.selectedChoices || undefined,
            options:
              conv.options?.map((opt) => ({
                label: opt.label,
                value: opt.value,
              })) || undefined,
            disabled: conv.disabled,
            title: conv.title || undefined,
            hasInput: conv.hasInput,
            responseToConversationId:
              conv.responseToConversationId || undefined,
            category: conv.category || undefined,
            citations,
            citationReferences: remapCitationReferences(
              rawCitationRefs,
              renumberMap,
            ),
            toolCalls: conv.toolCalls
              ? conv.toolCalls.map((tc) => ({
                  id: tc.id,
                  name: tc.function.name,
                  arguments: JSON.parse(tc.function.arguments),
                }))
              : undefined,
            // metadata is not in the generated type but is sent by the backend
            // for prescreen step state — cast to access it
            metadata: (conv as any).metadata || undefined,
          };
        });

        // Initialize conversations in the store
        initConversationsToChat(chatRoomId, conversations);

        return conversations;
      }

      throw new Error("Failed to fetch conversations");
    },
    enabled,
  });
};

export const useCreateConversation = () => {
  const { addConversationToChat } = useChatStore();

  return {
    mutateAsync: async (data: {
      chatroomId: string;
      role: string;
      content: string;
      actionType?: string;
      choices?: string[];
      options?: { label: string; value?: string }[];
    }) => {
      // Generate a temporary ID for the conversation
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      const conversation: Conversation = {
        id: tempId,
        role: data.role,
        content: data.content,
        actionType: data.actionType,
        choices: data.choices,
        options: data.options,
      };

      // Add conversation directly to the store
      addConversationToChat(data.chatroomId, conversation);

      return conversation;
    },
    isPending: false,
    error: null,
  };
};

// Hook for upserting conversations in the backend (creates or updates)
export const useUpsertConversation = () => {
  return {
    mutateAsync: async (data: {
      id?: string;
      chatroomId: string;
      role?: string;
      content?: string;
      actionType?: string;
      choices?: string[];
      selectedChoices?: string[];
      options?: { label: string; value?: string }[];
      disabled?: boolean;
      title?: string;
      hasInput?: boolean;
      responseToConversationId?: string;
      category?: string;
      toolCalls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
      metadata?: Record<string, any>;
    }) => {
      const response = await chat.upsertConversation({
        requestBody: data,
      });
      if (response.ok && response.data) {
        return response.data;
      }
      throw new Error("Failed to upsert conversation");
    },
    isPending: false,
    error: null,
  };
};

// Hook for initializing conversations and creating them in the backend
export const useInitConversationsWithAPI = () => {
  const { initConversationsToChat } = useChatStore();
  const upsert = useUpsertConversation();

  const initConversations = async (
    chatroomId: string,
    conversations: Conversation[],
  ) => {
    // First, initialize conversations in the store
    initConversationsToChat(chatroomId, conversations);

    // Then, create each conversation in the backend
    for (const conversation of conversations) {
      try {
        await upsert.mutateAsync({
          id: conversation.id,
          chatroomId,
          role: conversation.role,
          content:
            typeof conversation.content === "string"
              ? conversation.content
              : JSON.stringify(conversation.content),
          actionType: conversation.actionType,
          choices: conversation.choices,
          options: conversation.options,
        });
      } catch (error) {
        console.error("Failed to create conversation in backend:", error);
        // Keep the conversation with temporary ID if backend creation fails
      }
    }
  };

  return { initConversations };
};

// Combined hook for managing chat conversations with store integration
export const useChatConversations = (
  chatroomId: string,
  chatroomCreated: boolean,
) => {
  const { chatsByChatroomId, addConversationToChat, editConversationById } =
    useChatStore();

  const enabledQuery = chatroomCreated && !chatsByChatroomId?.[chatroomId];
  const query = useQueryGetChatByChatroomId(chatroomId, {
    enabled: enabledQuery,
  });

  const upsertConversation = useUpsertConversation();
  const createChatRoomMutation = useCreateChatRoom();

  // Get conversations from store if available, otherwise from query
  const conversations = chatsByChatroomId?.[chatroomId] ?? query.data ?? [];

  /**
   * Add a new conversation to the chat
   */
  const addConversation = async (
    conversation: Omit<Conversation, "id"> & { id?: string },
    shouldSave: boolean = false,
  ) => {
    try {
      const storeConversation = {
        chatroomId,
        role: conversation.role,
        content: conversation.content,
        actionType: conversation.actionType,
        choices: conversation.choices,
        selectedChoices: conversation.selectedChoices,
        options: conversation.options,
        disabled: conversation.disabled,
        title: conversation.title,
        hasInput: conversation.hasInput,
        responseToConversationId: conversation.responseToConversationId,
        category: conversation.category,
        toolCalls: conversation.toolCalls,
        metadata: conversation.metadata,
        ...(conversation.id && { id: conversation.id }),
      };

      if (!chatroomCreated && conversation.role === "user") {
        await createChatRoomMutation.mutateAsync({
          id: chatroomId,
        });
      }

      addConversationToChat(chatroomId, storeConversation);
      if (shouldSave) {
        try {
          await upsertConversation.mutateAsync({
            id: conversation.id,
            chatroomId,
            role: conversation.role,
            content: conversation.content as string,
            actionType: conversation.actionType,
            choices: conversation.choices,
            selectedChoices: conversation.selectedChoices,
            options: conversation.options,
            disabled: conversation.disabled,
            title: conversation.title,
            hasInput: conversation.hasInput,
            responseToConversationId: conversation.responseToConversationId,
            category: conversation.category,
            toolCalls: conversation.toolCalls
              ? conversation.toolCalls.map((tc) => ({
                  id: tc.id,
                  type: "function" as const,
                  function: {
                    name: tc.name,
                    arguments: JSON.stringify(tc.arguments || {}),
                  },
                }))
              : undefined,
          });
        } catch (apiError) {
          console.warn("Failed to save conversation to backend:", apiError);
        }
      }
    } catch (error) {
      console.error("Failed to add conversation:", error);
      throw error;
    }
  };

  /**
   * Edit an existing conversation
   */
  const editConversation = async (
    conversationId: string,
    updates: Partial<Conversation>,
    shouldSave: boolean = false,
  ) => {
    editConversationById(chatroomId, conversationId, updates);
    if (shouldSave) {
      try {
        await upsertConversation.mutateAsync({
          id: conversationId,
          chatroomId,
          role: updates.role || "assistant",
          content: updates.content as string,
          actionType: updates.actionType,
          choices: updates.choices,
          selectedChoices: updates.selectedChoices,
          options: updates.options,
          disabled: updates.disabled,
          title: updates.title,
          hasInput: updates.hasInput,
          responseToConversationId: updates.responseToConversationId,
          category: updates.category,
          metadata: updates.metadata,
        });
      } catch (apiError) {
        console.warn(
          "Failed to save updated conversation to backend:",
          apiError,
        );
      }
    }
  };

  return {
    conversations,
    isLoading: query.isLoading,
    error: query.error,
    addConversation,
    editConversation,
  };
};
