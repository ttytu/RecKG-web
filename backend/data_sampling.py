import random
import json
import os
from easydict import EasyDict as edict
from yaml import full_load, YAMLError
from fastapi import HTTPException

try:
    with open('config.yml') as f:
        config = full_load(f)
except FileNotFoundError:
    raise HTTPException(status_code=500, detail="Error: 'config.yml' file not found.")
except YAMLError:
    raise HTTPException(status_code=500, detail="Error: 'config.yml' file is not properly formatted.")
BASE = {
    'user': 'item',
    'item': 'user'
}
class DataSampling:
    def __init__(self, base, N, M, id):
        self.set_random_seed()
        self.DATA_PATH = f"{config.get('storage_path', '.')}/{id}"
        self.base = base
        self.non_base = BASE[base]
        self.N = N
        self.M = M
        
        self.sampled_edge_data = []
        self.sampled_node_data = []
        
        self.id_set = set()

        try:    
            if not self.existed_file_check():
                self.load_and_index_json()
                self.sampling()
                if len(self.sampled_node_data) > 0:
                    self.save_json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Initialization error: {e}")

    def existed_file_check(self):
        try:
            with open(f'{self.DATA_PATH}/sampled_{self.base}_{self.N}_{self.M}_node.json', 'r', encoding='utf-8') as f:
                self.sampled_node_data = json.load(f)
            with open(f'{self.DATA_PATH}/sampled_{self.base}_{self.N}_{self.M}_edge.json', 'r', encoding='utf-8') as f:
                self.sampled_edge_data = json.load(f)
            return True

        except FileNotFoundError:
            self.sampled_edge_data = []
            self.sampled_node_data = []
            return False
        except json.JSONDecodeError:
            self.sampled_edge_data = []
            self.sampled_node_data = []
            return False

    def set_random_seed(self):
        random.seed(42)

    def get_data(self):
        return {
            "node_count": len(self.sampled_node_data),
            "edge_count": len(self.sampled_edge_data),
            "sampled_node_data": self.sampled_node_data,
            "sampled_edge_data": self.sampled_edge_data
        }
    def save_json(self):
        try:
            with open(f'{self.DATA_PATH}/sampled_{self.base}_{self.N}_{self.M}_node.json', 'w', encoding='utf-8') as f:
                json.dump(self.sampled_node_data, f, ensure_ascii=False, indent=4)
            with open(f'{self.DATA_PATH}/sampled_{self.base}_{self.N}_{self.M}_edge.json', 'w', encoding='utf-8') as f:
                json.dump(self.sampled_edge_data, f, ensure_ascii=False, indent=4)
            return {"status": 200}
        except Exception as e:
            return {"status": 400, "error": "Couldn't save data file", "details": str(e)}
        
    def load_and_index_json(self):
        try:
            with open(f'{self.DATA_PATH}/node.json', 'r', encoding='utf-8') as f:
                self.node_data = {node['id']: node for node in json.load(f)}
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail=f"Error: 'node.json' file not found in {self.DATA_PATH}.")
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Error: 'node.json' file is not properly formatted.")

        try:
            with open(f'{self.DATA_PATH}/edge.json', 'r', encoding='utf-8') as f:
                self.edge_data = json.load(f)
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail=f"Error: 'edge.json' file not found in {self.DATA_PATH}.")
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Error: 'edge.json' file is not properly formatted.")

    def sampling(self):
        try:
            interaction_dict = edict({item['type']: {} for item in self.node_data.values()})
                        
            for item in self.node_data.values():
                interaction_dict[item['type']][str(item['id'])] = []

            for edge in self.edge_data:
                source = edge['source']['data']
                source_type = edge['source']['type']
                interaction_dict[source_type][source].append(edge)
                
                target = edge['target']['data']
                target_type = edge['target']['type']
                interaction_dict[target_type][target].append(edge)
                

            sampled_list = random.sample(list(interaction_dict[f'{self.base}_id']), min(self.N, len(interaction_dict[f'{self.base}_id'])))

            for id in sampled_list:
                for edge in interaction_dict[f'{self.base}_id'][id]:
                    
                    source = edge['source']['data']
                    source_type = edge['source']['type']
                    
                    target = edge['target']['data']
                    target_type = edge['target']['type']
                    
                    if target_type == f"{self.non_base}_id" or source_type == f"{self.non_base}_id":
                        continue
                    
                    if source not in self.id_set:
                        self.sampled_node_data.append(self.node_data[source])
                        self.id_set.add(source)
                        
                    if target not in self.id_set:
                        self.sampled_node_data.append(self.node_data[target])
                        self.id_set.add(target)

                    self.sampled_edge_data.append(edge)

            ### limit u-i interaction
            for id in sampled_list:
                u_i_interaction_list = [item for item in interaction_dict[f'{self.base}_id'][id] if item['source']['type']=='user_id']
                for edge in random.sample(u_i_interaction_list, min(self.M, len(u_i_interaction_list))):
                    
                    source = edge['source']['data']
                    source_type = edge['source']['type']

                    target = edge['target']['data']
                    target_type = edge['target']['type']

                    if source not in self.id_set:
                        self.sampled_node_data.append(self.node_data[source])
                        self.id_set.add(source)
                        self.get_sampled_node_list(source, interaction_dict, source_type)

                    if target not in self.id_set:
                        self.sampled_node_data.append(self.node_data[target])
                        self.id_set.add(target)
                        self.get_sampled_node_list(target, interaction_dict, target_type)
                    self.sampled_edge_data.append(edge)
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Sampling error: {e}")

    def get_sampled_node_list(self, id, interaction_dict, node_type):
        for edge in interaction_dict[node_type][id]:
            source_type = edge['source']['type']
            target_type = edge['target']['type']
            if source_type == 'user_id' and target_type == 'item_id':
                continue
            target = edge['target']['data']
            
            if target not in self.id_set:
                self.sampled_node_data.append(self.node_data[target])
                self.id_set.add(target)
            self.sampled_edge_data.append(edge)
