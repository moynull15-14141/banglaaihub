export interface MessagingUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  other_participant: MessagingUser;
  last_message: Message | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
}
