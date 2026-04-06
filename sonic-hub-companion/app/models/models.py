import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, Date,
    ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class Assistant(Base):
    __tablename__ = "companion_assistants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    nickname = Column(String(50), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    person_id = Column(String(255), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    bio = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    # Telegram bot config
    telegram_bot_token = Column(String(255), nullable=True)
    telegram_bot_username = Column(String(100), nullable=True)
    telegram_enabled = Column(Boolean, default=False)
    telegram_owner_id = Column(String(50), nullable=True)  # only this user can chat
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    personalities = relationship("Personality", back_populates="assistant")
    conversations = relationship("Conversation", back_populates="assistant")
    episodes = relationship("Episode", back_populates="assistant")
    user_profiles = relationship("UserProfile", back_populates="assistant")
    vocabulary = relationship("Vocabulary", back_populates="assistant")
    dynamics = relationship("Dynamics", back_populates="assistant")


class Channel(Base):
    __tablename__ = "companion_channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String(50), nullable=False)
    external_id = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="channel")

    __table_args__ = (
        Index("idx_channel_type_external", "type", "external_id", unique=True),
    )


class Conversation(Base):
    __tablename__ = "companion_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistant_id = Column(UUID(as_uuid=True), ForeignKey("companion_assistants.id"), nullable=False)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("companion_channels.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    assistant = relationship("Assistant", back_populates="conversations")
    channel = relationship("Channel", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.timestamp")

    __table_args__ = (
        Index("idx_conv_assistant_channel", "assistant_id", "channel_id"),
    )


class Message(Base):
    __tablename__ = "companion_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("companion_conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    channel_type = Column(String(50), nullable=False)
    metadata_ = Column("metadata", JSONB, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index("idx_message_conversation_ts", "conversation_id", "timestamp"),
    )


class UserProfile(Base):
    __tablename__ = "companion_user_profile"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistant_id = Column(UUID(as_uuid=True), ForeignKey("companion_assistants.id"), nullable=False)
    category = Column(String(50), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=False)
    period = Column(String(50), nullable=True)  # NULL=current, "2013", "2010-2012"
    confidence = Column(Float, default=1.0)
    source_message_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assistant = relationship("Assistant", back_populates="user_profiles")

    __table_args__ = (
        Index("idx_profile_assistant_key_period", "assistant_id", "key", "period", unique=True),
        Index("idx_profile_category", "category"),
    )


class Episode(Base):
    __tablename__ = "companion_episodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistant_id = Column(UUID(as_uuid=True), ForeignKey("companion_assistants.id"), nullable=False)
    summary = Column(Text, nullable=False)
    emotion = Column(String(50), nullable=True)
    importance = Column(Integer, default=5)
    occurred_at = Column(DateTime, default=datetime.utcnow)
    source_conversation_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assistant = relationship("Assistant", back_populates="episodes")

    __table_args__ = (
        Index("idx_episode_assistant", "assistant_id"),
        Index("idx_episode_importance", "importance"),
        Index("idx_episode_occurred", "occurred_at"),
    )


class Personality(Base):
    __tablename__ = "companion_personality"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistant_id = Column(UUID(as_uuid=True), ForeignKey("companion_assistants.id"), nullable=False)
    aspect = Column(String(50), nullable=False)
    instruction = Column(Text, nullable=False)
    examples = Column(JSONB, nullable=True)
    active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assistant = relationship("Assistant", back_populates="personalities")

    __table_args__ = (
        Index("idx_personality_assistant_aspect", "assistant_id", "aspect", unique=True),
    )


class Vocabulary(Base):
    __tablename__ = "companion_vocabulary"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistant_id = Column(UUID(as_uuid=True), ForeignKey("companion_assistants.id"), nullable=False)
    phrase = Column(Text, nullable=False)  # "thôi e out đây a ạ"
    context = Column(String(100), nullable=True)  # greeting, goodbye, reaction, pet_name, inside_joke
    frequency = Column(String(20), default="common")  # rare, common, very_common
    created_at = Column(DateTime, default=datetime.utcnow)

    assistant = relationship("Assistant", back_populates="vocabulary")

    __table_args__ = (
        Index("idx_vocab_assistant", "assistant_id"),
    )


class Dynamics(Base):
    __tablename__ = "companion_dynamics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistant_id = Column(UUID(as_uuid=True), ForeignKey("companion_assistants.id"), nullable=False)
    period = Column(String(100), nullable=False)  # "2010-2011", "early", "mid", "late"
    description = Column(Text, nullable=False)
    sentiment = Column(String(50), nullable=True)  # warm, close, distant, romantic, tense
    created_at = Column(DateTime, default=datetime.utcnow)

    assistant = relationship("Assistant", back_populates="dynamics")

    __table_args__ = (
        Index("idx_dynamics_assistant", "assistant_id"),
    )


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id = Column(String(20), primary_key=True)  # short uuid
    type = Column(String(50), nullable=False)  # import_chat, extract_memory, etc.
    status = Column(String(20), nullable=False, default="pending")  # pending, running, done, error
    progress = Column(Text, nullable=True)
    result = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_job_status", "status"),
        Index("idx_job_type", "type"),
    )
