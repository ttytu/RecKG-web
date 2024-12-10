## RecKG Web
![image](https://github.com/user-attachments/assets/77a650fa-c4ab-44b9-9b2f-e8faa64ba45f)

Web implementation of the paper "[RecKG: Knowledge Graph for Recommender Systems](https://dl.acm.org/doi/10.1145/3605098.3636009)".  
For more information about RecKG, visit [the official RecKG Repository](https://github.com/tree-jhk/RecKG).

## RecKG Web Functionalities 

### 1. Upload

- 사용자가 추천 데이터셋을 사용자 정보/아이템 정보/인터랙션 정보 각각의 CSV 파일로 업로드
	- 각 파일의 헤더는 RecKG 형식으로 변환하고자 하는 애트리뷰트 명
	- 예시 아이템 정보 헤더 (MovieLens)
		- movie_id
		- movie_title 
		- release_date 
		- video_release_date 
		- imdb_url 
		- genre_list 

### 2. Map

- RecKG 형식에 맞춰 각각 파일 데이터 애트리뷰트 매핑
	- 예시 아이템 정보 매핑 
		- movie_id -> item
		- movie_title -> item_name 
		- video_release_date -> release_date 
		- type -> genre_list 
- 매핑 후 데이터 RecKG 형식으로 변환 

#### RecKG 데이터 형식 

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

### 3. Visualization & Download 

- 두개의 KG 통합 
	- RecKG 형식의 두 데이터셋 통합 기능
- 데이터 샘플하여 그래프 시각화 
	- RecKG 형식으로 변환된 데이터셋 D3JS 기반 그래프 시각화 
		- 유저 혹은 아이템 기반 선택
		- 초기 노드 수 설정
		- 최대 인터랙션 수 설정 
- RecKG 형식으로 프로세스 된 데이터셋 다운로드 기능
