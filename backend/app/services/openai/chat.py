"""
app/services/openai/chat.py — Handles conversational AI logic for the workspace playground.
Uses GPT-4o to answer questions and analyze the current run context.
"""
from __future__ import annotations

import openai
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.message import AgentMessage
from app.models.run import DesignRun

# Async client
client = openai.AsyncOpenAI(
    api_key=settings.openai_api_key,
    timeout=settings.openai_timeout,
    max_retries=settings.openai_max_retries,
)

SYSTEM_PROMPT = """
You are CircuitAgent, an expert analog circuit design AI assistant.
You are helping an engineer design and optimize circuits such as Operational Amplifiers.
The user is interacting with you inside a workspace playground interface where they can see their SPICE netlist, circuit schematic canvas, and simulation results.
Answer their questions concisely and clearly using Markdown.
If they ask for circuit modifications, explain the necessary parameter changes or trade-offs (e.g., gain vs. bandwidth).
Keep responses fairly brief unless explicitly asked for detailed analysis. Avoid repeating standard greetings.
"""

async def handle_agent_chat(run_id: str, user_message: str, db: AsyncSession) -> AgentMessage:
    """
    Given a user message and a run ID:
    1. Fetches previous messages from the run to provide conversation context.
    2. Calls OpenAI GPT-4o.
    3. Saves both the user message and the agent response to the database.
    4. Returns the agent's message record.
    """
    
    # 1. Fetch previous context
    # Get up to the last 20 messages for context window management
    history_query = select(AgentMessage).where(
        AgentMessage.run_id == run_id
    ).order_by(AgentMessage.created_at.desc()).limit(20)
    
    history_result = await db.execute(history_query)
    messages_db = history_result.scalars().all()
    # Reverse to chronological order for the API
    messages_db.reverse()
    
    # Optional: fetch a bit of run info to give the LLM context (skipped here to minimize latency)
    
    # 2. Build the messages array for the OpenAI API
    api_messages = [{"role": "system", "content": SYSTEM_PROMPT.strip()}]
    
    for msg in messages_db:
        # Map roles to openai roles
        api_role = "user" if msg.role == "user" else "assistant"
        # Ignore system notifications from frontend
        if msg.role != "system":
            api_messages.append({"role": api_role, "content": msg.content})
            
    # Append the new user message
    api_messages.append({"role": "user", "content": user_message})
    
    # 3. Call OpenAI
    completion = await client.chat.completions.create(
        model=settings.openai_model,
        messages=api_messages,
        temperature=0.4,
    )
    
    reply_text = completion.choices[0].message.content or "I'm having trouble reasoning about that request right now."
    
    import uuid
    from datetime import datetime, timezone
    now_utc = datetime.now(timezone.utc)
    
    # 4. Save user message to DB
    user_msg_db = AgentMessage(
        id=str(uuid.uuid4()),
        run_id=run_id,
        role="user",
        content=user_message,
        created_at=now_utc
    )
    db.add(user_msg_db)
    
    # 5. Save agent message to DB
    agent_msg_db = AgentMessage(
        id=str(uuid.uuid4()),
        run_id=run_id,
        role="agent",
        content=reply_text,
        created_at=now_utc
    )
    db.add(agent_msg_db)
    
    await db.commit()
    
    return agent_msg_db
