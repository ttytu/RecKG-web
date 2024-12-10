import pandas as pd
import numpy as np
import json
import math
import os

from copy import deepcopy
from yaml import full_load
from ast import literal_eval
from db import DATABASE
from uuid import uuid4

with open('config.yml') as f:
    config = full_load(f)
ITEM_COLUMNS = ['item', 'performer', 'type', 'release_date', 'item_name']
class DataIntegration:
    def __init__(self):
        self.DATA_PATH = config['storage_path']
        
    def get_columns(self, columns, existed = True):
        meta_columns = {}
        if not columns[-1]:
            return False
        for meta_col, col in zip(ITEM_COLUMNS, columns):
            if (existed and col is not None) or (not existed and col is None):
                meta_columns[meta_col] = col
    
        return meta_columns, columns[-1]

    def integration_data(self, integrate_meta_columns, base_id, added_id, base_title, added_title):

        base_df = pd.read_csv(f"{self.DATA_PATH}/{base_id}/item_file.csv")
        added_df = pd.read_csv(f"{self.DATA_PATH}/{added_id}/item_file.csv")
        
        for meta_col in integrate_meta_columns.keys():
            real_col = integrate_meta_columns[meta_col]
            merged_df = pd.merge(base_df, added_df[[added_title, real_col]], left_on=base_title, right_on=added_title, how='left')
            merged_df.drop(columns=[added_title], inplace=True)
            base_df = merged_df
        
        return base_df
        

        
        
            
