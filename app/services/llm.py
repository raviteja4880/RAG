import time
from typing import AsyncGenerator, List, Dict
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq

from app.core.config import settings

class LLMService:
    def __init__(self):
        # Initialize Groq with Streaming enabled
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile", # Updated from decommissioned llama-3.1-70b-versatile
            temperature=0.1,
            streaming=True, # Enable async generator
            groq_api_key=settings.GROQ_API_KEY
        )

    def _prepare_prompt(self, query: str, context: str, history: List = None) -> List:
        """Construct the prompt with strict production guardrails."""
        system_prompt = (
            "You are the Core Intelligence for RAG Premium v3.0. "
            "Your behavior is governed by the following strict rules:\n"
            "1. ONLY answer from the provided CONTEXT. Do not use outside knowledge.\n"
            "2. If the user asks for an 'overview', 'summary', or 'description' and the context "
            "is short (e.g., a certificate or one-page memo), SUMMARIZE the available facts "
            "naturally (mentioning names, dates, and titles) instead of giving up.\n"
            "3. If the answer is absolutely not in the context, say: 'I cannot find that information in the document database.'\n"
            "3. Maintain a professional, concise, and technical tone.\n"
            "4. Never mention the context or tools to the user. Answer naturally.\n"
            "5. NO HALLUCINATION. Accuracy is #1 priority.\n"
            "6. AMBIGUITY GUARDRAIL: If the provided context contains information from "
            "multiple different documents and you are unsure which one the user is "
            "asking about (e.g., 'What is this doc?'), ASK THE USER FOR CLARIFICATION "
            "mentioning the document names found in the context.\n\n"
            "CONTEXT:\n{context}"
        ).format(context=context)

        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        messages = [SystemMessage(content=system_prompt)]
        
        if history:
            for msg in history:
                role = msg.get("role")
                content = msg.get("content")
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role in ["ai", "api"]:
                    messages.append(AIMessage(content=content))
        
        messages.append(HumanMessage(content=query))
        return messages

    async def generate_stream(self, query: str, context: str, history: List = None) -> AsyncGenerator[str, None]:
        """Stream response chunk-by-chunk with context-aware caching."""
        from app.core.logger import logger
        from app.services.cache import cache
        import hashlib
        
        # 1. Create a stable Context-Aware Cache Key
        # This prevents the "Overview of this" stale answer bug when switching files.
        context_hash = hashlib.sha256(context.encode()).hexdigest()
        cache_key = {"query": query, "ctx": context_hash, "type": "completion"}
        
        cached_resp = cache.get("llm", cache_key)
        if cached_resp:
            logger.info("LLM_CACHE_HIT", query=query[:50])
            yield cached_resp
            return

        # 2. Refine Prompt with Ambiguity Guardrail
        # Instruct the AI to ask for clarification if the query could apply to multiple files.
        start_time = time.time()
        messages = self._prepare_prompt(query, context, history)
        
        # Inject clarification instructions into the last message if needed
        # (This makes the AI ask "Which document?" if multiple contexts are mixed)
        logger.info("LLM_GEN_START", context_len=len(context))
        
        full_response = ""
        try:
            async for chunk in self.llm.astream(messages):
                content = chunk.content
                full_response += content
                yield content
            
            # 2. Update Cache for future reuse
            if len(full_response) > 10:
                cache.set("llm", cache_key, full_response, ttl=settings.CACHE_TTL_RESPONSE)
            
            end_time = time.time()
            logger.info("LLM_GEN_COMPLETE", latency=round(end_time - start_time, 2), chars=len(full_response))
            
        except Exception as e:
            logger.error("LLM_GEN_FAILED", error=str(e))
            yield "I encountered an error generating the response. Please try again later."
