# travel-tour-map

## 시작하기

### 저장소 클론
```bash
git clone <repo-url>
cd project-root-folder
```


### 데이터 수집 스크립트 실행 (Python)
```bash
cd scripts
python -m venv venv

# 가상환경 활성화
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt
cp .env.example .env            # 발급받은 키 채워넣기
```

작업이 끝나면 반드시 `venv 비활성화(deactivate)` 후 커밋. `venv/` 폴더 자체는 `.gitignore`에 포함되어 있어 커밋되지 않음.

## 환경변수 관리

API 키는 **절대 git에 커밋 금지** .env에 발급받은 키를 넣어 로컬에서만 사용.


## Git 브랜치 전략

```
main                         # 항상 배포 가능한 상태 유지
├── data/gangwon             # 선유: 강원도 데이터 작업
├── data/yeosu               # 수빈: 여수시 데이터 작업
├── data/merge-curation      # 공동: 원본 데이터 병합 및 큐레이션 (위 둘 완료 후 시작)
├── feature/map-filter       # 기능 단위 브랜치 (예: 지도 필터링)
└── feature/stamp-tour       # 기능 단위 브랜치 (예: 스탬프 투어)
```

- `main`에는 **직접 push 금지**. 반드시 PR을 통해 머지
- 브랜치명 규칙: `data/`, `feature/`, `fix/`, `docs/` + 짧은 설명 (kebab-case)
- 작업 시작 전 항상 `main`을 최신으로 pull 받은 뒤 브랜치 생성

## 커밋 메시지 규칙

```
[타입] 짧은 설명

예시:
[data] 카카오맵 강릉시 업소 500건 수집
[feat] 지도 필터 UI 추가 (성별·연령·스타일)
[fix] 스탬프 카운트 중복 적립 버그 수정
[docs] README 협업 가이드 추가
```

타입: `data`, `feat`, `fix`, `docs`, `refactor`, `chore`

## PR(Pull Request) 규칙

1. PR 제목은 커밋 메시지 규칙과 동일하게 작성
2. 본문에 **무엇을 했는지 3줄 이내로 요약**
3. 데이터 수집/병합 PR은 **수집 건수, 결측치 여부**를 반드시 명시
   ```
   - 카카오맵 API로 강원도 18개 시군 업소 1,240건 수집
   - 결측치: 전화번호 12건 누락 (추후 수동 보완 예정)
   ```
4. 리뷰 없이 셀프 머지 금지 (팀원 1명 이상 확인 후 머지)

## 데이터 병합 규칙 (중복 방지)

두 사람이 각자 수집한 데이터를 합칠 때는 반드시 **스테이징 테이블**을 거칠 것.

```
gangwon_raw / yeosu_raw (원본 그대로 저장)
        ↓
merge_curation.py (이름·좌표 기준 중복 탐지)
        ↓
venues (최종 테이블)
```

- 원본 API 응답은 `raw_json` 컬럼에 그대로 보관 (나중에 필드 추가 시 재수집 불필요)
