import pandas as pd
import numpy as np
import json
import math
import os

from copy import deepcopy
from yaml import full_load
from ast import literal_eval

with open('config.yml') as f:
    config = full_load(f)

RELATION = {
    "user": {"age": "agels", "gender": "genderIs", "occupation": "workAs", "residence": "residingAt"},
    "item": {"performer": "performedBy", "type": "typeOf", "release_date": "releasedIn"},
    "interaction": {"rating": "rated"}
}


class DataProcessing:
    def __init__(self, mapping_data):
        self.mapping_data = mapping_data
        self.DATA_PATH = f"{config['storage_path']}/{mapping_data['id']}"
        self.ITEM_COLUMNS = list(mapping_data['item_data'].keys())
        self.USER_COLUMNS = list(mapping_data['user_data'].keys()) if 'user_data' in mapping_data else []
        self.INTERACTION_COLUMNS = list(mapping_data['interaction_data'].keys()) if 'interaction_data' in mapping_data else []
        self.node_data = []
        self.edge_data = []


    def process_data(self):
        result = self.load_data()
        if result['status'] != 200:
            return result

        result = self.node_data_processing()
        if result['status'] != 200:
            return result
        
        result = self.edge_data_processing()
        if result['status'] != 200:
            return result

        result = self.save_json()
        if result['status'] != 200:
            return result
        
        return result

    def load_data(self):
        try:
            self.item_file = pd.read_csv(f"{self.DATA_PATH}/item_file.csv")
            self.user_file = pd.read_csv(f"{self.DATA_PATH}/user_file.csv") if os.path.exists(f"{self.DATA_PATH}/user_file.csv") else None
            self.interaction_file = pd.read_csv(f"{self.DATA_PATH}/interaction_file.csv") if os.path.exists(f"{self.DATA_PATH}/interaction_file.csv") else None
        except Exception as e:
            return {"status": 400, "error": "Couldn't load data file", "details": str(e)}
        
        return {"status": 200}
            

    def save_json(self):
        try:
            with open(f'{self.DATA_PATH}/node.json', 'w', encoding='utf-8') as f:
                json.dump(self.node_data, f, ensure_ascii=False, indent=4)
            with open(f'{self.DATA_PATH}/edge.json', 'w', encoding='utf-8') as f:
                json.dump(self.edge_data, f, ensure_ascii=False, indent=4)
            return {"status": 200}
        except Exception as e:
            return {"status": 400, "error": "Couldn't save data file", "details": str(e)}
        
    def node_data_processing(self):
        unique_nodes = set()
        
        try:
            ### item
            has_item_name = self.mapping_data['item_data'].get('item_name')
            for column in self.ITEM_COLUMNS:
                col_data = self.mapping_data['item_data'].get(column)
                if col_data and column != 'item_name':
                    if column == 'item_id' and has_item_name:
                        ITEM_NAME_COLUMN = self.mapping_data['item_data']['item_name']
                        for idx, item in enumerate(self.item_file[col_data].dropna()):
                            items = [item] if not (isinstance(item, str) and item.startswith('[')) else literal_eval(item)
                            for item in items:
                                if isinstance(self.item_file[ITEM_NAME_COLUMN][idx], float) and math.isnan(self.item_file[ITEM_NAME_COLUMN][idx]):
                                    self.item_file[ITEM_NAME_COLUMN][idx] = "None"
                                if isinstance(item, float) and math.isnan(item):
                                    item = "None"
                                data = {"id": str(item), "type": column, "data": {"item_name": self.item_file[ITEM_NAME_COLUMN][idx]}}
                                if (data["id"], data["type"]) not in unique_nodes:
                                    self.node_data.append(data)
                                    unique_nodes.add((data["id"], data["type"]))
                    else:
                        for item in self.item_file[col_data].dropna():
                            items = [item] if not (isinstance(item, str) and item.startswith('[')) else literal_eval(item)
                            for item in items:
                                if isinstance(item, float) and math.isnan(item):
                                    item = "None"
                                data = {"id": str(item), "type": column}
                                if (data["id"], data["type"]) not in unique_nodes:
                                    self.node_data.append(data)
                                    unique_nodes.add((data["id"], data["type"]))
            
            ### user
            if 'user_data' in self.mapping_data:
                for column in self.USER_COLUMNS:
                    col_data = self.mapping_data['user_data'].get(column)
                    if col_data:
                        for item in self.user_file[col_data].dropna():
                            if isinstance(item, float) and math.isnan(item):
                                item = "None"
                            data = {"id": str(item), "type": column}
                            if (data["id"], data["type"]) not in unique_nodes:
                                self.node_data.append(data)
                                unique_nodes.add((data["id"], data["type"]))

            ### interaction
            if 'interaction_data' in self.mapping_data:
                if self.mapping_data['interaction_data']['interaction_list']:
                    for column in self.mapping_data['interaction_data']['interaction_list']:
                        for item in self.interaction_file[column].dropna():
                            if isinstance(item, float) and math.isnan(item):
                                item = "None"
                            data = {"id": str(item), "type": column}
                            if (data["id"], data["type"]) not in unique_nodes:
                                self.node_data.append(data)
                                unique_nodes.add((data["id"], data["type"]))
            
            return {"status": 200}
        except Exception as e:
            return {"status": 400, "error": "Node data processing error", "details": str(e)}

    def edge_data_processing(self):
        try:
            ### item
            for column in self.ITEM_COLUMNS[1:]:
                col_data = self.mapping_data['item_data'].get(column)
                if col_data and (column != 'item_name'):
                    for idx, item in enumerate(self.item_file[col_data].dropna()):
                        items = [item] if not (isinstance(item, str) and item.startswith('[')) else literal_eval(item)
                        source = self.item_file[self.mapping_data['item_data']['item_id']][idx]
                        for target in items:
                            data = {"id": f"{source}_{target}", "source": {"type": "item_id", "data": str(source)}, "target": {"type": column, "data": str(target)}, "data": {"relation": str(RELATION['item'][column])}}
                            self.edge_data.append(data)
            
            ### user
            if 'user_data' in self.mapping_data:
                for column in self.USER_COLUMNS[1:]:
                    col_data = self.mapping_data['user_data'].get(column)
                    if col_data:
                        for idx, item in enumerate(self.user_file[col_data].dropna()):
                            items = [item] if not (isinstance(item, str) and item.startswith('[')) else literal_eval(item)
                            source = self.user_file[self.mapping_data['user_data']['user_id']][idx]
                            for target in items:
                                data = {"id": f"{source}_{target}", "source": {"type": 'user_id', "data": str(source)}, "target": {"type": column, "data": str(target)}, "data": {"relation": str(RELATION['user'][column])}}
                                self.edge_data.append(data)
            
            ### interaction
            if 'interaction_data' in self.mapping_data:
                if self.mapping_data['interaction_data']['rating']:
                    for user_id, item_id, rating in zip(
                            self.interaction_file[self.mapping_data['interaction_data']['user_id']],
                            self.interaction_file[self.mapping_data['interaction_data']['item_id']],
                            self.interaction_file[self.mapping_data['interaction_data']['rating']]):
                        data = {"id": f"{user_id}_{item_id}", "source": {"type": "user_id", "data": str(user_id)}, "target": {"type": "item_id", "data": str(item_id)}, "data": {"rating": str(rating)}}
                        self.edge_data.append(data)
            return {"status": 200}
        except Exception as e:
            return {"status": 400, "error": "Edge data processing error", "details": str(e)}
