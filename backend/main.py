import os
import pandas as pd

from fastapi import Depends, FastAPI, HTTPException, Security, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import List, Optional, Union
from pydantic import BaseModel, Field
from starlette.staticfiles import StaticFiles
from db import *

app = FastAPI(root_path="/api")

origins = [
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class UserFileEntry(BaseModel):
    User: Union[str, bool]
    Age: Union[str, bool]
    Gender: Union[str, bool]
    Occupation: Union[str, bool]
    Residence: Union[str, bool]

class ItemFileEntry(BaseModel):
    Item: Union[str, bool]
    Performer: Union[str, bool]
    Type: Union[str, bool]
    Release_date: Union[str, bool]

class InteractionFIleEntry(BaseModel):
    User: Union[str, bool]
    Item: Union[str, bool]
    Interaction: Optional[List[str]]
class RequestData(BaseModel):
    id: Optional[str]
    user_file: Optional[List[UserFileEntry]]
    item_file: Optional[List[ItemFileEntry]]
    interaction_file: Optional[List[InteractionFIleEntry]]


@app.get("/")
async def read_root():
    return {"message": "Hello World"}



@app.post("/uploadfiles/")
async def create_upload_file(    
    user_file: UploadFile = File(...),
    item_file: UploadFile = File(...),
    interaction_file: UploadFile = File(...)
):
    db = DATABASE()

    user_file_content = await user_file.read()
    item_file_content = await item_file.read()
    interaction_file_content = await interaction_file.read()
    columns_list = db.put_data(user_file=user_file_content, 
                               item_file=item_file_content, 
                               interaction_file=interaction_file_content)
    return columns_list




@app.post("/process_data")
async def process_data(data: List[RequestData]):
    db = DATABASE()

    response_data = {}
    for entry in data:
        if entry.id:
            response_data.update({"id": entry.id})
        if entry.user_file:
            for user in entry.user_file:
                response_data.update({
                    "user_data": {
                        "user_id": user.User,
                        "age": user.Age,
                        "gender": user.Gender,
                        "occupation": user.Occupation,
                        "residence": user.Residence
                    }
                })
        if entry.item_file:
            for item in entry.item_file:
                response_data.update({
                    "item_data": {
                        "item_id": item.Item,
                        "performer": item.Performer,
                        "type": item.Type,
                        "release_date": item.Release_date
                    }
                })
        if entry.interaction_file:
            for item in entry.interaction_file:
                response_data.update({
                    "interaction_data": {
                        "user_id": item.User,
                        "item_id": item.Item,
                        "interaction_list": item.Interaction
                    }
                })
    result = db.data_processing(response_data)

    if result.get("status") != 200:
        raise HTTPException(
            status_code=result["status"],
            detail={"error": result["error"], "message": result["detail"]}
        )

    return result