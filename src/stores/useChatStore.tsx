import { hasWarned } from "motion/react";
import { ReactNode } from "react";
import { create } from "zustand";

export type ToolCall = {
  id: string;
  name: string;
  arguments?: any;
};

export type Conversation = {
  id?: string;
  role: string;
  content?: string | ReactNode;
  actionType?: string;
  choices?: string[];
  selectedChoices?: string[];
  options?: {
    label: string;
    value?: string;
  }[];
  disabled?: boolean;
  title?: string;
  hasInput?: boolean;
  responseToConversationId?: string;
  category?: string;
  citations?: number[]; // Citation numbers from <reference> tags
  citationReferences?: Record<number, { url: string; title?: string }>; // Citation number -> { url, title } from search_medical_facts for clickable links
  toolCalls?: ToolCall[]; // Tool calls made by the assistant
  metadata?: Record<string, any>; // Additional metadata for special handling
  debugMessages?: Array<{ step: number; messages: any[] }>; // Debug: full messages sent to LLM (dev only)
};

export type Chatroom = {
  id?: string;
  name: string;
  chatroomId?: string;
};

type SerializableConversation = Omit<Conversation, "content"> & {
  content: string | null;
  citations?: number[];
  citationReferences?: Record<number, { url: string; title?: string }>;
  toolCalls?: ToolCall[];
};

const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

const serializeConversation = (
  conversation: Conversation,
): SerializableConversation => {
  const { content, ...rest } = conversation;
  return {
    ...rest,
    content: isString(content) ? content : null,
  };
};

const deserializeConversation = (
  serialized: SerializableConversation,
): Conversation => {
  return {
    ...serialized,
    content: serialized.content || "",
  };
};

type BroadcastMessage =
  | {
      type: "ADD_CONVERSATION";
      payload: {
        chatroomId: string;
        conversation: SerializableConversation;
      };
    }
  | {
      type: "INIT_CONVERSATIONS";
      payload: {
        chatroomId: string;
        conversations: SerializableConversation[];
      };
    }
  | {
      type: "EDIT_CONVERSATION";
      payload: {
        chatroomId: string;
        conversationId: string;
        newConversation: Partial<SerializableConversation>;
      };
    }
  | {
      type: "REMOVE_CONVERSATION";
      payload: { chatroomId: string; conversationId: string };
    }
  | {
      type: "REMOVE_CHATROOM";
      payload: { chatroomId: string };
    }
  | {
      type: "REFRESH_CHATROOMS";
      payload: {};
    };

const CHANNEL_NAME = "chat-store-sync";
let broadcastChannel: BroadcastChannel | null = null;
let isListenerSetup = false;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn("Failed to initialize BroadcastChannel:", e);
  }
}

type ChatStore = {
  chatsByChatroomId: Record<string, Conversation[]> | null;
  addConversationToChat: (
    chatroomId: string,
    conversation: Conversation,
  ) => void;
  initConversationsToChat: (
    chatroomId: string,
    conversations: Conversation[],
  ) => void;
  editConversationById: (
    chatroomId: string,
    conversationId: string,
    newConversation: Partial<Conversation>,
  ) => Conversation | undefined;
  removeChatroom: (chatroomId: string) => void;
};

export const useChatStore = create<ChatStore>((set, get) => {
  if (broadcastChannel && !isListenerSetup) {
    isListenerSetup = true;
    broadcastChannel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const message = event.data;

      switch (message.type) {
        case "ADD_CONVERSATION": {
          const { chatroomId, conversation: serializedConversation } =
            message.payload;
          const conversation = deserializeConversation(serializedConversation);

          set((state) => {
            const existingConversations =
              state.chatsByChatroomId?.[chatroomId] || [];

            if (
              conversation.id &&
              existingConversations.some((c) => c.id === conversation.id)
            ) {
              return state;
            }

            return {
              chatsByChatroomId: {
                ...(state.chatsByChatroomId || {}),
                [chatroomId]: [...existingConversations, conversation],
              },
            };
          });
          break;
        }
        case "INIT_CONVERSATIONS": {
          const { chatroomId, conversations: serializedConversations } =
            message.payload;
          const conversations = serializedConversations.map(
            deserializeConversation,
          );

          set((state) => {
            const existingConversations = state.chatsByChatroomId?.[chatroomId];

            if (
              existingConversations &&
              existingConversations.length === conversations.length
            ) {
              const existingIds = existingConversations
                .map((c) => c.id)
                .join(",");
              const newIds = conversations.map((c) => c.id).join(",");
              if (existingIds === newIds) {
                return state;
              }
            }

            return {
              chatsByChatroomId: {
                ...(state.chatsByChatroomId || {}),
                [chatroomId]: conversations,
              },
            };
          });
          break;
        }
        case "EDIT_CONVERSATION": {
          const { chatroomId, conversationId, newConversation } =
            message.payload;

          set((state) => {
            const existingConversations =
              state.chatsByChatroomId?.[chatroomId] || [];
            const existingIndex = existingConversations.findIndex(
              (c) => c.id === conversationId,
            );

            if (existingIndex === -1) {
              return state;
            }

            const existingConversation = existingConversations[existingIndex];
            const updatedConversation = {
              ...existingConversation,
              ...newConversation,
            };

            const hasChanges = Object.keys(newConversation).some(
              (key) =>
                (existingConversation as any)[key] !==
                (updatedConversation as any)[key],
            );

            if (!hasChanges) {
              return state;
            }

            const updatedChat = [...existingConversations];
            updatedChat[existingIndex] = updatedConversation;

            return {
              chatsByChatroomId: {
                ...(state.chatsByChatroomId || {}),
                [chatroomId]: updatedChat,
              },
            };
          });
          break;
        }
        case "REMOVE_CONVERSATION": {
          const { chatroomId, conversationId } = message.payload;
          set((state) => {
            const existingConversations =
              state.chatsByChatroomId?.[chatroomId] || [];
            const filteredConversations = existingConversations.filter(
              (c) => c.id !== conversationId,
            );

            if (filteredConversations.length === existingConversations.length) {
              return state;
            }

            return {
              chatsByChatroomId: {
                ...(state.chatsByChatroomId || {}),
                [chatroomId]: filteredConversations,
              },
            };
          });
          break;
        }
        case "REMOVE_CHATROOM": {
          const { chatroomId } = message.payload;
          set((state) => {
            if (
              !state.chatsByChatroomId ||
              !state.chatsByChatroomId[chatroomId]
            ) {
              return state;
            }

            const { [chatroomId]: removed, ...remaining } =
              state.chatsByChatroomId;
            return {
              chatsByChatroomId: remaining,
            };
          });
          break;
        }
      }
    };
  }

  return {
    chatsByChatroomId: null,
    addConversationToChat: (chatroomId, conversation) => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: "ADD_CONVERSATION",
          payload: {
            chatroomId,
            conversation: serializeConversation(conversation),
          },
        } as BroadcastMessage);
      }

      set((state) => {
        const existing = state.chatsByChatroomId?.[chatroomId] || [];

        if (conversation.id && existing.some((c) => c.id === conversation.id)) {
          return state;
        }

        return {
          chatsByChatroomId: {
            ...(state.chatsByChatroomId || {}),
            [chatroomId]: [...existing, conversation],
          },
        };
      });
    },
    initConversationsToChat: (chatroomId, conversations) => {
      const shouldUpdate = (currentState: ChatStore["chatsByChatroomId"]) => {
        const existing = currentState?.[chatroomId];
        if (!existing) return true;
        // Don't overwrite if the store already has more conversations
        // (e.g. from streaming) than the backend query returned
        // (messages may still be in the async save queue)
        if (existing.length > conversations.length) return false;
        if (existing.length !== conversations.length) return true;
        const existingIds = existing.map((c) => c.id).join(",");
        const newIds = conversations.map((c) => c.id).join(",");
        return existingIds !== newIds;
      };

      const currentState = get().chatsByChatroomId;

      // Only broadcast if there's a change
      if (broadcastChannel && shouldUpdate(currentState)) {
        broadcastChannel.postMessage({
          type: "INIT_CONVERSATIONS",
          payload: {
            chatroomId,
            conversations: conversations.map(serializeConversation),
          },
        } as BroadcastMessage);
      }

      set((state) => {
        // Only update if there's a change
        if (!shouldUpdate(state.chatsByChatroomId)) {
          return state;
        }

        return {
          chatsByChatroomId: {
            ...(state.chatsByChatroomId || {}),
            [chatroomId]: conversations,
          },
        };
      });
    },
    editConversationById: (chatroomId, conversationId, newConversation) => {
      if (broadcastChannel) {
        const serializedUpdate: Partial<SerializableConversation> = {};
        for (const key in newConversation) {
          if (key === "content") {
            if (isString(newConversation.content)) {
              serializedUpdate.content = newConversation.content;
            }
          } else {
            (serializedUpdate as any)[key] = (newConversation as any)[key];
          }
        }
        broadcastChannel.postMessage({
          type: "EDIT_CONVERSATION",
          payload: {
            chatroomId,
            conversationId,
            newConversation: serializedUpdate,
          },
        } as BroadcastMessage);
      }

      let updatedConversation: Conversation | undefined;
      set((state) => {
        const updatedChat = (state.chatsByChatroomId?.[chatroomId] || []).map(
          (c) => {
            if (c.id === conversationId) {
              updatedConversation = { ...c, ...newConversation };
              return updatedConversation;
            }
            return c;
          },
        );
        return {
          chatsByChatroomId: {
            ...(state.chatsByChatroomId || {}),
            [chatroomId]: updatedChat,
          },
        };
      });
      return updatedConversation;
    },
    removeChatroom: (chatroomId) => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: "REMOVE_CHATROOM",
          payload: { chatroomId },
        } as BroadcastMessage);
      }

      set((state) => {
        if (!state.chatsByChatroomId) return state;

        const { [chatroomId]: removed, ...remaining } = state.chatsByChatroomId;
        return {
          chatsByChatroomId: remaining,
        };
      });
    },
  };
});

// Export function to broadcast chatroom refresh
export const broadcastChatroomRefresh = () => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: "REFRESH_CHATROOMS",
      payload: {},
    } as BroadcastMessage);
  }
};

if (broadcastChannel && typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    broadcastChannel?.close();
  });
}
