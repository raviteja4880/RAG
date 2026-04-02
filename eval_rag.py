import asyncio
import time
from app.services.retrieval import RetrievalService
from app.services.llm import LLMService

async def run_eval():
    """Lightweight E2E RAG evaluation script."""
    retrieval = RetrievalService()
    llm = LLMService()
    
    test_queries = [
        "Who is the applicant in the document?",
        "What are the main skills mentioned?",
        "Is there any mention of Python?"
    ]
    
    print("\n--- 📊 RAG PREMIUM v2.1 EVALUATION ---")
    for q in test_queries:
        print(f"\n🔍 Query: {q}")
        start = time.time()
        
        # 1. Evaluate Retrieval
        docs = retrieval.retrieve_and_rerank(q)
        retr_time = time.time() - start
        print(f"✅ Retrieved {len(docs)} chunks (Time: {retr_time:.2f}s)")
        
        # 2. Evaluate Generation
        print("🤖 Response: ", end="", flush=True)
        context = "\n".join([d.page_content for d in docs])
        full_text = ""
        async for chunk in llm.generate_stream(q, context):
            print(chunk, end="", flush=True)
            full_text += chunk
        
        total_time = time.time() - start
        print(f"\n⏱️  Total Latency: {total_time:.2f}s")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(run_eval())
