from pydantic import BaseModel, Field

class ChatMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, description="The message from the user")
