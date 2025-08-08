import pandas as pd
import numpy as np
import re
from tqdm import tqdm
from yaml import full_load
from rapidfuzz import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


with open('config.yml') as f:
    config = full_load(f)
ITEM_COLUMNS = ['item', 'performer', 'type', 'release_date', 'item_name']



class DataIntegration:
    def __init__(self):
        self.DATA_PATH = config['storage_path']


    def set_params(
        self, df_base: pd.DataFrame, df_add: pd.DataFrame,
        base_first_col: str, add_first_col: str, 
        base_second_col: str = None, base_has_year_in_first_col: bool = False,
        add_second_col: str = None, add_has_year_in_first_col: bool = False,
    ):
        self.df_base = df_base
        self.df_add = df_add
        
        self.base_first_col = base_first_col
        self.base_second_col = base_second_col
        self.base_has_year_in_first_col = base_has_year_in_first_col
        
        self.add_first_col = add_first_col
        self.add_second_col = add_second_col
        self.add_has_year_in_first_col = add_has_year_in_first_col
        
        self._matches = None

        
    def get_columns(self, columns, existed = True):
        meta_columns = {}
        if not columns[-1]:
            return False
        for meta_col, col in zip(ITEM_COLUMNS, columns):
            if (existed and col is not None) or (not existed and col is None):
                meta_columns[meta_col] = col
    
        return meta_columns, columns[-1]
    def extract_year_from_title(self, title: str) -> int:
        match = re.search(r"\((\d{4})\)", title)
        return int(match.group(1)) if match else None

    def normalize_title_with_year_dict(self, df: pd.DataFrame, 
                                       first_col: str, second_col: str, 
                                       has_year_in_first_col: bool) -> dict:
        result = {}

        if has_year_in_first_col or second_col == 'release_date':
            for _, row in df.iterrows():
                raw = str(row[first_col]).lower().strip()
                if has_year_in_first_col:
                    year = self.extract_year_from_title(raw)
                else:
                    val = row.get(second_col)
                    if pd.notnull(val):
                        try:
                            year = str(val)
                        except (ValueError, TypeError):
                            year = None
                    else:
                        year = self.extract_year_from_title(raw)
                clean = re.sub(r"\s*\(\d{4}\)", "", raw).strip()
                if year:
                    result.setdefault(clean, []).append((raw, year))
        else:
            for _, row in df.iterrows():
                raw = str(row[first_col]).lower().strip()
                val = row.get(second_col)
                second_val = None
                second_val = str(val) if pd.notnull(val) else None
                if second_val:
                    result.setdefault(raw, []).append((raw, second_val))
        return result
    
    def _match_by_release_date(self, base_map: dict, add_map: dict) -> list:
        matches = []
        common_keys = set(base_map) & set(add_map)

        for key in tqdm(common_keys, desc="Matching keys", unit="key"):
            for raw1, y1 in base_map[key]:
                for raw2, y2 in add_map[key]:
                    if y1 != y2:
                        continue
                    if fuzz.partial_ratio(raw1, raw2) < 0.95:
                        continue
                    matches.append((raw1, raw2))
        return matches
    
    def _match_generic(self) -> list:
        base_titles = self.df_base[self.base_first_col].astype(str).str.lower().str.strip().tolist()
        add_titles = self.df_add[self.add_first_col].astype(str).str.lower().str.strip().tolist()

        vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 3), dtype=np.float32)
        tfidf = vectorizer.fit_transform(base_titles + add_titles)
        
        base_vecs = tfidf[:len(base_titles)]
        add_vecs = tfidf[len(base_titles):]

        matches = []
        for i, vec in enumerate(tqdm(base_vecs, total=len(base_titles), desc="Matching (TF-IDF+Fuzzy)")):
            sims = cosine_similarity(vec, add_vecs)[0]
            top_idx = sims.argsort()[-5:]
            for j in top_idx:
                if fuzz.partial_ratio(base_titles[i], add_titles[j]) >= 95:
                    matches.append((base_titles[i], add_titles[j]))
        return matches


    def get_matched_titles(self) -> list:
        if (self.base_second_col == None) & (self.add_second_col == None):
            matches = self._match_generic()
            
        else:
            base_map = self.normalize_title_with_year_dict(self.df_base, first_col=self.base_first_col, second_col=self.base_second_col, has_year_in_first_col=self.base_has_year_in_first_col)
            add_map  = self.normalize_title_with_year_dict(self.df_add, first_col=self.add_first_col, second_col=self.add_second_col, has_year_in_first_col=self.add_has_year_in_first_col)
            matches = self._match_by_release_date(base_map, add_map)
        
        self._matches = matches

        return matches
    
    def integrate_data(self, integrate_meta_columns: dict) -> pd.DataFrame:
        if self._matches is None:
            self.get_matched_titles()

        base_df = self.df_base.copy()
        add_df  = self.df_add.copy()

        norm_base = f"_{self.base_first_col}_norm"
        norm_add  = f"_{self.add_first_col}_norm"

        base_df[norm_base] = base_df[self.base_first_col].str.lower().str.strip()
        add_df[norm_add]   = add_df[self.add_first_col].str.lower().str.strip()

        mapping_norm = {
            raw1.lower().strip(): raw2.lower().strip()
            for raw1, raw2 in self._matches
        }

        for new_col, real_col in integrate_meta_columns.items():
            add_meta_map = add_df.set_index(norm_add)[real_col].to_dict()
            base_df[real_col] = (
                base_df[norm_base]
                .map(mapping_norm)
                .map(add_meta_map)
            )

        base_df.drop(columns=[norm_base], inplace=True)

        return base_df
