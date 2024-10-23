import os
import pandas as pd

from fastapi import Depends, FastAPI, HTTPException, Security, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import List
from pydantic import BaseModel
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