import functools
from sentence_transformers import SentenceTransformer

class DirectEmbeddings:
    """Direct implementation of embeddings using sentence-transformers."""
    def __init__(self, model_name: str, encode_kwargs: dict = None):
        self.client = SentenceTransformer(model_name)
        self.encode_kwargs = encode_kwargs or {}

    def embed_documents(self, texts: list) -> list:
        # Handle conversion from numpy array to list
        embeddings = self.client.encode(texts, **self.encode_kwargs)
        return embeddings.tolist()

    def embed_query(self, text: str) -> list:
        embedding = self.client.encode([text], **self.encode_kwargs)[0]
        return embedding.tolist()

@functools.lru_cache()
def get_embeddings():
    """
    Singleton embeddings for ultra-fast warm starts.
    Uses sentence-transformers/all-MiniLM-L6-v2 directly for minimum dependencies.
    """
    print("INFO: Loading direct sentence-transformer (Warm Start)...")
    return DirectEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        encode_kwargs={'normalize_embeddings': True}
    )