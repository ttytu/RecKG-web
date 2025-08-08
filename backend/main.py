import os
import zipfile
import shutil
import traceback, uuid, logging


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

logger = logging.getLogger(__name__)


with open('config.yml') as f:
    file = full_load(f)

app = FastAPI(root_path="/recKG/api")

origins = [
    "http://localhost",
    "https://ukta.inha.ac.kr",
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

def format_traceback(e: Exception, msg: str = "") -> dict:
    tb = traceback.format_exception(type(e), e, e.__traceback__)
    return {
        "error": msg or str(e),
        "type": e.__class__.__name__,
        "message": str(e),
        "args": e.args,
        "traceback": tb[-10:]
    }

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
        raise HTTPException(status_code=500, detail=format_traceback(e, "Error reading files"))

    try:
        with DATABASE() as db:
            columns_list = db.put_data(
                dataset_name=dataset_name,
                user_file=user_file_content,
                item_file=item_file_content,
                interaction_file=interaction_file_content
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=format_traceback(e, "Error processing files"))

    return columns_list


@app.post("/process-data")
async def process_data(id: UUID, 
                       item_data: ItemFileEntry, 
                       user_data: Optional[UserFileEntry] = None, 
                       interaction_data: Optional[InteractionFileEntry] = None):
    try:
        logger.info(f"Starting data processing for ID: {id}")

        response_data = {"id": id}

        # Item data
        response_data["item_data"] = {
            "item_id": item_data.item,
            "item_name": item_data.item_name,
            "performer": item_data.performer,
            "type": item_data.type,
            "release_date": item_data.release_date
        }
        logger.info("Item data processed successfully.")

        # User data
        if 'user_data' in response_data:
            response_data["user_data"] = {
                "user_id": user_data.user,
                "age": user_data.age,
                "gender": user_data.gender,
                "occupation": user_data.occupation,
                "residence": user_data.residence
            } if user_data else None
            if user_data:
                logger.info("User data processed successfully.")

        # Interaction data
        if 'interaction_data' in response_data:
            response_data["interaction_data"] = {
                "user_id": interaction_data.user,
                "item_id": interaction_data.item,
                "rating": interaction_data.rating,
                "interaction_list": interaction_data.interaction
            } if interaction_data else None
            if interaction_data:
                logger.info("Interaction data processed successfully.")

        logger.info("Starting database processing...")
        with DATABASE() as db:
            result = db.data_processing(response_data)
        logger.info("Database processing completed.")

        if result['status'] != 200:
            logger.error(f"Database processing failed: {result}")
            return result

        logger.info("Starting final data processing...")
        data_processor = DataProcessing(response_data)
        result = data_processor.process_data()
        logger.info("Final data processing completed.")

        if result['status'] != 200:
            logger.error(
                "Final data processing failed.\n"
                f"Status: {result.get('status')}\n"
                f"Message: {result.get('message')}\n"
                f"Errors: {result.get('errors') if 'errors' in result else 'No detailed errors provided'}"
            )
            raise HTTPException(
                status_code=500,
                detail=format_traceback(
                    Exception(f"Final data processing failed: {result}"),
                    "Error in final data processing"
                )
            )

        logger.info(f"Data processing completed successfully for ID: {id}")
        return result

    except Exception as e:
        logger.exception(f"Unexpected error during data processing for ID: {id}")
        raise HTTPException(status_code=500, detail=format_traceback(e, "Unexpected error during data processing"))



@app.get("/download-json/{id}")
async def download_json(id: UUID):
    try:
        base_path = f"{file['storage_path']}/{id}"
        node_file_path = os.path.join(base_path, "node.json")
        edge_file_path = os.path.join(base_path, "edge.json")
        if not (os.path.exists(node_file_path) and os.path.exists(edge_file_path)):
            raise HTTPException(status_code=404, detail="One or both JSON files not found")

        zip_path = os.path.join(base_path, "node_edge_files.zip")
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            zipf.write(node_file_path, arcname="node.json")
            zipf.write(edge_file_path, arcname="edge.json")

        return FileResponse(zip_path, filename="node_edge_files.zip", media_type="application/zip")

    except Exception as e:
        raise HTTPException(status_code=500, detail=format_traceback(e, "Failed to create or return ZIP file"))


@app.get("/sample-data")
async def process_data(id: UUID, base: str, number_of_bases: int, number_of_interactions: int):
    try:
        sample_data = DataSampling(base, number_of_bases, number_of_interactions, id)
        return sample_data.get_data()
    except Exception as e:
        raise HTTPException(status_code=400, detail=format_traceback(e, "Error generating sample data"))


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
            item["has_files"] = folder_path.exists() and node_file.exists() and edge_file.exists()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=format_traceback(e, "Failed to retrieve ID list"))


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
        raise HTTPException(status_code=500, detail=format_traceback(e, "Error deleting data and folder"))


@app.post("/integrate-KG")
async def integrate_KG(
    base_id: UUID, added_id: UUID,
    base_first_col: str, add_first_col: str, 
    base_first_col_has_year : bool, add_first_col_has_year: bool,
    base_second_col: Optional[str]=None, add_second_col: Optional[str]=None,
):
    try:
        logger.info(f"Loading base dataset: ../storage/{base_id}/item_file.csv")
        base_df = pd.read_csv(f"../storage/{base_id}/item_file.csv")
        logger.info(f"Loading added dataset: ../storage/{added_id}/item_file.csv")
        added_df = pd.read_csv(f"../storage/{added_id}/item_file.csv")

        data_integration = DataIntegration()

        with DATABASE() as db:
            logger.info(f"Fetching file names for base_id={base_id}, added_id={added_id}")
            base_file_name = db.get_file_name(base_id)
            added_file_name = db.get_file_name(added_id)

            logger.info("Fetching base KG columns...")
            base_kg_columns = db.get_item_columns(base_id)[0][1:]
            missing_base_kg_columns, _ = data_integration.get_columns(base_kg_columns, existed=False)
            existing_meta_columns, _ = data_integration.get_columns(base_kg_columns, existed=True)

            logger.info("Fetching added KG columns...")
            added_kg_columns = db.get_item_columns(added_id)[0][1:]
            existing_meta_added_columns, _ = data_integration.get_columns(added_kg_columns, existed=True)

            logger.info("Checking integration meta columns...")
            integration_meta_columns = set(missing_base_kg_columns.keys()) & set(existing_meta_added_columns.keys())
            if not integration_meta_columns:
                logger.error(
                    f"Integration not possible: No common metadata columns found.\n"
                    f"Missing in base: {list(missing_base_kg_columns.keys())}\n"
                    f"Existing in added: {list(existing_meta_added_columns.keys())}"
                )
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "KG 통합 불가",
                        "missing_base_columns": list(missing_base_kg_columns.keys()),
                        "existing_added_columns": list(existing_meta_added_columns.keys())
                    }
                )

            base_meta_first_col = existing_meta_columns[base_first_col]
            add_meta_first_col = existing_meta_added_columns[add_first_col]

            base_meta_second_col = existing_meta_columns.get(base_second_col)
            add_meta_second_col = existing_meta_added_columns.get(add_second_col)

            logger.info("Setting DataIntegration parameters...")
            data_integration.set_params(
                df_base=base_df, df_add=added_df,
                base_first_col=base_meta_first_col, add_first_col=add_meta_first_col,
                base_second_col=base_meta_second_col, add_second_col=add_meta_second_col,
                base_has_year_in_first_col=base_first_col_has_year,
                add_has_year_in_first_col=add_first_col_has_year,
            )

            integration_meta_columns = {
                key: existing_meta_added_columns[key]
                for key in existing_meta_added_columns if key in integration_meta_columns
            }
            logger.info(f"Integration target columns: {integration_meta_columns}")

            logger.info("Integrating data...")
            new_item_data = data_integration.integrate_data(integrate_meta_columns=integration_meta_columns)

            logger.info("Saving integrated data into DB...")
            result = db.put_data_integrate(
                integrated_item_df=new_item_data,
                base_id=base_id,
                integrate_meta_columns=integration_meta_columns,
                dataset_name=f"integrated {base_file_name}-KG by {added_file_name}-KG"
            )
            if result['status'] != 200:
                logger.error(f"Failed to save integrated data: {result}")
                return result

            logger.info("Fetching mapping data for final processing...")
            data = db.get_mapping_data(result['id'])
            data_processor = DataProcessing(data)

            logger.info("Running final data processing...")
            result = data_processor.process_data()
            result['added_columns'] = integration_meta_columns

            logger.info(f"Integration completed successfully. Added columns: {integration_meta_columns}")
            return result

    except HTTPException as he:
        logger.exception("HTTPException occurred during KG integration.")
        raise he

    except Exception as e:
        logger.exception("Unexpected error during KG integration.")
        raise HTTPException(
            status_code=500,
            detail=format_traceback(e, "Unexpected error during KG integration")
        )

    except Exception as e:
        req_id = uuid.uuid4().hex[:8]
        tb = traceback.format_exception(type(e), e, e.__traceback__)
        logger.exception("KG integration failed [%s]", req_id, extra={"traceback": tb})
        raise HTTPException(
            status_code=500,
            detail={
                "request_id": req_id,
                "error": "KG integration failed",
                "type": e.__class__.__name__,
                "message": str(e),
                "args": e.args,
                "traceback": tb[-15:],
            }
        )