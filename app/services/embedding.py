from langchain_huggingface import HuggingFaceEmbeddings
import functools

@functools.lru_cache()
def get_embeddings():
    """
    Singleton embeddings for ultra-fast warm starts.
    Uses sentence-transformers/all-MiniLM-L6-v2 for industry-level latency balancing.
    """
    print("INFO: Loading shared embedding model (Warm Start)...")
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        encode_kwargs={'normalize_embeddings': True}
    )