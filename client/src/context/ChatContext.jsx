import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map()); // convId -> Set(userIds)
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingChats(true);
      const res = await api.get('/chats');
      if (res.data.success) {
        setConversations(res.data.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
    }
  }, [user, fetchConversations]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await api.get(`/messages/${activeConversation._id}`);
        if (res.data.success) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Mark as seen locally & join socket room
    if (socket) {
      socket.emit('join_conversation', { conversationId: activeConversation._id });
      socket.emit('mark_messages_seen', {
        conversationId: activeConversation._id,
        senderId: activeConversation.recipient?._id,
      });
    }

    // Reset unread count for this conversation in list
    setConversations((prev) =>
      prev.map((c) => (c._id === activeConversation._id ? { ...c, unreadCount: 0 } : c))
    );

    return () => {
      if (socket) {
        socket.emit('leave_conversation', { conversationId: activeConversation._id });
      }
    };
  }, [activeConversation?._id, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // 1. New incoming message
    const handleNewMessage = ({ message, conversationId }) => {
      // Check if message belongs to active conversation
      if (activeConversation && activeConversation._id === conversationId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });

        // Mark as seen immediately if active
        socket.emit('mark_messages_seen', {
          conversationId,
          senderId: message.sender?._id || message.sender,
        });
      }

      // Update conversation list item
      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c._id === conversationId);
        if (existingIndex > -1) {
          const updated = [...prev];
          const conv = { ...updated[existingIndex] };
          conv.lastMessage = message;
          conv.lastMessageAt = message.createdAt;
          if (!activeConversation || activeConversation._id !== conversationId) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
          // Move to top
          updated.splice(existingIndex, 1);
          return [conv, ...updated];
        } else {
          // If brand new conversation, refresh conversations list
          fetchConversations();
          return prev;
        }
      });
    };

    // 2. Messages seen notification
    const handleMessagesSeen = ({ conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender?._id?.toString() === user?._id?.toString() || m.sender?.toString() === user?._id?.toString()
              ? { ...m, status: 'seen' }
              : m
          )
        );
      }
    };

    // 3. Message single status updated (e.g. delivered)
    const handleStatusUpdated = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status } : m))
      );
    };

    // 4. Message edited
    const handleMessageEdited = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.lastMessage?._id === updatedMessage._id
            ? { ...c, lastMessage: updatedMessage }
            : c
        )
      );
    };

    // 5. Message deleted
    const handleMessageDeleted = ({ messageId, isDeletedForEveryone }) => {
      if (isDeletedForEveryone) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? {
                  ...m,
                  isDeletedForEveryone: true,
                  text: 'This message was deleted',
                  media: { url: '', fileName: '', fileType: '', fileSize: 0 },
                  reactions: [],
                }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    };

    // 6. Message reaction updated
    const handleReactionUpdated = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
    };

    // 7. Typing status
    const handleUserTyping = ({ conversationId, userId, name }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const set = next.get(conversationId) || new Set();
        set.add(userId);
        next.set(conversationId, set);
        return next;
      });
    };

    const handleUserStopTyping = ({ conversationId, userId }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const set = next.get(conversationId);
        if (set) {
          set.delete(userId);
          if (set.size === 0) next.delete(conversationId);
        }
        return next;
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_seen', handleMessagesSeen);
    socket.on('message_status_updated', handleStatusUpdated);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_reaction_updated', handleReactionUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_seen', handleMessagesSeen);
      socket.off('message_status_updated', handleStatusUpdated);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_reaction_updated', handleReactionUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [socket, activeConversation, user?._id, fetchConversations]);

  // Start or open conversation with target user
  const openChatWithUser = async (targetUser) => {
    try {
      const res = await api.post('/chats', { recipientId: targetUser._id });
      if (res.data.success) {
        const conv = res.data.conversation;
        setActiveConversation(conv);
        setConversations((prev) => {
          const exists = prev.find((c) => c._id === conv._id);
          if (exists) return prev;
          return [conv, ...prev];
        });
        return conv;
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
      throw err;
    }
  };

  // Send message action
  const sendMessage = async ({ text, media, type }) => {
    if (!activeConversation) return;

    const payload = {
      conversationId: activeConversation._id,
      recipientId: activeConversation.recipient?._id,
      text,
      media,
      type,
      replyToId: replyingTo?._id || null,
    };

    // Clear reply state
    setReplyingTo(null);

    // Send via socket with fallback to REST API
    if (socket && socket.connected) {
      socket.emit('send_message', payload, (res) => {
        if (res?.success) {
          setMessages((prev) => [...prev, res.message]);
          setConversations((prev) => {
            const index = prev.findIndex((c) => c._id === activeConversation._id);
            if (index > -1) {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                lastMessage: res.message,
                lastMessageAt: res.message.createdAt,
              };
              const [moved] = updated.splice(index, 1);
              return [moved, ...updated];
            }
            return prev;
          });
        }
      });
    } else {
      const res = await api.post('/messages', payload);
      if (res.data.success) {
        setMessages((prev) => [...prev, res.data.message]);
        fetchConversations();
      }
    }
  };

  // Edit message
  const editMessageText = async (messageId, newText) => {
    try {
      const res = await api.put(`/messages/${messageId}`, { text: newText });
      if (res.data.success) {
        const updatedMsg = res.data.message;
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? updatedMsg : m))
        );
        if (socket) {
          socket.emit('message_edited', {
            message: updatedMsg,
            conversationId: activeConversation?._id,
            recipientId: activeConversation?.recipient?._id,
          });
        }
        setEditingMessage(null);
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
      throw err;
    }
  };

  // Delete message
  const deleteMessageAction = async (messageId, deleteForEveryone = false) => {
    try {
      const res = await api.delete(`/messages/${messageId}`, {
        data: { deleteForEveryone },
      });
      if (res.data.success) {
        if (deleteForEveryone) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? {
                    ...m,
                    isDeletedForEveryone: true,
                    text: 'This message was deleted',
                    media: { url: '', fileName: '', fileType: '', fileSize: 0 },
                    reactions: [],
                  }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
        }

        if (socket) {
          socket.emit('message_deleted', {
            messageId,
            conversationId: activeConversation?._id,
            recipientId: activeConversation?.recipient?._id,
            isDeletedForEveryone,
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      throw err;
    }
  };

  // React to message
  const reactToMessageAction = async (messageId, emoji) => {
    try {
      const res = await api.post(`/messages/${messageId}/react`, { emoji });
      if (res.data.success) {
        const updatedMsg = res.data.message;
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? updatedMsg : m))
        );
        if (socket) {
          socket.emit('message_reaction', {
            message: updatedMsg,
            conversationId: activeConversation?._id,
            recipientId: activeConversation?.recipient?._id,
          });
        }
      }
    } catch (err) {
      console.error('Failed to react to message:', err);
      throw err;
    }
  };

  const isRecipientTyping =
    activeConversation &&
    typingUsers.get(activeConversation._id)?.has(activeConversation.recipient?._id);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversation,
        messages,
        loadingChats,
        loadingMessages,
        isRecipientTyping,
        replyingTo,
        setReplyingTo,
        editingMessage,
        setEditingMessage,
        fetchConversations,
        openChatWithUser,
        sendMessage,
        editMessageText,
        deleteMessageAction,
        reactToMessageAction,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
