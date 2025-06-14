from sqlalchemy import Column, Integer, DateTime, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.infrastructure.database import Base
import uuid
import enum


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"


class MessageStatus(str, enum.Enum):
    PENDING = "pending"
    STREAMING = "streaming"
    COMPLETED = "completed"
    FAILED = "failed"


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sequence_number = Column(Integer, nullable=False)
    role = Column(Enum(MessageRole, name="message_role", values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    content = Column(Text, nullable=False)
    model_used = Column(Text, nullable=True)
    status = Column(Enum(MessageStatus, name="message_status", values_callable=lambda obj: [e.value for e in obj]), default=MessageStatus.COMPLETED)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

    def __repr__(self):
        return f"<Message(id={self.id}, role={self.role}, sequence={self.sequence_number})>" 