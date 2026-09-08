import os, requests
from dotenv import load_dotenv

load_dotenv()
TOUR_API_KEY = os.getenv("TOUR_API_KEY")

def get_sigungu_code(area_code="38"):
    url = "https://apis.data.go.kr/B551011/KorService2/areaCode2"
    params = {
        "serviceKey": TOUR_API_KEY, "areaCode": area_code,
        "numOfRows": 50, "pageNo": 1, "MobileOS": "ETC",
        "MobileApp": "SoloTrip", "_type": "json"
    }
    res = requests.get(url, params=params)
    print(res.url)
    return res.json()

def get_yeosu_tour_list(page_no=1, num_of_rows=50, content_type_id=None):
    url = "https://apis.data.go.kr/B551011/KorService2/areaBasedList2"
    params = {
        "serviceKey": TOUR_API_KEY,
        "areaCode": "38",       # 전남
        "sigunguCode": "13",    # 여수시
        "numOfRows": num_of_rows,
        "pageNo": page_no,
        "MobileOS": "ETC",
        "MobileApp": "SoloTrip",
        "_type": "json",
        "arrange": "A"          # A=제목순, C=수정일순, D=생성일순, O=대표이미지 있는것 우선
    }
    if content_type_id:
        params["contentTypeId"] = content_type_id  # 12=관광지, 14=문화시설, 39=음식점 등

    res = requests.get(url, params=params)
    return res.json()


def get_detail_images(content_id, content_type_id=None):
    """
    firstimage가 없는 관광지/음식점을 위한 대체 이미지 조회 (detailImage2).
    같은 KorService2 안의 API라 별도 승인/키 필요 없음.
    """
    url = "https://apis.data.go.kr/B551011/KorService2/detailImage2"
    params = {
        "serviceKey": TOUR_API_KEY,
        "contentId": content_id,
        "imageYN": "Y",
        "numOfRows": 5,
        "pageNo": 1,
        "MobileOS": "ETC",
        "MobileApp": "SoloTrip",
        "_type": "json",
    }
    res = requests.get(url, params=params)
    data = res.json()

    header = data.get("response", {}).get("header", {})
    if header.get("resultCode") != "0000":
        print(f"  [detailImage2 실패] contentId={content_id} - {header.get('resultMsg')}")
        return None

    items = data["response"]["body"]["items"]
    if not items:
        return None

    item = items["item"]
    if isinstance(item, list):
        item = item[0]
    return item.get("originimgurl") or item.get("smallimageurl")


def attach_representative_image(tour_item):
    """
    1) firstimage 있으면 그대로 사용
    2) 없으면 detailImage2로 상세이미지 조회해 대체
    3) 그래도 없으면 None (프론트에서 placeholder 처리)
    """
    image = tour_item.get("firstimage") or None
    source = "tourapi" if image else None

    if not image:
        fallback = get_detail_images(tour_item["contentid"])
        if fallback:
            image = fallback
            source = "detailImage2"

    return image, source


if __name__ == "__main__":
    result = get_yeosu_tour_list(content_type_id=39)  # 음식점만
    items = result["response"]["body"]["items"].get("item", [])
    print(f"총 {len(items)}개 조회됨")

    empty_count = sum(1 for i in items if not i.get("firstimage"))
    print(f"이미지 없는 항목: {empty_count}/{len(items)}\n")

    # 이미지 없는 항목만 detailImage2 폴백 테스트 (전체 호출량 아끼기 위해 최대 5개만)
    no_image_items = [i for i in items if not i.get("firstimage")][:5]

    for item in no_image_items:
        image, source = attach_representative_image(item)
        print(item["title"], "-> 이미지:", image or "(끝내 없음)", f"[{source}]" if source else "")