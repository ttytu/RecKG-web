import random
import json
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

class DataSampling:
    def __init__(self, base, N, M, id):
        self.set_random_seed()
        self.DATA_PATH = f"{config.get('storage_path', '.')}/{id}"
        self.base = base
        self.N = N
        self.M = M

        self.USER_COLUMNS = ['user_id', 'age', 'gender', 'occupation', 'residence']
        self.ITEM_COLUMNS = ['item_id', 'performer', 'type', 'release_date']
        self.INTERACTION_COLUMNS = ['user_id', 'item_id', 'rating', 'interaction_list']
        
        self.sampled_edge_data = []
        self.sampled_node_data = []
        
        self.id_set = set()

        try:    
            self.load_and_index_json()
            self.sampling()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Initialization error: {e}")

    def set_random_seed(self):
        random.seed(42)

    def get_data(self):
        return {
            "node_count": len(self.sampled_node_data),
            "edge_count": len(self.sampled_edge_data),
            "sampled_node_data": self.sampled_node_data,
            "sampled_edge_data": self.sampled_edge_data
        }

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
                interaction_dict[item['type']][item['id']] = []

            for edge in self.edge_data:
                source = edge['source']['data']
                for key in interaction_dict:
                    if source in interaction_dict[key]:
                        interaction_dict[key][source].append(edge)

            M_interaction = {
                id: interactions
                for id, interactions in interaction_dict[f'{self.base}_id'].items()
                if len(interactions) == self.M
            }

            sampled_list = random.sample(list(M_interaction.keys()), min(self.N, len(M_interaction)))
            
            for id in sampled_list:
                self.get_sampled_node_list(interaction_dict=interaction_dict, id=id, type_info=f'{self.base}_id')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Sampling error: {e}")

    def get_sampled_node_list(self, interaction_dict, id, type_info):
        try:
            if id not in self.id_set:
                source_node = self.node_data.get(id)
                if source_node:
                    self.sampled_node_data.append(source_node)
                    self.id_set.add(id)

                for edge in interaction_dict[type_info].get(id, []):
                    if edge not in self.sampled_edge_data:
                        self.sampled_edge_data.append(edge)
                    target_id = edge['target']['data']
                    if target_id not in self.id_set:
                        self.get_sampled_node_list(interaction_dict, target_id, self.node_data[target_id]['type'])
        except KeyError as e:
            raise HTTPException(status_code=400, detail=f"KeyError: {e} not found in node data or interaction dictionary.")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error in get_sampled_node_list: {e}")
