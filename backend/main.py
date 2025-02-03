import os
import zipfile
import shutil

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import List, Optional, Union
from pydantic import BaseModel
from uuid import UUID
from yaml import full_load
from pathlib import Path
from db import DATABASE
from data_processing import *
from data_sampling import *
from data_integration import *

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

class InteractionFileEntry(BaseModel):
    user: Union[str, bool]
    item: Union[str, bool]
    rating: Union[str, bool]
    interaction: Union[List[str], bool, None]

@app.post("/uploadfiles")
async def create_upload_file(
    dataset_name: str,
    user_file: Optional[UploadFile] = File(None),
    item_file: UploadFile = File(None),
    interaction_file: Optional[UploadFile] = File(None)
):
    try:
        user_file_content = None if user_file is None else await user_file.read()
        interaction_file_content = None if interaction_file is None else await interaction_file.read()
        item_file_content = await item_file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading files: {str(e)}")

    try:
        with DATABASE() as db:
            columns_list = db.put_data(
                dataset_name=dataset_name,
                user_file=user_file_content,
                item_file=item_file_content,
                interaction_file=interaction_file_content
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing files: {str(e)}")

    return columns_list

@app.post("/process-data")
async def process_data(id: UUID, 
                       item_data: ItemFileEntry, 
                       user_data: Optional[UserFileEntry] = None, 
                       interaction_data: Optional[InteractionFileEntry] = None
):

    response_data = {}
    try:
        response_data["id"] = id

        response_data["item_data"] = {
            "item_id": item_data.item,
            "item_name": item_data.item_name,
            "performer": item_data.performer,
            "type": item_data.type,
            "release_date": item_data.release_date
        }

        if user_data:
            response_data["user_data"] = {
                "user_id": user_data.user,
                "age": user_data.age,
                "gender": user_data.gender,
                "occupation": user_data.occupation,
                "residence": user_data.residence
            }
        else:
            response_data["user_data"] = None

        
        if interaction_data:
            response_data["interaction_data"] = {
                "user_id": interaction_data.user,
                "item_id": interaction_data.item,
                "rating": interaction_data.rating,
                "interaction_list": interaction_data.interaction
            }
        else:
            response_data["interaction_data"] = None
        
        with DATABASE() as db:
            result = db.data_processing(response_data)
        
        if result['status'] != 200:
            return result
            

        data_processor = DataProcessing(response_data)
        result = data_processor.process_data()
        
        if result['status'] != 200:
            raise HTTPException(status_code=500, detail="Error in final data processing")
        
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")        
        
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

@app.get("/sample-data")
async def process_data(id: UUID, base: str, number_of_bases: int, number_of_interactions: int):
    
    N = number_of_bases
    M = number_of_interactions
    try:
        sample_data = DataSampling(base, N, M, id)
        return sample_data.get_data()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@app.get("/get-id-list")
async def process_data():
    
    try:
        with DATABASE() as db:
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
    
    try:
        with DATABASE() as db:
            db.delete_data(id)
        folder_path = Path(f"{file['storage_path']}/{id}")
        if folder_path.exists() and folder_path.is_dir():
            shutil.rmtree(folder_path)
            return {"message": f"Data with ID {id} and folder {folder_path} successfully deleted."}
        else:
            return {"message": f"Data with ID {id} deleted. No folder found at {folder_path}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while deleting data: {str(e)}")
    


@app.post("/integrate-KG")
async def integrate_KG(base_kg_id: UUID,
                       added_kg_id: UUID
):
    data_integration = DataIntegration()
    try:
        with DATABASE() as db:
            base_kg_columns = db.get_item_columns(base_kg_id)[0][1:]
            meta_base_columns, meta_base_title = data_integration.get_columns(base_kg_columns, existed=False)

            added_kg_columns = db.get_item_columns(added_kg_id)[0][1:]
            meta_added_columns, meta_added_title = data_integration.get_columns(added_kg_columns, existed=True)
            if not (meta_base_columns and meta_added_columns):
                raise HTTPException(status_code=400, detail="KG 통합 불가")
            
            integration_meta_columns = set(meta_added_columns.keys()) & set(meta_base_columns.keys())

            if len(integration_meta_columns) == 0:
                raise HTTPException(status_code=400, detail="KG 통합 불가")


            base_file_name = db.get_file_name(base_kg_id)
            added_file_name = db.get_file_name(added_kg_id)

            integration_meta_columns = {key: meta_added_columns[key] for key in meta_added_columns if key in integration_meta_columns}

            new_item_data = data_integration.integration_data(integration_meta_columns, base_kg_id, added_kg_id, meta_base_title, meta_added_title)
            
            result = db.put_data_integrate(new_item_data, base_kg_id, integration_meta_columns, f"integrated {base_file_name}-KG by {added_file_name}-KG")
            if result['status'] != 200:
                return result
            
            data = db.get_mapping_data(result['id'])
            
            data_processor = DataProcessing(data)
            result = data_processor.process_data()
            result['added_columns'] = integration_meta_columns
            return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in KG integration: {str(e)}")
