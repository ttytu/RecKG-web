## RecKG Web

RecKG Web lets you create, integrate and visualize recommendation datasets in KG format.

![image](https://github.com/user-attachments/assets/77a650fa-c4ab-44b9-9b2f-e8faa64ba45f)

Published in SoftwareX "[RecKG-Web: A web-based interactive visualization tool for standardized knowledge graphs in recommender systems](https://www.sciencedirect.com/science/article/pii/S2352711025002857?via%3Dihub)."

Web implementation of the paper "[RecKG: Knowledge Graph for Recommender Systems](https://dl.acm.org/doi/10.1145/3605098.3636009)". For more information about RecKG, visit [the official RecKG Repository](https://github.com/tree-jhk/RecKG). You can download RecKG paper from [arxiv](https://arxiv.org/abs/2501.03598).

## RecKG Web Functionalities

### 1. Upload

- Users can upload recommendation datasets as separate CSV files for user data, item data, and interaction data.
  - Each file’s header should represent the attribute names to be converted into the RecKG format.
  - Example item data headers (MovieLens):
    - `movie_id`
    - `movie_title`
    - `release_date`
    - `video_release_date`
    - `imdb_url`
    - `genre_list`

### 2. Map

- Map attributes from the uploaded files to match the RecKG format.
  - Example item data mapping:
    - `movie_id` → `item`
    - `movie_title` → `item_name`
    - `video_release_date` → `release_date`
    - `type` → `genre_list`
- After mapping, convert the dataset into the RecKG format.

#### RecKG Data Format

```json
{
  "item_data": {
    "item": "string",
    "item_name": "string",
    "performer": "string",
    "type": "string",
    "release_date": "string"
  },
  "user_data": {
    "user": "string",
    "age": "string",
    "gender": "string",
    "occupation": "string",
    "residence": "string"
  },
  "interaction_data": {
    "user": "string",
    "item": "string",
    "rating": "string",
    "interaction": [
      "string"
    ]
  }
}
```

### 3. Integrate, Visualize & Download KG

- Integrate Two KGs
  - Functionality to merge two datasets in the RecKG format.

- Graph Visualization of Sample Data
  - Visualize the transformed dataset using D3.js.
  - Users can choose between a user-based or item-based view.
  - Options to set:
    - Initial number of nodes
    - Maximum number of interactions

- Download Processed RecKG Data
  - Provides an option to download the dataset in RecKG format after processing.

## Video Example 

https://github.com/user-attachments/assets/355014dd-0d85-4d00-afab-752e8b752f25
