import os
import pandas as pd
import zipfile
import shutil

from fastapi import Depends, FastAPI, HTTPException, Security, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import List, Optional, Union
from pydantic import BaseModel
from uuid import UUID
from yaml import full_load
from pathlib import Path
from db import *
from data_processing import *
from data_sampling import *

with open('config.yml') as f:
    file = full_load(f)

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
    user: Union[str, bool]
    age: Union[str, bool]
    gender: Union[str, bool]
    occupation: Union[str, bool]
    residence: Union[str, bool]

class ItemFileEntry(BaseModel):
    item: Union[str, bool]
    item_name: Union[str, bool]
    performer: Union[str, bool]
    type: Union[str, bool]
    release_date: Union[str, bool]

class InteractionFIleEntry(BaseModel):
    user: Union[str, bool]
    item: Union[str, bool]
    rating: Union[str, bool]
    interaction: Union[List[str], bool, None]
class RequestData(BaseModel):
    id: Optional[str]
    user_data: Optional[UserFileEntry]
    item_data: Optional[ItemFileEntry]
    interaction_data: Optional[InteractionFIleEntry]


@app.post("/uploadfiles/")
async def create_upload_file(    
    dataset_name: str,
    user_file: UploadFile = File(...),
    item_file: UploadFile = File(...),
    interaction_file: UploadFile = File(...)
):
    db = DATABASE()

    user_file_content = await user_file.read()
    await user_file.seek(0)
    item_file_content = await item_file.read()
    await item_file.seek(0)
    interaction_file_content = await interaction_file.read()
    await interaction_file.seek(0)

    columns_list = db.put_data(dataset_name = dataset_name,
                               user_file=user_file_content, 
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
        if entry.user_data:
            response_data.update({
                "user_data": {
                    "user_id": entry.user_data.user,
                    "age": entry.user_data.age,
                    "gender": entry.user_data.gender,
                    "occupation": entry.user_data.occupation,
                    "residence": entry.user_data.residence
                }
            })
        if entry.item_data:
            response_data.update({
                "item_data": {
                    "item_id": entry.item_data.item,
                    "item_name": entry.item_data.item_name,
                    "performer": entry.item_data.performer,
                    "type": entry.item_data.type,
                    "release_date": entry.item_data.release_date
                }
            })

        if entry.interaction_data:
            response_data.update({
                "interaction_data": {
                    "user_id": entry.interaction_data.user,
                    "item_id": entry.interaction_data.item,
                    "rating": entry.interaction_data.rating,
                    "interaction_list": entry.interaction_data.interaction
                }
            })
    result = db.data_processing(response_data)
    if result['status'] != 200:
        return result

    result = DataProcessing(response_data).process_data()
    return result


@app.get("/download-json/{id}")
async def download_json(id: UUID):
    base_path = f"{file['storage_path']}/{id}"

    node_file_path = os.path.join(base_path, "node.json")
    edge_file_path = os.path.join(base_path, "edge.json")
    if not (os.path.exists(node_file_path) and os.path.exists(edge_file_path)):
        raise HTTPException(status_code=404, detail="One or both JSON files not found")

    zip_path = os.path.join(base_path, "node_edge_files.zip")
    try:
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            zipf.write(node_file_path, arcname=f"node.json")
            zipf.write(edge_file_path, arcname=f"edge.json")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create ZIP file")
        
    return FileResponse(zip_path, filename="node_edge_files.zip", media_type="application/zip")

@app.get("/sample_data")
async def process_data(id: UUID, number_of_users: int, number_of_user2item_interaction: int, type_name: str):
    N = number_of_users
    M = number_of_user2item_interaction
    try:
        sample_data = DataSampling(N, M, id, type_name)
        return sample_data.get_data()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@app.get("/get_id_list")
async def process_data():
    db = DATABASE()

    try:
        result = db.get_id_list()
        for item in result:
            id = item['id']
            folder_path = Path(f"{file['storage_path']}/{id}")
            node_file = folder_path / "node.json"
            edge_file = folder_path / "edge.json"
            
            if folder_path.exists() and node_file.exists() and edge_file.exists():
                item.update({"has_files": True})
            else:
                item.update({"has_files": False})
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@app.delete("/delete-data/{id}")
async def delete_data(id: UUID):
    db = DATABASE()
    try:
        db.delete_data(id)
        folder_path = Path(f"{file['storage_path']}/{id}")
        if folder_path.exists() and folder_path.is_dir():
            shutil.rmtree(folder_path)
            return {"message": f"Data with ID {id} and folder {folder_path} successfully deleted."}
        else:
            return {"message": f"Data with ID {id} deleted. No folder found at {folder_path}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while deleting data: {str(e)}")
    
