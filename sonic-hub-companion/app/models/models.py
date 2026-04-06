import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class Channel(Base):
    __tablename__ = "companion_channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String(50), nullable=False)  # telegram, web, zalo
    external_id = Column(String(255))  # telegram chat_id, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="channel")

    __table_args__ = (
        Index("idx_channel_type_external", "type", "external_id", unique=True),
    )


class Conversation(Base):
    __tablename__ = "companion_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("companion_channels.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    channel = relationship("Channel", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.timestamp")


class Message(Base):
    __tablename__ = "companion_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("companion_conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant
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
    category = Column(String(50), nullable=False)  # personality, preference, life_event, relationship
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    source_message_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_profile_category", "category"),
        Index("idx_profile_key", "key", unique=True),
    )


class Episode(Base):
    __tablename__ = "companion_episodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    summary = Column(Text, nullable=False)
    emotion = Column(String(50), nullable=True)  # happy, sad, stressed, excited
    importance = Column(Integer, default=5)  # 1-10
    occurred_at = Column(DateTime, default=datetime.utcnow)
    source_conversation_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_episode_importance", "importance"),
        Index("idx_episode_occurred", "occurred_at"),
    )


class Personality(Base):
    __tablename__ = "companion_personality"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aspect = Column(String(50), nullable=False)  # tone, language, boundary, habit, identity
    instruction = Column(Text, nullable=False)
    examples = Column(JSONB, nullable=True)  # {"good": [...], "bad": [...]}
    active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_personality_aspect", "aspect"),
    )
