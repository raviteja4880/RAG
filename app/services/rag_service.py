import json
import threading
import os
import datetime
from rapidocr_onnxruntime import RapidOCR
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.documents import Document
from langchain_groq import ChatGroq
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.utils.file_loader import load_pdf
from app.services.embedding import get_embeddings
from app.core.config import settings
from app.services.vector_store import (
    create_vector_store,
    load_vector_store
)

class RAGService:
    def __init__(self):
        self.db = None
        
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not found in environment")
            
        if not settings.MONGODB_URI:
            raise ValueError("MONGODB_URI not found in environment")

        self.llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0,
            groq_api_key=settings.GROQ_API_KEY
        )

    def process_file(self, file_path: str):
        try:
            ext = os.path.splitext(file_path)[1].lower()
            
            # 1. READ & EXTRACT (with OCR support)
            if ext == '.pdf':
                documents = load_pdf(file_path)
                if not documents or not any(d.page_content.strip() for d in documents):
                    import fitz
                    documents = []
                    doc = fitz.open(file_path)
                    engine = RapidOCR()
                    for page_num in range(len(doc)):
                        page = doc.load_page(page_num)
                        pix = page.get_pixmap()
                        img_path = f"t_img_{page_num}.png"
                        pix.save(img_path)
                        res, _ = engine(img_path)
                        txt = "".join([l[1] + "\n" for l in res]) if res else ""
                        documents.append(Document(page_content=txt, metadata={"source": os.path.basename(file_path), "page": page_num}))
                        os.remove(img_path)
                    doc.close()
            elif ext in ['.png', '.jpg', '.jpeg']:
                engine = RapidOCR()
                result, _ = engine(file_path)
                text = "".join([l[1] + "\n" for l in result]) if result else ""
                documents = [Document(page_content=text, metadata={"source": os.path.basename(file_path)})]
            else:
                raise ValueError(f"Unsupported format: {ext}")

            # 2. SPLIT & TAG
            splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            docs = splitter.split_documents(documents)
            if not docs: raise ValueError("No content extracted.")

            for doc in docs:
                doc.metadata["created_at"] = datetime.datetime.utcnow().isoformat()
                doc.metadata["source"] = os.path.basename(file_path)

            # 3. DUAL-PUSH: REDIS CACHE + MONGODB DB
            embeddings = get_embeddings()
            self.db = create_vector_store(docs, embeddings)
            
            return True

        except Exception as e:
            raise Exception(f"Failed to process {file_path}: {str(e)}")

    def load_db(self):
        try:
            embeddings = get_embeddings()
            self.db = load_vector_store(embeddings)
        except Exception as e:
            raise Exception(f"Error loading DB: {str(e)}")

    def ask(self, query: str, history=None):
        try:
            if not self.db:
                self.load_db()

            retriever = self.db.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 5}
            )

            # Convert history to LangChain messages
            formatted_history = []
            if history:
                for msg in history:
                    if msg.get("role") == "user":
                        formatted_history.append(HumanMessage(content=msg.get("content")))
                    elif msg.get("role") == "ai":
                        formatted_history.append(AIMessage(content=msg.get("content")))

            # 1. Contextualize Question Chain (Pure LCEL)
            contextualize_q_system_prompt = (
                "Given a chat history and the latest user question "
                "which might reference context in the chat history, "
                "formulate a standalone question which can be understood "
                "without the chat history. Do NOT answer the question, "
                "just reformulate it if needed and otherwise return it as is."
            )
            contextualize_q_prompt = ChatPromptTemplate.from_messages([
                ("system", contextualize_q_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ])
            
            # This chain creates the standalone question
            contextualized_question_chain = (
                contextualize_q_prompt 
                | self.llm 
                | StrOutputParser()
            )

            # 2. Main RAG Chain (Pure LCEL)
            qa_system_prompt = (
                "You are an assistant for question-answering tasks. "
                "Use the following pieces of retrieved context to answer the question. "
                "If you don't know the answer, just say that you don't know. "
                "Use three sentences maximum and keep the answer concise."
                "\n\n"
                "{context}"
            )
            qa_prompt = ChatPromptTemplate.from_messages([
                ("system", qa_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ])

            def format_docs(docs):
                return "\n\n".join(doc.page_content for doc in docs)

            # The final logic:
            # 1. Create a standalone question
            # 2. Retrieve docs based on it
            # 3. Answer using the docs and history
            
            # Run contextualization
            standalone_question = contextualized_question_chain.invoke({
                "input": query,
                "chat_history": formatted_history
            })

            # Retrieve context
            docs = retriever.invoke(standalone_question)
            context = format_docs(docs)

            # Generate final answer
            final_chain = qa_prompt | self.llm | StrOutputParser()
            
            return final_chain.invoke({
                "input": query,
                "chat_history": formatted_history,
                "context": context
            })

        except Exception as e:
            print(f"DEBUG RAG ERROR: {e}")
            raise Exception(f"Error answering query: {str(e)}")