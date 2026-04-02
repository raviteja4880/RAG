from pydantic import BaseModel
from typing import List, Optional, Dict

class QuestionRequest(BaseModel):
    question: str
    chat_history: Optional[List[Dict[str, str]]] = None

class AnswerResponse(BaseModel):
    answer: str